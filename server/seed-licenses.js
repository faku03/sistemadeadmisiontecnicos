const { pool } = require('./db');
const { hashLicenseKey, maskLicenseKey } = require('./licenses');

const devLicenseKey = process.env.SISTEMA_TICKETS_DEV_LICENSE_KEY || 'ABCD-1234-EFGH';

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const group = await client.query(
      `
      INSERT INTO license_groups (codigo, nombre)
      VALUES ('DEV-GROUP', 'Grupo de desarrollo')
      ON CONFLICT (codigo) DO UPDATE
      SET nombre = EXCLUDED.nombre,
          is_active = TRUE,
          updated_at = NOW()
      RETURNING id
      `
    );

    const unit = await client.query(
      `
      INSERT INTO license_units (group_id, codigo, nombre, tipo)
      VALUES ($1, 'DEV-UNIT', 'Sucursal desarrollo', 'SUCURSAL')
      ON CONFLICT (group_id, codigo) DO UPDATE
      SET nombre = EXCLUDED.nombre,
          tipo = EXCLUDED.tipo,
          is_active = TRUE,
          updated_at = NOW()
      RETURNING id
      `,
      [group.rows[0].id]
    );

    await client.query(
      `
      INSERT INTO licenses (
        group_id,
        unit_id,
        license_key,
        license_key_hash,
        license_key_label,
        status,
        plan,
        grace_days,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, 'ACTIVE', 'STANDARD', 7, NOW() + INTERVAL '30 days')
      ON CONFLICT (license_key_hash) DO UPDATE
      SET license_key = EXCLUDED.license_key,
          license_key_label = EXCLUDED.license_key_label,
          status = 'ACTIVE',
          expires_at = GREATEST(licenses.expires_at, NOW() + INTERVAL '30 days'),
          machine_id = NULL,
          activated_at = NULL,
          updated_at = NOW()
      `,
      [
        group.rows[0].id,
        unit.rows[0].id,
        devLicenseKey,
        hashLicenseKey(devLicenseKey),
        maskLicenseKey(devLicenseKey)
      ]
    );

    await client.query('COMMIT');
    console.log(`Licencia dev OK: ${devLicenseKey}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
