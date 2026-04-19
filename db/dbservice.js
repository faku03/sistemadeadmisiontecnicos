const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const db = new Database(path.join(__dirname, 'tickets.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function normalizarImporte(valor, campo) {
  const numero = Number(valor || 0);

  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error(`${campo} debe ser un importe valido`);
  }

  return numero;
}

function obtenerEstadoPorCodigo(codigo) {
  const estado = db.prepare(`
    SELECT id, codigo, descripcion
    FROM estados_ticket
    WHERE codigo = ? AND is_deleted = 0
  `).get(codigo);

  if (!estado) {
    throw new Error(`No existe el estado ${codigo}`);
  }

  return estado;
}

function guardarPresupuesto(uuid, valorReparacion, sena) {
  const valor = normalizarImporte(valorReparacion, 'Valor de reparacion');
  const entrega = normalizarImporte(sena, 'Sena');

  if (entrega > valor) {
    throw new Error('La sena no puede ser mayor al valor de reparacion');
  }

  const result = db.prepare(`
    UPDATE tickets
    SET valor_reparacion = ?,
        sena = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE uuid = ?
  `).run(valor, entrega, uuid);

  if (result.changes === 0) {
    throw new Error('Ticket no encontrado');
  }

  return { uuid, valor_reparacion: valor, sena: entrega };
}

function generarMovimientoCajaInterno(uuid) {
  const ticket = db.prepare(`
    SELECT
      uuid,
      sucursal_id,
      cliente_id,
      valor_reparacion,
      sena
    FROM tickets
    WHERE uuid = ?
  `).get(uuid);

  if (!ticket) {
    throw new Error('Ticket no encontrado');
  }

  const existente = db.prepare(`
    SELECT id
    FROM movimientos_caja
    WHERE ticket_uuid = ?
    LIMIT 1
  `).get(uuid);

  if (existente) {
    return { creado: false, id: existente.id };
  }

  const importeTotal = normalizarImporte(ticket.valor_reparacion, 'Valor de reparacion');
  const entrega = normalizarImporte(ticket.sena, 'Sena');
  const saldo = importeTotal - entrega;

  if (importeTotal <= 0) {
    throw new Error('No se puede generar caja sin valor de reparacion');
  }

  if (saldo < 0) {
    throw new Error('La sena no puede ser mayor al valor de reparacion');
  }

  const result = db.prepare(`
    INSERT INTO movimientos_caja (
      ticket_uuid,
      sucursal_id,
      cliente_id,
      importe_total,
      sena,
      saldo,
      estado
    )
    VALUES (?, ?, ?, ?, ?, ?, 'PENDIENTE_COBRO')
  `).run(
    uuid,
    ticket.sucursal_id,
    ticket.cliente_id,
    importeTotal,
    entrega,
    saldo
  );

  return { creado: true, id: result.lastInsertRowid };
}

function cerrarMovimientoCajaInterno(uuid) {
  return db.prepare(`
    UPDATE movimientos_caja
    SET estado = 'COBRADO',
        fecha_cobro = COALESCE(fecha_cobro, CURRENT_TIMESTAMP)
    WHERE ticket_uuid = ?
      AND estado = 'PENDIENTE_COBRO'
  `).run(uuid);
}

function columnaExiste(tabla, columna) {
  return db.prepare(`PRAGMA table_info(${tabla})`)
    .all()
    .some(c => c.name === columna);
}

