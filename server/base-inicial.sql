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
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS usuario_creador_id INTEGER;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS usuario_creador_username TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS usuario_creador_nombre TEXT;

CREATE TABLE IF NOT EXISTS fallas_oficiales (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS trabajos_oficiales (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS repuestos_oficiales (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS fallas_internas (
  id SERIAL PRIMARY KEY,
  descripcion TEXT NOT NULL,
  falla_oficial_id INTEGER REFERENCES fallas_oficiales(id),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS trabajos_internos (
  id SERIAL PRIMARY KEY,
  descripcion TEXT NOT NULL,
  trabajo_oficial_id INTEGER REFERENCES trabajos_oficiales(id),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS repuestos_internos (
  id SERIAL PRIMARY KEY,
  descripcion TEXT NOT NULL,
  repuesto_oficial_id INTEGER REFERENCES repuestos_oficiales(id),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ticket_fallas (
  id SERIAL PRIMARY KEY,
  ticket_uuid TEXT NOT NULL REFERENCES tickets(uuid) ON DELETE CASCADE,
  falla_oficial_id INTEGER REFERENCES fallas_oficiales(id),
  falla_interna_id INTEGER REFERENCES fallas_internas(id),
  detalle TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ticket_fallas_origen_check CHECK (
    (falla_oficial_id IS NOT NULL AND falla_interna_id IS NULL)
    OR
    (falla_oficial_id IS NULL AND falla_interna_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS ticket_trabajos (
  id SERIAL PRIMARY KEY,
  ticket_uuid TEXT NOT NULL REFERENCES tickets(uuid) ON DELETE CASCADE,
  trabajo_oficial_id INTEGER REFERENCES trabajos_oficiales(id),
  trabajo_interno_id INTEGER REFERENCES trabajos_internos(id),
  detalle TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ticket_trabajos_origen_check CHECK (
    (trabajo_oficial_id IS NOT NULL AND trabajo_interno_id IS NULL)
    OR
    (trabajo_oficial_id IS NULL AND trabajo_interno_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS ticket_repuestos (
  id SERIAL PRIMARY KEY,
  ticket_uuid TEXT NOT NULL REFERENCES tickets(uuid) ON DELETE CASCADE,
  repuesto_oficial_id INTEGER REFERENCES repuestos_oficiales(id),
  repuesto_interno_id INTEGER REFERENCES repuestos_internos(id),
  cantidad NUMERIC(12, 2) DEFAULT 1,
  detalle TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ticket_repuestos_origen_check CHECK (
    (repuesto_oficial_id IS NOT NULL AND repuesto_interno_id IS NULL)
    OR
    (repuesto_oficial_id IS NULL AND repuesto_interno_id IS NOT NULL)
  ),
  CONSTRAINT ticket_repuestos_cantidad_check CHECK (cantidad IS NULL OR cantidad > 0)
);

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

CREATE TABLE IF NOT EXISTS ticket_historial (
  id SERIAL PRIMARY KEY,
  ticket_uuid TEXT NOT NULL REFERENCES tickets(uuid),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  detalle TEXT,
  estado_origen_id INTEGER REFERENCES estados_ticket(id),
  estado_destino_id INTEGER REFERENCES estados_ticket(id),
  metadata JSONB DEFAULT '{}'::jsonb
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
CREATE INDEX IF NOT EXISTS idx_fallas_oficiales_activo ON fallas_oficiales(activo);
CREATE INDEX IF NOT EXISTS idx_trabajos_oficiales_activo ON trabajos_oficiales(activo);
CREATE INDEX IF NOT EXISTS idx_repuestos_oficiales_activo ON repuestos_oficiales(activo);
CREATE INDEX IF NOT EXISTS idx_fallas_internas_oficial ON fallas_internas(falla_oficial_id);
CREATE INDEX IF NOT EXISTS idx_trabajos_internos_oficial ON trabajos_internos(trabajo_oficial_id);
CREATE INDEX IF NOT EXISTS idx_repuestos_internos_oficial ON repuestos_internos(repuesto_oficial_id);
CREATE INDEX IF NOT EXISTS idx_ticket_fallas_ticket ON ticket_fallas(ticket_uuid);
CREATE INDEX IF NOT EXISTS idx_ticket_fallas_oficial ON ticket_fallas(falla_oficial_id);
CREATE INDEX IF NOT EXISTS idx_ticket_fallas_interna ON ticket_fallas(falla_interna_id);
CREATE INDEX IF NOT EXISTS idx_ticket_trabajos_ticket ON ticket_trabajos(ticket_uuid);
CREATE INDEX IF NOT EXISTS idx_ticket_trabajos_oficial ON ticket_trabajos(trabajo_oficial_id);
CREATE INDEX IF NOT EXISTS idx_ticket_trabajos_interno ON ticket_trabajos(trabajo_interno_id);
CREATE INDEX IF NOT EXISTS idx_ticket_repuestos_ticket ON ticket_repuestos(ticket_uuid);
CREATE INDEX IF NOT EXISTS idx_ticket_repuestos_oficial ON ticket_repuestos(repuesto_oficial_id);
CREATE INDEX IF NOT EXISTS idx_ticket_repuestos_interno ON ticket_repuestos(repuesto_interno_id);
CREATE INDEX IF NOT EXISTS idx_derivaciones_ticket_uuid ON derivaciones_ticket(ticket_uuid);
CREATE INDEX IF NOT EXISTS idx_ticket_historial_ticket_fecha ON ticket_historial(ticket_uuid, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja_estado ON movimientos_caja(estado);
CREATE INDEX IF NOT EXISTS idx_devoluciones_caja_fecha ON devoluciones_caja(fecha);
CREATE INDEX IF NOT EXISTS idx_comprobantes_x_fecha ON comprobantes_x(fecha);

INSERT INTO tipos_equipo (codigo, descripcion)
VALUES
  ('CEL', 'Celular'),
  ('TAB', 'Tablet'),
  ('NOTE', 'Notebook'),
  ('PC', 'PC de escritorio'),
  ('CONS', 'Consola de videojuegos'),
  ('TV', 'Smart TV / TV LED'),
  ('RELOJ', 'Smartwatch'),
  ('IMP', 'Impresora'),
  ('MON', 'Monitor'),
  ('ACC', 'Accesorio / periferico')
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    is_deleted = FALSE,
    updated_at = NOW();

INSERT INTO marcas (nombre)
VALUES
  ('Samsung'),
  ('Motorola'),
  ('Apple'),
  ('Xiaomi'),
  ('Huawei'),
  ('LG'),
  ('Sony'),
  ('Lenovo'),
  ('HP'),
  ('Dell'),
  ('Asus'),
  ('Acer'),
  ('Bangho'),
  ('Epson'),
  ('Brother'),
  ('Canon'),
  ('Noblex'),
  ('TCL'),
  ('Philips'),
  ('Hisense'),
  ('Microsoft'),
  ('Nintendo'),
  ('JBL'),
  ('Generico')
ON CONFLICT (nombre) DO UPDATE
SET is_deleted = FALSE,
    updated_at = NOW();

WITH modelo_seed (marca, tipo_codigo, modelo) AS (
  VALUES
    ('Samsung', 'CEL', 'Galaxy A03'),
    ('Samsung', 'CEL', 'Galaxy A04'),
    ('Samsung', 'CEL', 'Galaxy A05'),
    ('Samsung', 'CEL', 'Galaxy A12'),
    ('Samsung', 'CEL', 'Galaxy A13'),
    ('Samsung', 'CEL', 'Galaxy A14'),
    ('Samsung', 'CEL', 'Galaxy A15'),
    ('Samsung', 'CEL', 'Galaxy A22'),
    ('Samsung', 'CEL', 'Galaxy A23'),
    ('Samsung', 'CEL', 'Galaxy A32'),
    ('Samsung', 'CEL', 'Galaxy A33'),
    ('Samsung', 'CEL', 'Galaxy A52'),
    ('Samsung', 'CEL', 'Galaxy A53'),
    ('Samsung', 'CEL', 'Galaxy S20'),
    ('Samsung', 'CEL', 'Galaxy S21'),
    ('Samsung', 'TAB', 'Galaxy Tab A7'),
    ('Samsung', 'TAB', 'Galaxy Tab A8'),
    ('Motorola', 'CEL', 'Moto E13'),
    ('Motorola', 'CEL', 'Moto E20'),
    ('Motorola', 'CEL', 'Moto E22'),
    ('Motorola', 'CEL', 'Moto G20'),
    ('Motorola', 'CEL', 'Moto G22'),
    ('Motorola', 'CEL', 'Moto G32'),
    ('Motorola', 'CEL', 'Moto G42'),
    ('Motorola', 'CEL', 'Moto G52'),
    ('Motorola', 'CEL', 'Moto G60'),
    ('Motorola', 'CEL', 'Moto G71'),
    ('Apple', 'CEL', 'iPhone 7'),
    ('Apple', 'CEL', 'iPhone 8'),
    ('Apple', 'CEL', 'iPhone X'),
    ('Apple', 'CEL', 'iPhone XR'),
    ('Apple', 'CEL', 'iPhone 11'),
    ('Apple', 'CEL', 'iPhone 12'),
    ('Apple', 'CEL', 'iPhone 13'),
    ('Apple', 'CEL', 'iPhone 14'),
    ('Apple', 'TAB', 'iPad 9th Gen'),
    ('Apple', 'NOTE', 'MacBook Air'),
    ('Xiaomi', 'CEL', 'Redmi 9'),
    ('Xiaomi', 'CEL', 'Redmi 9A'),
    ('Xiaomi', 'CEL', 'Redmi 10'),
    ('Xiaomi', 'CEL', 'Redmi 10C'),
    ('Xiaomi', 'CEL', 'Redmi Note 10'),
    ('Xiaomi', 'CEL', 'Redmi Note 11'),
    ('Xiaomi', 'CEL', 'Redmi Note 12'),
    ('Huawei', 'CEL', 'P Smart'),
    ('Huawei', 'CEL', 'Y6'),
    ('Huawei', 'CEL', 'Y9'),
    ('LG', 'TV', '32LM'),
    ('LG', 'TV', '43LM'),
    ('LG', 'TV', '55UN'),
    ('Sony', 'CONS', 'PlayStation 4'),
    ('Sony', 'CONS', 'PlayStation 5'),
    ('Microsoft', 'CONS', 'Xbox One'),
    ('Microsoft', 'CONS', 'Xbox Series S'),
    ('Nintendo', 'CONS', 'Switch'),
    ('Lenovo', 'NOTE', 'IdeaPad 3'),
    ('Lenovo', 'NOTE', 'ThinkPad E14'),
    ('HP', 'NOTE', 'Pavilion 15'),
    ('HP', 'NOTE', '15-DW'),
    ('Dell', 'NOTE', 'Inspiron 15'),
    ('Asus', 'NOTE', 'VivoBook 15'),
    ('Acer', 'NOTE', 'Aspire 5'),
    ('Bangho', 'NOTE', 'Max L5'),
    ('Epson', 'IMP', 'EcoTank L3150'),
    ('Epson', 'IMP', 'EcoTank L3250'),
    ('Brother', 'IMP', 'DCP-T520W'),
    ('Canon', 'IMP', 'G3110'),
    ('Noblex', 'TV', '32 LED'),
    ('TCL', 'TV', '43 Smart'),
    ('Philips', 'TV', '50 Smart'),
    ('Hisense', 'TV', '43 Smart'),
    ('JBL', 'ACC', 'Parlante Bluetooth'),
    ('Generico', 'PC', 'PC armado'),
    ('Generico', 'MON', 'Monitor LED'),
    ('Generico', 'RELOJ', 'Smartwatch generico'),
    ('Generico', 'ACC', 'Cargador'),
    ('Generico', 'ACC', 'Auriculares')
)
INSERT INTO modelos (marca_id, tipo_equipo_id, nombre)
SELECT ma.id, te.id, ms.modelo
FROM modelo_seed ms
JOIN marcas ma ON ma.nombre = ms.marca
JOIN tipos_equipo te ON te.codigo = ms.tipo_codigo
ON CONFLICT (marca_id, nombre) DO UPDATE
SET tipo_equipo_id = EXCLUDED.tipo_equipo_id,
    is_deleted = FALSE,
    updated_at = NOW();

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

INSERT INTO fallas_oficiales (codigo, descripcion, activo, updated_at)
VALUES
  ('F0001', 'No enciende', TRUE, NOW()),
  ('F0002', 'No carga', TRUE, NOW()),
  ('F0003', 'Pantalla rota o astillada', TRUE, NOW()),
  ('F0004', 'Modulo sin imagen', TRUE, NOW()),
  ('F0005', 'Imagen con manchas o lineas', TRUE, NOW()),
  ('F0006', 'Falla de placa de carga', TRUE, NOW()),
  ('F0007', 'Pin de carga flojo o roto', TRUE, NOW()),
  ('F0008', 'Bateria agotada o hinchada', TRUE, NOW()),
  ('F0009', 'Equipo mojado o con humedad', TRUE, NOW()),
  ('F0010', 'Microfono no funciona', TRUE, NOW()),
  ('F0011', 'Parlante no funciona o distorsiona', TRUE, NOW()),
  ('F0012', 'Auricular interno no funciona', TRUE, NOW()),
  ('F0013', 'Camara no abre o falla', TRUE, NOW()),
  ('F0014', 'No reconoce chip / SIM', TRUE, NOW()),
  ('F0015', 'No conecta WiFi', TRUE, NOW()),
  ('F0016', 'No conecta Bluetooth', TRUE, NOW()),
  ('F0017', 'Equipo se reinicia solo', TRUE, NOW()),
  ('F0018', 'Sistema lento o bloqueado', TRUE, NOW()),
  ('F0019', 'Boton de encendido trabado', TRUE, NOW()),
  ('F0020', 'Botones de volumen no funcionan', TRUE, NOW()),
  ('F0021', 'No vibra', TRUE, NOW()),
  ('F0022', 'Falla tactil / touch no responde', TRUE, NOW()),
  ('F0023', 'Conector o flex dañado', TRUE, NOW()),
  ('F0024', 'No imprime', TRUE, NOW()),
  ('F0025', 'Atasco de papel', TRUE, NOW()),
  ('F0026', 'Sin sonido', TRUE, NOW()),
  ('F0027', 'No da video', TRUE, NOW()),
  ('F0028', 'No inicia sistema operativo', TRUE, NOW()),
  ('F0029', 'Sobrecalentamiento', TRUE, NOW()),
  ('F0030', 'Falla intermitente', TRUE, NOW())
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo,
    updated_at = NOW();

INSERT INTO trabajos_oficiales (codigo, descripcion, activo, updated_at)
VALUES
  ('T0001', 'Cambio de modulo', TRUE, NOW()),
  ('T0002', 'Cambio de pantalla completa', TRUE, NOW()),
  ('T0003', 'Cambio de pin de carga', TRUE, NOW()),
  ('T0004', 'Cambio de placa de carga', TRUE, NOW()),
  ('T0005', 'Cambio de bateria', TRUE, NOW()),
  ('T0006', 'Cambio de microfono', TRUE, NOW()),
  ('T0007', 'Cambio de parlante', TRUE, NOW()),
  ('T0008', 'Cambio de auricular interno', TRUE, NOW()),
  ('T0009', 'Cambio de camara', TRUE, NOW()),
  ('T0010', 'Cambio de flex', TRUE, NOW()),
  ('T0011', 'Cambio de botones', TRUE, NOW()),
  ('T0012', 'Cambio de motor vibrador', TRUE, NOW()),
  ('T0013', 'Limpieza y mantenimiento', TRUE, NOW()),
  ('T0014', 'Secado quimico y limpieza interna', TRUE, NOW()),
  ('T0015', 'Reparacion de placa', TRUE, NOW()),
  ('T0016', 'Microsoldadura', TRUE, NOW()),
  ('T0017', 'Reinstalacion de software', TRUE, NOW()),
  ('T0018', 'Actualizacion de software', TRUE, NOW()),
  ('T0019', 'Backup y recuperacion de datos', TRUE, NOW()),
  ('T0020', 'Formateo y configuracion', TRUE, NOW()),
  ('T0021', 'Cambio de disco / SSD', TRUE, NOW()),
  ('T0022', 'Ampliacion de memoria RAM', TRUE, NOW()),
  ('T0023', 'Limpieza de sistema de refrigeracion', TRUE, NOW()),
  ('T0024', 'Cambio de pasta termica', TRUE, NOW()),
  ('T0025', 'Reparacion de bisagra', TRUE, NOW()),
  ('T0026', 'Reparacion de antena WiFi', TRUE, NOW()),
  ('T0027', 'Cambio de fuente', TRUE, NOW()),
  ('T0028', 'Desarme y diagnostico', TRUE, NOW()),
  ('T0029', 'Prueba funcional completa', TRUE, NOW()),
  ('T0030', 'Revision general', TRUE, NOW())
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo,
    updated_at = NOW();

INSERT INTO repuestos_oficiales (codigo, descripcion, activo, updated_at)
VALUES
  ('R0001', 'Modulo', TRUE, NOW()),
  ('R0002', 'Pantalla completa', TRUE, NOW()),
  ('R0003', 'Touch / tactil', TRUE, NOW()),
  ('R0004', 'Pin de carga', TRUE, NOW()),
  ('R0005', 'Placa de carga', TRUE, NOW()),
  ('R0006', 'Bateria', TRUE, NOW()),
  ('R0007', 'Microfono', TRUE, NOW()),
  ('R0008', 'Parlante', TRUE, NOW()),
  ('R0009', 'Auricular interno', TRUE, NOW()),
  ('R0010', 'Camara trasera', TRUE, NOW()),
  ('R0011', 'Camara frontal', TRUE, NOW()),
  ('R0012', 'Flex principal', TRUE, NOW()),
  ('R0013', 'Flex de encendido', TRUE, NOW()),
  ('R0014', 'Flex de volumen', TRUE, NOW()),
  ('R0015', 'Motor vibrador', TRUE, NOW()),
  ('R0016', 'Bandeja SIM', TRUE, NOW()),
  ('R0017', 'Conector FPC', TRUE, NOW()),
  ('R0018', 'Antena WiFi', TRUE, NOW()),
  ('R0019', 'Tapa trasera', TRUE, NOW()),
  ('R0020', 'Carcasa / marco', TRUE, NOW()),
  ('R0021', 'Fuente', TRUE, NOW()),
  ('R0022', 'Disco SSD', TRUE, NOW()),
  ('R0023', 'Memoria RAM', TRUE, NOW()),
  ('R0024', 'Teclado notebook', TRUE, NOW()),
  ('R0025', 'Bisagra notebook', TRUE, NOW()),
  ('R0026', 'Cooler / ventilador', TRUE, NOW()),
  ('R0027', 'Pasta termica', TRUE, NOW()),
  ('R0028', 'Rodillo impresora', TRUE, NOW()),
  ('R0029', 'Cabezal impresora', TRUE, NOW()),
  ('R0030', 'Cable flex display', TRUE, NOW())
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo,
    updated_at = NOW();

CREATE OR REPLACE VIEW estadistica_fallas AS
SELECT
  tf.ticket_uuid,
  COALESCE(fo_direct.codigo, fo_normalizada.codigo, 'INT-' || fi.id::TEXT) AS codigo,
  COALESCE(fo_direct.descripcion, fo_normalizada.descripcion, fi.descripcion) AS descripcion,
  CASE WHEN COALESCE(fo_direct.id, fo_normalizada.id) IS NULL THEN FALSE ELSE TRUE END AS normalizada,
  tf.created_at
FROM ticket_fallas tf
LEFT JOIN fallas_oficiales fo_direct ON fo_direct.id = tf.falla_oficial_id
LEFT JOIN fallas_internas fi ON fi.id = tf.falla_interna_id
LEFT JOIN fallas_oficiales fo_normalizada ON fo_normalizada.id = fi.falla_oficial_id;

CREATE OR REPLACE VIEW estadistica_trabajos AS
SELECT
  tt.ticket_uuid,
  COALESCE(to_direct.codigo, to_normalizado.codigo, 'INT-' || ti.id::TEXT) AS codigo,
  COALESCE(to_direct.descripcion, to_normalizado.descripcion, ti.descripcion) AS descripcion,
  CASE WHEN COALESCE(to_direct.id, to_normalizado.id) IS NULL THEN FALSE ELSE TRUE END AS normalizada,
  tt.created_at
FROM ticket_trabajos tt
LEFT JOIN trabajos_oficiales to_direct ON to_direct.id = tt.trabajo_oficial_id
LEFT JOIN trabajos_internos ti ON ti.id = tt.trabajo_interno_id
LEFT JOIN trabajos_oficiales to_normalizado ON to_normalizado.id = ti.trabajo_oficial_id;

CREATE OR REPLACE VIEW estadistica_repuestos AS
SELECT
  tr.ticket_uuid,
  COALESCE(ro_direct.codigo, ro_normalizado.codigo, 'INT-' || ri.id::TEXT) AS codigo,
  COALESCE(ro_direct.descripcion, ro_normalizado.descripcion, ri.descripcion) AS descripcion,
  tr.cantidad,
  CASE WHEN COALESCE(ro_direct.id, ro_normalizado.id) IS NULL THEN FALSE ELSE TRUE END AS normalizada,
  tr.created_at
FROM ticket_repuestos tr
LEFT JOIN repuestos_oficiales ro_direct ON ro_direct.id = tr.repuesto_oficial_id
LEFT JOIN repuestos_internos ri ON ri.id = tr.repuesto_interno_id
LEFT JOIN repuestos_oficiales ro_normalizado ON ro_normalizado.id = ri.repuesto_oficial_id;
