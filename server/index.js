const http = require('http');
const { randomUUID } = require('crypto');
const config = require('./config');
const { query, withTransaction } = require('./db');
const pdfComprobanteX = require('../pdf/comprobante_x');

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

async function obtenerTicketPDFData(uuid) {
  const result = await query(
    `
    SELECT
      t.*,
      c.nombre AS cliente_nombre,
      c.apellido AS cliente_apellido,
      c.celular,
      c.email,
      te.descripcion AS tipo_equipo,
      mo.nombre AS modelo,
      ma.nombre AS marca
    FROM tickets t
    JOIN clientes c ON c.id = t.cliente_id
    JOIN tipos_equipo te ON te.id = t.tipo_equipo_id
    JOIN modelos mo ON mo.id = t.modelo_id
    JOIN marcas ma ON ma.id = mo.marca_id
    WHERE t.uuid = $1
    `,
    [uuid]
  );

  if (result.rowCount === 0) {
    throw new Error('Ticket no encontrado');
  }

  return result.rows[0];
}

async function cajaCobrada(limite = 100) {
  const result = await query(
    `
    SELECT
      mc.id AS movimiento_id,
      mc.ticket_uuid,
      mc.importe_total,
      mc.sena,
      mc.saldo,
      mc.estado,
      mc.fecha_creacion,
      mc.fecha_cobro,
      c.nombre,
      c.apellido,
      c.celular,
      te.descripcion AS tipo,
      ma.nombre AS marca,
      mo.nombre AS modelo,
      COALESCE(SUM(dc.importe), 0) AS devoluciones,
      cx.numero AS comprobante_numero,
      cx.pdf_path AS comprobante_pdf
    FROM movimientos_caja mc
    JOIN tickets t ON t.uuid = mc.ticket_uuid
    JOIN clientes c ON c.id = mc.cliente_id
    JOIN tipos_equipo te ON te.id = t.tipo_equipo_id
    JOIN modelos mo ON mo.id = t.modelo_id
    JOIN marcas ma ON ma.id = mo.marca_id
    LEFT JOIN devoluciones_caja dc ON dc.movimiento_id = mc.id
    LEFT JOIN comprobantes_x cx ON cx.movimiento_id = mc.id
    WHERE mc.estado = 'COBRADO'
    GROUP BY mc.id, c.id, te.id, ma.id, mo.id, cx.id
    ORDER BY mc.fecha_cobro DESC
    LIMIT $1
    `,
    [Number(limite) || 100]
  );

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

async function registrarDevolucion(uuid, data) {
  const importe = money(data.importe);

  if (importe <= 0) {
    throw new Error('La devolucion debe ser mayor a cero');
  }

  return withTransaction(async client => {
    const movimiento = await client.query(
      `SELECT * FROM movimientos_caja WHERE ticket_uuid = $1`,
      [uuid]
    );

    if (movimiento.rowCount === 0) {
      throw new Error('Movimiento no encontrado');
    }

    const mov = movimiento.rows[0];

    if (mov.estado !== 'COBRADO') {
      throw new Error('Solo se puede devolver un movimiento cobrado');
    }

    const devoluciones = await client.query(
      `SELECT COALESCE(SUM(importe), 0) AS total FROM devoluciones_caja WHERE movimiento_id = $1`,
      [mov.id]
    );

    if ((Number(devoluciones.rows[0].total || 0) + importe) > Number(mov.saldo || 0)) {
      throw new Error('La devolucion supera el saldo cobrado');
    }

    const result = await client.query(
      `
      INSERT INTO devoluciones_caja (movimiento_id, ticket_uuid, importe, motivo)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [mov.id, uuid, importe, data.motivo || '']
    );

    return result.rows[0];
  });
}

function filtrosFecha(searchParams, campo, startIndex = 1) {
  const condiciones = [];
  const params = [];

  if (searchParams.get('desde')) {
    params.push(searchParams.get('desde'));
    condiciones.push(`date(${campo}) >= date($${startIndex + params.length - 1})`);
  }

  if (searchParams.get('hasta')) {
    params.push(searchParams.get('hasta'));
    condiciones.push(`date(${campo}) <= date($${startIndex + params.length - 1})`);
  }

  return {
    where: condiciones.length ? `AND ${condiciones.join(' AND ')}` : '',
    params
  };
}

async function informeCaja(url) {
  const filtroCobros = filtrosFecha(url.searchParams, 'mc.fecha_cobro');
  const filtroDevoluciones = filtrosFecha(url.searchParams, 'dc.fecha');

  const cobros = await query(
    `
    SELECT COUNT(*) AS cantidad, COALESCE(SUM(mc.saldo), 0) AS total
    FROM movimientos_caja mc
    WHERE mc.estado = 'COBRADO'
      ${filtroCobros.where}
    `,
    filtroCobros.params
  );

  const devoluciones = await query(
    `
    SELECT COUNT(*) AS cantidad, COALESCE(SUM(dc.importe), 0) AS total
    FROM devoluciones_caja dc
    WHERE 1 = 1
      ${filtroDevoluciones.where}
    `,
    filtroDevoluciones.params
  );

  const cobrado = Number(cobros.rows[0].total || 0);
  const devuelto = Number(devoluciones.rows[0].total || 0);

  return {
    cobros: cobros.rows[0],
    devoluciones: devoluciones.rows[0],
    neto: cobrado - devuelto,
    detalleCobros: [],
    detalleDevoluciones: []
  };
}

async function datosComprobanteX(uuid) {
  const result = await query(
    `
    SELECT
      mc.id AS movimiento_id,
      mc.ticket_uuid,
      mc.importe_total,
      mc.sena,
      mc.saldo,
      mc.fecha_cobro,
      c.nombre,
      c.apellido,
      c.dni,
      c.celular,
      te.descripcion AS tipo,
      ma.nombre AS marca,
      mo.nombre AS modelo,
      t.descripcion_falla,
      t.trabajo_realizado
    FROM movimientos_caja mc
    JOIN tickets t ON t.uuid = mc.ticket_uuid
    JOIN clientes c ON c.id = mc.cliente_id
    JOIN tipos_equipo te ON te.id = t.tipo_equipo_id
    JOIN modelos mo ON mo.id = t.modelo_id
    JOIN marcas ma ON ma.id = mo.marca_id
    WHERE mc.ticket_uuid = $1
    `,
    [uuid]
  );

  if (result.rowCount === 0) {
    throw new Error('Movimiento de caja no encontrado');
  }

  return result.rows[0];
}

async function comprobanteX(uuid) {
  return withTransaction(async client => {
    const movimiento = await client.query(
      `SELECT * FROM movimientos_caja WHERE ticket_uuid = $1`,
      [uuid]
    );

    if (movimiento.rowCount === 0) {
      throw new Error('Movimiento de caja no encontrado');
    }

    const mov = movimiento.rows[0];

    if (mov.estado !== 'COBRADO') {
      throw new Error('El movimiento debe estar cobrado para emitir comprobante X');
    }

    const existente = await client.query(
      `SELECT * FROM comprobantes_x WHERE movimiento_id = $1`,
      [mov.id]
    );

    if (existente.rowCount > 0) {
      return existente.rows[0];
    }

    const ultimo = await client.query(`SELECT COALESCE(MAX(numero), 0) AS numero FROM comprobantes_x`);
    const numero = Number(ultimo.rows[0].numero || 0) + 1;
    const datos = await datosComprobanteX(uuid);
    const pdfPath = pdfComprobanteX({ ...datos, numero }, config.outputPath);

    const result = await client.query(
      `
      INSERT INTO comprobantes_x (movimiento_id, ticket_uuid, numero, importe, pdf_path)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [mov.id, uuid, numero, mov.saldo, pdfPath]
    );

    return result.rows[0];
  });
}

function incluyeEliminados(url) {
  return ['1', 'true', 'si', 'sí'].includes(
    String(url.searchParams.get('includeDeleted') || '').toLowerCase()
  );
}

async function buscarClientePorDni(dni) {
  const result = await query(`SELECT * FROM clientes WHERE dni = $1`, [dni]);
  return result.rows[0] || null;
}

async function crearCliente(data) {
  const result = await query(
    `
    INSERT INTO clientes (dni, nombre, apellido, celular, email)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [data.dni, data.nombre, data.apellido, data.celular || '', data.email || '']
  );

  return result.rows[0];
}

async function listarTiposEquipo(includeDeleted) {
  const result = await query(`
    SELECT *
    FROM tipos_equipo
    ${includeDeleted ? '' : 'WHERE is_deleted = FALSE'}
    ORDER BY descripcion
  `);
  return result.rows;
}

async function crearTipoEquipo(data) {
  const result = await query(
    `
    INSERT INTO tipos_equipo (codigo, descripcion)
    VALUES ($1, $2)
    RETURNING *
    `,
    [data.codigo, data.descripcion]
  );
  return result.rows[0];
}

async function actualizarTipoEquipo(id, data) {
  const result = await query(
    `
    UPDATE tipos_equipo
    SET codigo = $1,
        descripcion = $2,
        updated_at = NOW()
    WHERE id = $3
    RETURNING *
    `,
    [data.codigo, data.descripcion, id]
  );
  return result.rows[0];
}

async function listarMarcas(includeDeleted) {
  const result = await query(`
    SELECT *
    FROM marcas
    ${includeDeleted ? '' : 'WHERE is_deleted = FALSE'}
    ORDER BY nombre
  `);
  return result.rows;
}

async function crearMarca(data) {
  const result = await query(
    `INSERT INTO marcas (nombre) VALUES ($1) RETURNING *`,
    [data.nombre]
  );
  return result.rows[0];
}

async function actualizarMarca(id, data) {
  const result = await query(
    `
    UPDATE marcas
    SET nombre = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [data.nombre, id]
  );
  return result.rows[0];
}

async function listarModelos(url) {
  const includeDeleted = incluyeEliminados(url);
  const marcaId = url.searchParams.get('marca_id');
  const params = [];
  const condiciones = [];

  if (!includeDeleted) {
    condiciones.push('mo.is_deleted = FALSE');
  }

  if (marcaId) {
    params.push(marcaId);
    condiciones.push(`mo.marca_id = $${params.length}`);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  const result = await query(
    `
    SELECT
      mo.id,
      mo.tipo_equipo_id,
      mo.marca_id,
      ma.nombre AS marca,
      mo.nombre AS modelo,
      mo.is_deleted,
      te.descripcion AS tipo
    FROM modelos mo
    JOIN tipos_equipo te ON te.id = mo.tipo_equipo_id
    JOIN marcas ma ON ma.id = mo.marca_id
    ${where}
    ORDER BY te.descripcion, ma.nombre, mo.nombre
    `,
    params
  );

  return result.rows;
}

async function crearModelo(data) {
  const result = await query(
    `
    INSERT INTO modelos (marca_id, nombre, tipo_equipo_id)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [data.marca_id, data.nombre, data.tipo_equipo_id]
  );
  return result.rows[0];
}

async function actualizarModelo(id, data) {
  const result = await query(
    `
    UPDATE modelos
    SET tipo_equipo_id = $1,
        marca_id = $2,
        nombre = $3,
        updated_at = NOW()
    WHERE id = $4
    RETURNING *
    `,
    [data.tipo_equipo_id, data.marca_id, data.nombre, id]
  );
  return result.rows[0];
}

async function listarSucursales(includeDeleted) {
  const result = await query(`
    SELECT *
    FROM sucursales
    ${includeDeleted ? '' : 'WHERE is_deleted = FALSE'}
    ORDER BY nombre
  `);
  return result.rows;
}

async function crearSucursal(data) {
  return withTransaction(async client => {
    if (data.sucursal_local) {
      await client.query(`UPDATE sucursales SET sucursal_local = FALSE`);
    }

    const result = await client.query(
      `
      INSERT INTO sucursales (codigo, nombre, direccion, telefono, sucursal_local)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [data.codigo, data.nombre, data.direccion || '', data.telefono || '', Boolean(data.sucursal_local)]
    );

    return result.rows[0];
  });
}