function asegurarColumna(tabla, columna, definicion) {
  if (!columnaExiste(tabla, columna)) {
    db.prepare(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`).run();
  }
}

function asegurarEstadoTicket(codigo, descripcion, orden) {
  const existente = db.prepare(`
    SELECT id
    FROM estados_ticket
    WHERE codigo = ?
  `).get(codigo);

  if (existente) {
    db.prepare(`
      UPDATE estados_ticket
      SET descripcion = ?,
          orden = ?,
          is_deleted = 0
      WHERE codigo = ?
    `).run(descripcion, orden, codigo);
    return;
  }

  db.prepare(`
    INSERT INTO estados_ticket (codigo, descripcion, orden)
    VALUES (?, ?, ?)
  `).run(codigo, descripcion, orden);
}

/* ================= TABLAS ================= */
db.exec(`
CREATE TABLE IF NOT EXISTS sucursales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  sucursal_local INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0,
  deleted_at DATETIME,
  restored_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dni TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  celular TEXT,
  email TEXT,
  is_deleted INTEGER DEFAULT 0,
  deleted_at DATETIME,
  restored_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS tipos_equipo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  deleted_at DATETIME,
  restored_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS marcas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  is_deleted INTEGER DEFAULT 0,
  deleted_at DATETIME,
  restored_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS modelos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  marca_id INTEGER NOT NULL,
  tipo_equipo_id INTEGER,
  nombre TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  deleted_at DATETIME,
  restored_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  FOREIGN KEY (marca_id) REFERENCES marcas(id),
  UNIQUE (marca_id, nombre)
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  sucursal_id INTEGER NOT NULL,
  cliente_id INTEGER NOT NULL,
  tipo_equipo_id INTEGER NOT NULL,
  modelo_id INTEGER NOT NULL,
  descripcion_falla TEXT NOT NULL,
  trabajo_realizado TEXT,
  estado_id INTEGER NOT NULL,
  fecha_ingreso DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_entrega DATETIME,
  garantia_dias INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME,
  valor_reparacion REAL DEFAULT 0,
  sena REAL DEFAULT 0,
  presupuesto_enviado INTEGER DEFAULT 0,
  FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id),
  FOREIGN KEY (tipo_equipo_id) REFERENCES tipos_equipo(id),
  FOREIGN KEY (modelo_id) REFERENCES modelos(id),
  FOREIGN KEY (estado_id) REFERENCES estados_ticket(id)
);

CREATE TABLE IF NOT EXISTS estados_ticket (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS movimientos_caja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_uuid TEXT NOT NULL,
  sucursal_id INTEGER NOT NULL,
  cliente_id INTEGER NOT NULL,
  importe_total REAL NOT NULL,
  sena REAL DEFAULT 0,
  saldo REAL NOT NULL,
  estado TEXT DEFAULT 'PENDIENTE_COBRO',
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_cobro DATETIME,
  FOREIGN KEY (ticket_uuid) REFERENCES tickets(uuid)
);


`);

/* ================= MIGRACIONES ================= */
asegurarColumna('tickets', 'valor_reparacion', 'REAL DEFAULT 0');
asegurarColumna('tickets', 'sena', 'REAL DEFAULT 0');
asegurarColumna('tickets', 'presupuesto_enviado', 'INTEGER DEFAULT 0');

db.prepare(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_movimientos_caja_ticket_uuid
  ON movimientos_caja(ticket_uuid)
`).run();

asegurarEstadoTicket('PENDIENTE', 'Pendiente', 1);
asegurarEstadoTicket('PRESUPUESTO_ENVIADO', 'Presupuesto enviado', 2);
asegurarEstadoTicket('EN_REPARACION', 'En reparacion', 3);
asegurarEstadoTicket('LISTO', 'Listo para entregar', 4);
asegurarEstadoTicket('ENTREGADO', 'Entregado', 5);


