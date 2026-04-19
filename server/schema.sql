CREATE TABLE IF NOT EXISTS sucursales (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  sucursal_local BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  dni TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  celular TEXT,
  email TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tipos_equipo (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS marcas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS modelos (
  id SERIAL PRIMARY KEY,
  marca_id INTEGER NOT NULL REFERENCES marcas(id),
  tipo_equipo_id INTEGER REFERENCES tipos_equipo(id),
  nombre TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE (marca_id, nombre)
);

CREATE TABLE IF NOT EXISTS estados_ticket (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  uuid TEXT NOT NULL UNIQUE,
  sucursal_origen_id INTEGER NOT NULL REFERENCES sucursales(id),
  sucursal_actual_id INTEGER NOT NULL REFERENCES sucursales(id),
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  tipo_equipo_id INTEGER NOT NULL REFERENCES tipos_equipo(id),
  modelo_id INTEGER NOT NULL REFERENCES modelos(id),
  descripcion_falla TEXT NOT NULL,
  trabajo_realizado TEXT,
  estado_id INTEGER NOT NULL REFERENCES estados_ticket(id),
  fecha_ingreso TIMESTAMPTZ DEFAULT NOW(),
  fecha_entrega TIMESTAMPTZ,
  garantia_dias INTEGER,
  valor_reparacion NUMERIC(12, 2) DEFAULT 0,
  sena NUMERIC(12, 2) DEFAULT 0,
  presupuesto_enviado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS derivaciones_ticket (
  id SERIAL PRIMARY KEY,
  ticket_uuid TEXT NOT NULL REFERENCES tickets(uuid),
  sucursal_origen_id INTEGER NOT NULL REFERENCES sucursales(id),
  sucursal_destino_id INTEGER NOT NULL REFERENCES sucursales(id),
  fecha_envio TIMESTAMPTZ DEFAULT NOW(),
  fecha_recepcion TIMESTAMPTZ,
  estado TEXT DEFAULT 'ENVIADO',
  observacion TEXT
);

CREATE TABLE IF NOT EXISTS movimientos_caja (
  id SERIAL PRIMARY KEY,
  ticket_uuid TEXT NOT NULL UNIQUE REFERENCES tickets(uuid),
  sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  importe_total NUMERIC(12, 2) NOT NULL,
  sena NUMERIC(12, 2) DEFAULT 0,
  saldo NUMERIC(12, 2) NOT NULL,
  estado TEXT DEFAULT 'PENDIENTE_COBRO',
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_cobro TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS devoluciones_caja (
  id SERIAL PRIMARY KEY,
  movimiento_id INTEGER NOT NULL REFERENCES movimientos_caja(id),
  ticket_uuid TEXT NOT NULL REFERENCES tickets(uuid),
  importe NUMERIC(12, 2) NOT NULL,
  motivo TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comprobantes_x (
  id SERIAL PRIMARY KEY,
  movimiento_id INTEGER NOT NULL UNIQUE REFERENCES movimientos_caja(id),
  ticket_uuid TEXT NOT NULL REFERENCES tickets(uuid),
  numero INTEGER NOT NULL UNIQUE,
  importe NUMERIC(12, 2) NOT NULL,
  pdf_path TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_sucursal_actual ON tickets(sucursal_actual_id);
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets(estado_id);
CREATE INDEX IF NOT EXISTS idx_derivaciones_ticket_uuid ON derivaciones_ticket(ticket_uuid);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_estado ON movimientos_caja(estado);
CREATE INDEX IF NOT EXISTS idx_devoluciones_caja_fecha ON devoluciones_caja(fecha);
CREATE INDEX IF NOT EXISTS idx_comprobantes_x_fecha ON comprobantes_x(fecha);

INSERT INTO estados_ticket (codigo, descripcion, orden)
VALUES
  ('PENDIENTE', 'Pendiente', 1),
  ('PRESUPUESTO_ENVIADO', 'Presupuesto enviado', 2),
  ('EN_REPARACION', 'En reparacion', 3),
  ('LISTO', 'Listo para entregar', 4),
  ('ENTREGADO', 'Entregado', 5),
  ('DEVUELTO_SIN_REPARAR', 'Devuelto sin reparar', 6)
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    orden = EXCLUDED.orden,
    is_deleted = FALSE;
