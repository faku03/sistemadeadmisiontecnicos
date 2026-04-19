const http = require('http');
const { randomUUID } = require('crypto');
const config = require('./config');
const { query, withTransaction } = require('./db');

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function parseUrl(req) {
  return new URL(req.url, `http://${req.headers.host || 'localhost'}`);
}

function money(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error('Importe invalido');
  }

  return number;
}

async function estadoPorCodigo(client, codigo) {
  const result = await client.query(
    `SELECT id, codigo FROM estados_ticket WHERE codigo = $1 AND is_deleted = FALSE`,
    [codigo]
  );

  if (result.rowCount === 0) {
    throw new Error(`Estado inexistente: ${codigo}`);
  }

  return result.rows[0];
}

async function generarMovimientoCaja(client, uuid) {
  const existente = await client.query(
    `SELECT id FROM movimientos_caja WHERE ticket_uuid = $1`,
    [uuid]
  );

  if (existente.rowCount > 0) {
    return existente.rows[0];
  }

  const ticket = await client.query(
    `
    SELECT
      uuid,
      sucursal_actual_id,
      cliente_id,
      valor_reparacion,
      sena
    FROM tickets
    WHERE uuid = $1
    `,
    [uuid]
  );

  if (ticket.rowCount === 0) {
    throw new Error('Ticket no encontrado');
  }

  const row = ticket.rows[0];
  const total = money(row.valor_reparacion);
  const sena = money(row.sena);
  const saldo = total - sena;

  if (total <= 0) {
    throw new Error('No se puede generar caja sin valor de reparacion');
  }

  if (saldo < 0) {
    throw new Error('La sena no puede superar el valor de reparacion');
  }

  const insert = await client.query(
    `
    INSERT INTO movimientos_caja (
      ticket_uuid,
      sucursal_id,
      cliente_id,
      importe_total,
      sena,
      saldo,
      estado
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'PENDIENTE_COBRO')
    RETURNING *
    `,
    [uuid, row.sucursal_actual_id, row.cliente_id, total, sena, saldo]
  );

  return insert.rows[0];
}

async function listarTickets(url) {
  const sucursalId = url.searchParams.get('sucursal_id');
  const params = [];
  let where = '';

  if (sucursalId) {
    params.push(sucursalId);
    where = `WHERE t.sucursal_actual_id = $${params.length}`;
  }

  const result = await query(
    `
    SELECT
      t.uuid,
      t.valor_reparacion,
      t.sena,
      t.presupuesto_enviado,
      t.sucursal_origen_id,
      t.sucursal_actual_id,
      et.descripcion AS estado,
      et.codigo AS estado_codigo,
      et.id AS estado_id,
      c.nombre,
      c.apellido,
      c.celular,
      te.descripcion AS tipo,
      ma.nombre AS marca,
      mo.nombre AS modelo
    FROM tickets t
    JOIN clientes c ON c.id = t.cliente_id
    JOIN tipos_equipo te ON te.id = t.tipo_equipo_id
    JOIN modelos mo ON mo.id = t.modelo_id
    JOIN marcas ma ON ma.id = mo.marca_id
    JOIN estados_ticket et ON et.id = t.estado_id
    ${where}
    ORDER BY t.id DESC
    `,
    params
  );

  return result.rows;
}

async function crearTicket(data) {
  return withTransaction(async client => {
    const estado = await estadoPorCodigo(client, 'PENDIENTE');
    const uuid = randomUUID();

    const result = await client.query(
      `
      INSERT INTO tickets (
        uuid,
        sucursal_origen_id,
        sucursal_actual_id,
        cliente_id,
        tipo_equipo_id,
        modelo_id,
        descripcion_falla,
        estado_id
      )
      VALUES ($1, $2, $2, $3, $4, $5, $6, $7)
      RETURNING uuid
      `,
      [
        uuid,
        data.sucursal_id,
        data.cliente_id,
        data.tipo_equipo_id,
        data.modelo_id,
        data.descripcion_falla,
        estado.id
      ]
    );

    return result.rows[0];
  });
}

