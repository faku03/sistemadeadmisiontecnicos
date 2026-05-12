CREATE TABLE IF NOT EXISTS license_groups (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS license_units (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES license_groups(id),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'SUCURSAL',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE (group_id, codigo)
);

CREATE TABLE IF NOT EXISTS licenses (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES license_groups(id),
  unit_id INTEGER NOT NULL REFERENCES license_units(id),
  license_key TEXT,
  license_key_hash TEXT NOT NULL UNIQUE,
  license_key_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  plan TEXT NOT NULL DEFAULT 'STANDARD',
  machine_id TEXT,
  grace_days INTEGER NOT NULL DEFAULT 7,
  expires_at TIMESTAMPTZ NOT NULL,
  features JSONB NOT NULL DEFAULT '{"tickets": true, "caja": true, "derivaciones": true}'::jsonb,
  activated_at TIMESTAMPTZ,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE licenses
  ADD COLUMN IF NOT EXISTS license_key TEXT;

CREATE TABLE IF NOT EXISTS license_validations (
  id SERIAL PRIMARY KEY,
  license_id INTEGER REFERENCES licenses(id),
  machine_id TEXT NOT NULL,
  app_name TEXT,
  app_version TEXT,
  ip_address TEXT,
  result TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_unit ON licenses(unit_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_license_validations_license ON license_validations(license_id);
CREATE INDEX IF NOT EXISTS idx_license_validations_created ON license_validations(created_at);
