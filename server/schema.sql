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
  codigo TEXT UNIQUE,
  numero INTEGER,
  tecnico_codigo TEXT,
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
  reparacion_presupuestada TEXT,
  presupuesto_enviado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS codigo TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS numero INTEGER;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS tecnico_codigo TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS reparacion_presupuestada TEXT;

WITH base AS (
  SELECT
    t.id,
    s.id AS sucursal_id,
    COALESCE(
      NULLIF(regexp_replace(upper(t.tecnico_codigo), '[^A-Z0-9]+', '', 'g'), ''),
      'MIGRADO'
    ) AS tecnico,
    COALESCE(
      NULLIF(regexp_replace(upper(s.codigo), '[^A-Z0-9]+', '', 'g'), ''),
      'SINCODIGO'
    ) AS sucursal_codigo
  FROM tickets t
  JOIN sucursales s ON s.id = t.sucursal_origen_id
  WHERE t.codigo IS NULL
),
maximos AS (
  SELECT
    COALESCE(
      NULLIF(regexp_replace(upper(t.tecnico_codigo), '[^A-Z0-9]+', '', 'g'), ''),
      'MIGRADO'
    ) AS tecnico,
    t.sucursal_origen_id AS sucursal_id,
    COALESCE(MAX(t.numero), 0) AS max_numero
  FROM tickets t
  WHERE t.codigo IS NOT NULL
  GROUP BY 1, 2
),
numerados AS (
  SELECT
    b.*,
    COALESCE(m.max_numero, 0) + ROW_NUMBER() OVER (
      PARTITION BY b.tecnico, b.sucursal_id
      ORDER BY b.id
    ) AS nuevo_numero
  FROM base b
  LEFT JOIN maximos m
    ON m.tecnico = b.tecnico
   AND m.sucursal_id = b.sucursal_id
)
UPDATE tickets t
SET tecnico_codigo = n.tecnico,
    numero = n.nuevo_numero,
    codigo = n.tecnico || '-' || n.sucursal_codigo || '-' || LPAD(n.nuevo_numero::TEXT, 6, '0')
FROM numerados n
WHERE t.id = n.id;

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
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_codigo_unique ON tickets(codigo) WHERE codigo IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_tecnico_sucursal_numero ON tickets(tecnico_codigo, sucursal_origen_id, numero);
CREATE INDEX IF NOT EXISTS idx_derivaciones_ticket_uuid ON derivaciones_ticket(ticket_uuid);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_estado ON movimientos_caja(estado);
CREATE INDEX IF NOT EXISTS idx_devoluciones_caja_fecha ON devoluciones_caja(fecha);
CREATE INDEX IF NOT EXISTS idx_comprobantes_x_fecha ON comprobantes_x(fecha);

INSERT INTO estados_ticket (codigo, descripcion, orden)
VALUES
  ('PENDIENTE', 'Pendiente', 1),
  ('PRESUPUESTO_ENVIADO', 'Presupuesto enviado', 2),
  ('PRESUPUESTO_RECHAZADO', 'Presupuesto rechazado', 3),
  ('EN_REPARACION', 'En reparacion', 4),
  ('LISTO', 'Listo para entregar', 5),
  ('ENTREGADO', 'Entregado', 6),
  ('DEVUELTO_SIN_REPARAR', 'Devuelto sin reparar', 7),
  ('RETIRADO_SIN_REPARAR', 'Retirado sin reparar', 8)
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    orden = EXCLUDED.orden,
    is_deleted = FALSE;
