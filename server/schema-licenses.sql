CREATE TABLE IF NOT EXISTS license_groups (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tax_id TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  locality TEXT,
  province TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE license_groups
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS locality TEXT,
  ADD COLUMN IF NOT EXISTS province TEXT;

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
  ADD COLUMN IF NOT EXISTS license_key TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS subscription_reference TEXT,
  ADD COLUMN IF NOT EXISTS billing_period TEXT NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_payment_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_notes TEXT;

CREATE TABLE IF NOT EXISTS license_payments (
  id SERIAL PRIMARY KEY,
  license_id INTEGER NOT NULL REFERENCES licenses(id),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ARS',
  payment_method TEXT NOT NULL DEFAULT 'MANUAL',
  payment_reference TEXT,
  period_start DATE,
  period_end DATE,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_licenses_next_payment_due ON licenses(next_payment_due_at);
CREATE INDEX IF NOT EXISTS idx_license_validations_license ON license_validations(license_id);
CREATE INDEX IF NOT EXISTS idx_license_validations_created ON license_validations(created_at);
CREATE INDEX IF NOT EXISTS idx_license_payments_license ON license_payments(license_id);
CREATE INDEX IF NOT EXISTS idx_license_payments_paid_at ON license_payments(paid_at);