async function actualizarEstado(uuid, data) {
  return withTransaction(async client => {
    const estado = data.estado_codigo
      ? await estadoPorCodigo(client, data.estado_codigo)
      : (await client.query(
          `SELECT id, codigo FROM estados_ticket WHERE id = $1 AND is_deleted = FALSE`,
          [data.estado_id]
        )).rows[0];

    if (!estado) {
      throw new Error('Estado no encontrado');
    }

    const result = await client.query(
      `
      UPDATE tickets
      SET estado_id = $1,
          updated_at = NOW()
      WHERE uuid = $2
      RETURNING uuid
      `,
      [estado.id, uuid]
    );

    if (result.rowCount === 0) {
      throw new Error('Ticket no encontrado');
    }

    if (estado.codigo === 'ENTREGADO') {
      await generarMovimientoCaja(client, uuid);
    }

    return result.rows[0];
  });
}

async function actualizarPresupuesto(uuid, data, enviar) {
  return withTransaction(async client => {
    const valor = money(data.valor_reparacion);
    const sena = money(data.sena);

    if (sena > valor) {
      throw new Error('La sena no puede superar el valor de reparacion');
    }

    let estadoSql = '';
    const params = [valor, sena, uuid];

    if (enviar) {
      const estado = await estadoPorCodigo(client, 'PRESUPUESTO_ENVIADO');
      params.push(estado.id);
      estadoSql = `, presupuesto_enviado = TRUE, estado_id = $4`;
    }

    const result = await client.query(
      `
      UPDATE tickets
      SET valor_reparacion = $1,
          sena = $2,
          updated_at = NOW()
          ${estadoSql}
      WHERE uuid = $3
      RETURNING uuid, valor_reparacion, sena, presupuesto_enviado
      `,
      params
    );

    if (result.rowCount === 0) {
      throw new Error('Ticket no encontrado');
    }

    return result.rows[0];
  });
}

async function entregarTicket(uuid, data) {
  return withTransaction(async client => {
    const estado = await estadoPorCodigo(client, 'ENTREGADO');
    const result = await client.query(
      `
      UPDATE tickets
      SET trabajo_realizado = $1,
          garantia_dias = $2,
          estado_id = $3,
          fecha_entrega = NOW(),
          updated_at = NOW()
      WHERE uuid = $4
      RETURNING uuid
      `,
      [data.trabajo, data.garantia, estado.id, uuid]
    );

    if (result.rowCount === 0) {
      throw new Error('Ticket no encontrado');
    }

    await generarMovimientoCaja(client, uuid);
    return result.rows[0];
  });
}

async function derivarTicket(uuid, data) {
  return withTransaction(async client => {
    const ticket = await client.query(
      `SELECT sucursal_actual_id FROM tickets WHERE uuid = $1`,
      [uuid]
    );

    if (ticket.rowCount === 0) {
      throw new Error('Ticket no encontrado');
    }

    const origen = ticket.rows[0].sucursal_actual_id;

    await client.query(
      `
      INSERT INTO derivaciones_ticket (
        ticket_uuid,
        sucursal_origen_id,
        sucursal_destino_id,
        observacion
      )
      VALUES ($1, $2, $3, $4)
      `,
      [uuid, origen, data.sucursal_destino_id, data.observacion || '']
    );

    const result = await client.query(
      `
      UPDATE tickets
      SET sucursal_actual_id = $1,
          updated_at = NOW()
      WHERE uuid = $2
      RETURNING uuid, sucursal_actual_id
      `,
      [data.sucursal_destino_id, uuid]
    );

    return result.rows[0];
  });
}