async function actualizarSucursal(id, data) {
  return withTransaction(async client => {
    if (data.sucursal_local) {
      await client.query(`UPDATE sucursales SET sucursal_local = FALSE`);
    }

    const result = await client.query(
      `
      UPDATE sucursales
      SET codigo = $1,
          nombre = $2,
          direccion = $3,
          telefono = $4,
          sucursal_local = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
      `,
      [
        data.codigo,
        data.nombre,
        data.direccion || '',
        data.telefono || '',
        Boolean(data.sucursal_local),
        id
      ]
    );

    return result.rows[0];
  });
}

async function softDelete(tabla, id) {
  const result = await query(
    `
    UPDATE ${tabla}
    SET is_deleted = TRUE,
        deleted_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );
  return result.rows[0];
}

async function reactivar(tabla, id) {
  const result = await query(
    `
    UPDATE ${tabla}
    SET is_deleted = FALSE,
        restored_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );
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
      sendJson(res, 200, await listarSucursales(incluyeEliminados(url)));
      return;
    }

    if (method === 'POST' && path === '/sucursales') {
      sendJson(res, 201, await crearSucursal(await readJson(req)));
      return;
    }

    const sucursalMatch = path.match(/^\/sucursales\/(\d+)(?:\/([^/]+))?$/);

    if (sucursalMatch && method === 'PUT' && !sucursalMatch[2]) {
      sendJson(res, 200, await actualizarSucursal(sucursalMatch[1], await readJson(req)));
      return;
    }

    if (sucursalMatch && method === 'DELETE' && !sucursalMatch[2]) {
      sendJson(res, 200, await softDelete('sucursales', sucursalMatch[1]));
      return;
    }

    if (sucursalMatch && method === 'POST' && sucursalMatch[2] === 'reactivar') {
      sendJson(res, 200, await reactivar('sucursales', sucursalMatch[1]));
      return;
    }

    if (method === 'GET' && path === '/clientes/buscar') {
      sendJson(res, 200, await buscarClientePorDni(url.searchParams.get('dni')));
      return;
    }

    if (method === 'POST' && path === '/clientes') {
      sendJson(res, 201, await crearCliente(await readJson(req)));
      return;
    }

    if (method === 'GET' && path === '/tipos-equipo') {
      sendJson(res, 200, await listarTiposEquipo(incluyeEliminados(url)));
      return;
    }

    if (method === 'POST' && path === '/tipos-equipo') {
      sendJson(res, 201, await crearTipoEquipo(await readJson(req)));
      return;
    }

    const tipoMatch = path.match(/^\/tipos-equipo\/(\d+)(?:\/([^/]+))?$/);

    if (tipoMatch && method === 'PUT' && !tipoMatch[2]) {
      sendJson(res, 200, await actualizarTipoEquipo(tipoMatch[1], await readJson(req)));
      return;
    }

    if (tipoMatch && method === 'DELETE' && !tipoMatch[2]) {
      sendJson(res, 200, await softDelete('tipos_equipo', tipoMatch[1]));
      return;
    }

    if (tipoMatch && method === 'POST' && tipoMatch[2] === 'reactivar') {
      sendJson(res, 200, await reactivar('tipos_equipo', tipoMatch[1]));
      return;
    }

    if (method === 'GET' && path === '/marcas') {
      sendJson(res, 200, await listarMarcas(incluyeEliminados(url)));
      return;
    }

    if (method === 'POST' && path === '/marcas') {
      sendJson(res, 201, await crearMarca(await readJson(req)));
      return;
    }

    const marcaMatch = path.match(/^\/marcas\/(\d+)(?:\/([^/]+))?$/);

    if (marcaMatch && method === 'PUT' && !marcaMatch[2]) {
      sendJson(res, 200, await actualizarMarca(marcaMatch[1], await readJson(req)));
      return;
    }

    if (marcaMatch && method === 'DELETE' && !marcaMatch[2]) {
      sendJson(res, 200, await softDelete('marcas', marcaMatch[1]));
      return;
    }

    if (marcaMatch && method === 'POST' && marcaMatch[2] === 'reactivar') {
      sendJson(res, 200, await reactivar('marcas', marcaMatch[1]));
      return;
    }

    if (method === 'GET' && path === '/modelos') {
      sendJson(res, 200, await listarModelos(url));
      return;
    }

    if (method === 'POST' && path === '/modelos') {
      sendJson(res, 201, await crearModelo(await readJson(req)));
      return;
    }

    const modeloMatch = path.match(/^\/modelos\/(\d+)(?:\/([^/]+))?$/);

    if (modeloMatch && method === 'PUT' && !modeloMatch[2]) {
      sendJson(res, 200, await actualizarModelo(modeloMatch[1], await readJson(req)));
      return;
    }

    if (modeloMatch && method === 'DELETE' && !modeloMatch[2]) {
      sendJson(res, 200, await softDelete('modelos', modeloMatch[1]));
      return;
    }

    if (modeloMatch && method === 'POST' && modeloMatch[2] === 'reactivar') {
      sendJson(res, 200, await reactivar('modelos', modeloMatch[1]));
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

    if (ticketMatch && method === 'GET' && ticketMatch[2] === 'pdf-data') {
      sendJson(res, 200, await obtenerTicketPDFData(ticketMatch[1]));
      return;
    }

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

    if (method === 'GET' && path === '/caja/cobrados') {
      sendJson(res, 200, await cajaCobrada(url.searchParams.get('limite') || 100));
      return;
    }

    if (method === 'GET' && path === '/caja/informe') {
      sendJson(res, 200, await informeCaja(url));
      return;
    }

    const cajaCobroMatch = path.match(/^\/caja\/([^/]+)\/cobrar$/);

    if (method === 'POST' && cajaCobroMatch) {
      sendJson(res, 200, await cobrarCaja(cajaCobroMatch[1]));
      return;
    }

    const cajaDevolucionMatch = path.match(/^\/caja\/([^/]+)\/devoluciones$/);

    if (method === 'POST' && cajaDevolucionMatch) {
      sendJson(res, 201, await registrarDevolucion(cajaDevolucionMatch[1], await readJson(req)));
      return;
    }

    const comprobanteMatch = path.match(/^\/caja\/([^/]+)\/comprobante-x$/);

    if (method === 'POST' && comprobanteMatch) {
      sendJson(res, 200, await comprobanteX(comprobanteMatch[1]));
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