module.exports = {

  /* ================= CLIENTES ================= */
  buscarClientePorDni(dni) {
    return db.prepare(`SELECT * FROM clientes WHERE dni = ?`).get(dni);
  },

  crearCliente(data) {
    return db.prepare(`
      INSERT INTO clientes (dni, nombre, apellido, celular, email)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      data.dni,
      data.nombre,
      data.apellido,
      data.celular,
      data.email
    ).lastInsertRowid;
  },

  /* ================= COMBOS ================= */
  listarTipos() {
    return db.prepare(`
      SELECT id, codigo, descripcion, is_deleted
      FROM tipos_equipo
      ORDER BY descripcion
    `).all();
  },

  listarMarcas() {
    return db.prepare(`
      SELECT id, nombre, is_deleted
      FROM marcas
      ORDER BY nombre
    `).all();
  },

  listarModelosPorMarca(marcaId) {
    return db.prepare(`
      SELECT id, nombre, is_deleted
      FROM modelos
      WHERE marca_id = ? AND is_deleted = 0
      ORDER BY nombre
    `).all(marcaId);
  },

  /* ================= TICKETS ================= */
  crearTicket(data) {
    const uuid = uuidv4();
    const estadoPendiente = db.prepare(`
      SELECT id FROM estados_ticket WHERE codigo = 'PENDIENTE'
    `).get();

    db.prepare(`
  INSERT INTO tickets (
    uuid, sucursal_id, cliente_id,
    tipo_equipo_id, modelo_id,
    descripcion_falla, estado_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(
      uuid,
      data.sucursal_id,
      data.cliente_id,
      data.tipo_equipo_id,
      data.modelo_id,
      data.descripcion_falla,
      estadoPendiente.id
    );
    return { uuid };
  },

  listarTickets() {
    return db.prepare(`
    SELECT
    t.uuid,
    t.valor_reparacion,
    t.sena,
    t.presupuesto_enviado,
    et.descripcion AS estado,
    et.codigo AS estado_codigo,
    et.id AS estado_id,
    c.nombre, c.apellido, c.celular, te.descripcion AS tipo,
    ma.nombre AS marca, mo.nombre AS modelo FROM tickets t
    JOIN clientes c ON c.id = t.cliente_id
    JOIN tipos_equipo te ON te.id = t.tipo_equipo_id
    JOIN modelos mo ON mo.id = t.modelo_id
    JOIN marcas ma ON ma.id = mo.marca_id
    JOIN estados_ticket et ON et.id = t.estado_id
    ORDER BY t.id DESC

  `).all();
  },


  obtenerTicketParaPDF(uuid) {
    return db.prepare(`
      SELECT
        t.*,
        c.nombre AS cliente_nombre,
        c.apellido AS cliente_apellido,
        c.celular,
        c.email,
        te.descripcion AS tipo_equipo,
        m.nombre AS modelo,
        ma.nombre AS marca
      FROM tickets t
      JOIN clientes c ON c.id = t.cliente_id
      JOIN tipos_equipo te ON te.id = t.tipo_equipo_id
      JOIN modelos m ON m.id = t.modelo_id
      JOIN marcas ma ON ma.id = m.marca_id
      WHERE t.uuid = ?
    `).get(uuid);
  },

  entregarTicket(uuid, trabajo, garantia) {

  const estadoEntregado = obtenerEstadoPorCodigo('ENTREGADO');

  const trx = db.transaction(() => {
    db.prepare(`
      UPDATE tickets SET
        trabajo_realizado = ?,
        garantia_dias = ?,
        estado_id = ?,
        fecha_entrega = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE uuid = ?
    `).run(trabajo, garantia, estadoEntregado.id, uuid);

    cerrarMovimientoCajaInterno(uuid);
  });

  trx();
},

  /* ================= ABM TIPOS DE EQUIPO ================= */
  listarTiposEquipo(includeDeleted = false) {
    return db.prepare(`
      SELECT * FROM tipos_equipo
      ${includeDeleted ? '' : 'WHERE is_deleted = 0'}
      ORDER BY descripcion
    `).all();
  },

  crearTipoEquipo(data) {
    return db.prepare(`
      INSERT INTO tipos_equipo (codigo, descripcion)
      VALUES (?, ?)
    `).run(data.codigo, data.descripcion);
  },

  actualizarTipoEquipo(data) {
    return db.prepare(`
      UPDATE tipos_equipo
      SET codigo = ?, descripcion = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(data.codigo, data.descripcion, data.id);
  },

  eliminarTipoEquipo(id) {
    return db.prepare(`
      UPDATE tipos_equipo SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
  },

  reactivarTipoEquipo(id) {
    return db.prepare(`
      UPDATE tipos_equipo SET is_deleted = 0, restored_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
  },

  /* ================= ABM MARCAS ================= */
  listarMarcasEquipo(includeDeleted = false) {
    return db.prepare(`
      SELECT * FROM marcas
      ${includeDeleted ? '' : 'WHERE is_deleted = 0'}
      ORDER BY nombre
    `).all();
  },

  crearMarca(data) {
    return db.prepare(`
      INSERT INTO marcas (nombre)
      VALUES (?)
    `).run(data.nombre);
  },

  actualizarMarca(data) {
    return db.prepare(`
      UPDATE marcas
      SET nombre = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(data.nombre, data.id);
  },

  eliminarMarca(id) {
    return db.prepare(`
      UPDATE marcas SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
  },

  reactivarMarca(id) {
    return db.prepare(`
      UPDATE marcas SET is_deleted = 0, restored_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
  },

  // ============================
  // MODELOS - ABM
  // ============================

  listarModelosABM(includeDeleted = false) {
    let sql = `
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
  `;

    if (!includeDeleted) {
      sql += ' WHERE mo.is_deleted = 0';
    }

    sql += ' ORDER BY te.descripcion, ma.nombre, mo.nombre';

    return db.prepare(sql).all();
  },

  crearModelo(data) {
    return db.prepare(`
    INSERT INTO modelos (marca_id, nombre,tipo_equipo_id)
    VALUES (?, ?, ?)
  `).run(data.marca_id, data.nombre, data.tipo_equipo_id);
  },

  actualizarModelo(data) {
    return db.prepare(`
    UPDATE modelos
    SET
      tipo_equipo_id = ?,
      marca_id = ?,
      nombre = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
      data.tipo_equipo_id,
      data.marca_id,
      data.nombre,
      data.id
    );
  },

  eliminarModelo(id) {
    return db.prepare(`
    UPDATE modelos
    SET is_deleted = 1,
        deleted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);
  },

  reactivarModelo(id) {
    return db.prepare(`
    UPDATE modelos
    SET is_deleted = 0,
        restored_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);
  },

  /* ================= SUCURSAL LOCAL ================= */
  obtenerSucursalLocal() {
    return db.prepare(`
    SELECT id, nombre FROM sucursales
    WHERE sucursal_local = 1 AND is_deleted = 0
    LIMIT 1
  `).get();
  },

  /* ================= ABM SUCURSALES ================= */
  listarSucursales(includeDeleted = false) {
    return db.prepare(`
    SELECT * FROM sucursales
    ${includeDeleted ? '' : 'WHERE is_deleted = 0'}
    ORDER BY nombre
  `).all();
  },

  crearSucursal(data) {
    const trx = db.transaction(() => {
      if (data.sucursal_local) {
        db.prepare(`
        UPDATE sucursales SET sucursal_local = 0
      `).run();
      }

      db.prepare(`
      INSERT INTO sucursales (codigo, nombre, direccion, telefono, sucursal_local)
      VALUES (?, ?, ?, ?, ?)
    `).run(
        data.codigo,
        data.nombre,
        data.direccion,
        data.telefono,
        data.sucursal_local ? 1 : 0
      );
    });

    trx();
  },

  actualizarSucursal(data) {
    const trx = db.transaction(() => {
      if (data.sucursal_local) {
        db.prepare(`
        UPDATE sucursales SET sucursal_local = 0
      `).run();
      }

      db.prepare(`
      UPDATE sucursales SET
        codigo = ?,
        nombre = ?,
        direccion = ?,
        telefono = ?,
        sucursal_local = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
        data.codigo,
        data.nombre,
        data.direccion,
        data.telefono,
        data.sucursal_local ? 1 : 0,
        data.id
      );
    });

    trx();
  },

  eliminarSucursal(id) {
    return db.prepare(`
    UPDATE sucursales
    SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);
  },

  reactivarSucursal(id) {
    return db.prepare(`
    UPDATE sucursales
    SET is_deleted = 0, restored_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);
  },

  listarEstadosTicket() {
  return db.prepare(`
    SELECT id, codigo, descripcion
    FROM estados_ticket
    WHERE is_deleted = 0
    ORDER BY orden
  `).all();
},

actualizarEstadoTicket(uuid, estadoId) {
  const estado = db.prepare(`
    SELECT id, codigo
    FROM estados_ticket
    WHERE id = ? AND is_deleted = 0
  `).get(estadoId);

  if (!estado) {
    throw new Error('Estado no encontrado');
  }

  const trx = db.transaction(() => {
    const result = db.prepare(`
      UPDATE tickets
      SET estado_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE uuid = ?
    `).run(estado.id, uuid);

    if (result.changes === 0) {
      throw new Error('Ticket no encontrado');
    }

    if (estado.codigo === 'EN_REPARACION') {
      generarMovimientoCajaInterno(uuid);
    }

    if (estado.codigo === 'ENTREGADO') {
      cerrarMovimientoCajaInterno(uuid);
    }

    return result;
  });

  return trx();
},

actualizarPresupuesto(uuid, valorReparacion, sena) {
  return guardarPresupuesto(uuid, valorReparacion, sena);
},

enviarPresupuesto(uuid, valorReparacion, sena) {
  const trx = db.transaction(() => {
    const presupuesto = guardarPresupuesto(uuid, valorReparacion, sena);
    const estadoPresupuesto = obtenerEstadoPorCodigo('PRESUPUESTO_ENVIADO');

    db.prepare(`
      UPDATE tickets
      SET estado_id = ?,
          presupuesto_enviado = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE uuid = ?
    `).run(estadoPresupuesto.id, uuid);

    return presupuesto;
  });

  return trx();
},

generarMovimientoCaja(uuid) {
  return generarMovimientoCajaInterno(uuid);
},

cerrarMovimientoCaja(uuid) {
  return cerrarMovimientoCajaInterno(uuid);
}


};