async function cajaPendiente() {
  const result = await query(`
    SELECT
      mc.id AS movimiento_id,
      mc.ticket_uuid,
      mc.importe_total,
      mc.sena,
      mc.saldo,
      mc.estado,
      mc.fecha_creacion,
      c.nombre,
      c.apellido,
      c.celular,
      te.descripcion AS tipo,
      ma.nombre AS marca,
      mo.nombre AS modelo
    FROM movimientos_caja mc
    JOIN tickets t ON t.uuid = mc.ticket_uuid
    JOIN clientes c ON c.id = mc.cliente_id
    JOIN tipos_equipo te ON te.id = t.tipo_equipo_id
    JOIN modelos mo ON mo.id = t.modelo_id
    JOIN marcas ma ON ma.id = mo.marca_id
    WHERE mc.estado = 'PENDIENTE_COBRO'
    ORDER BY mc.fecha_creacion DESC
  `);

  return result.rows;
}

async function cobrarCaja(uuid) {
  const result = await query(
    `
    UPDATE movimientos_caja
    SET estado = 'COBRADO',
        fecha_cobro = COALESCE(fecha_cobro, NOW())
    WHERE ticket_uuid = $1
      AND estado = 'PENDIENTE_COBRO'
    RETURNING *
    `,
    [uuid]
  );

  if (result.rowCount === 0) {
    throw new Error('No hay un movimiento pendiente para cobrar');
  }

  return result.rows[0];
}

async function handle(req, res) {
  const url = parseUrl(req);
  const path = url.pathname;
  const method = req.method;

  try {
    if (method === 'GET' && path === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method === 'GET' && path === '/estados-ticket') {
      const result = await query(
        `SELECT id, codigo, descripcion FROM estados_ticket WHERE is_deleted = FALSE ORDER BY orden`
      );
      sendJson(res, 200, result.rows);
      return;
    }

    if (method === 'GET' && path === '/sucursales') {
      const result = await query(`SELECT * FROM sucursales WHERE is_deleted = FALSE ORDER BY nombre`);
      sendJson(res, 200, result.rows);
      return;
    }

    if (method === 'GET' && path === '/tickets') {
      sendJson(res, 200, await listarTickets(url));
      return;
    }

    if (method === 'POST' && path === '/tickets') {
      sendJson(res, 201, await crearTicket(await readJson(req)));
      return;
    }

    const ticketMatch = path.match(/^\/tickets\/([^/]+)(?:\/([^/]+))?$/);

    if (ticketMatch && method === 'PATCH' && ticketMatch[2] === 'estado') {
      sendJson(res, 200, await actualizarEstado(ticketMatch[1], await readJson(req)));
      return;
    }

    if (ticketMatch && method === 'PATCH' && ticketMatch[2] === 'presupuesto') {
      sendJson(res, 200, await actualizarPresupuesto(ticketMatch[1], await readJson(req), false));
      return;
    }

    if (ticketMatch && method === 'POST' && ticketMatch[2] === 'presupuesto-enviar') {
      sendJson(res, 200, await actualizarPresupuesto(ticketMatch[1], await readJson(req), true));
      return;
    }

    if (ticketMatch && method === 'POST' && ticketMatch[2] === 'entrega') {
      sendJson(res, 200, await entregarTicket(ticketMatch[1], await readJson(req)));
      return;
    }

    if (ticketMatch && method === 'POST' && ticketMatch[2] === 'derivaciones') {
      sendJson(res, 201, await derivarTicket(ticketMatch[1], await readJson(req)));
      return;
    }

    if (method === 'GET' && path === '/caja/pendientes') {
      sendJson(res, 200, await cajaPendiente());
      return;
    }

    const cajaCobroMatch = path.match(/^\/caja\/([^/]+)\/cobrar$/);

    if (method === 'POST' && cajaCobroMatch) {
      sendJson(res, 200, await cobrarCaja(cajaCobroMatch[1]));
      return;
    }

    sendJson(res, 404, { error: 'Ruta no encontrada' });
  } catch (error) {
    sendJson(res, 400, { error: error.message || 'Error inesperado' });
  }
}

const server = http.createServer(handle);

server.listen(config.port, () => {
  console.log(`Sistema Tickets API escuchando en http://localhost:${config.port}`);
});
