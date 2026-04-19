const { activateLicense, validateLicense } = require('../server/licenses');
const { pool } = require('../server/db');

async function main() {
  const licenseKey = process.env.SISTEMA_TICKETS_DEV_LICENSE_KEY || 'ABCD-1234-EFGH';
  const machineId = process.env.SISTEMA_TICKETS_SMOKE_MACHINE_ID || 'SMOKE-MACHINE-001';
  const payload = {
    license_key: licenseKey,
    machine_id: machineId,
    app_name: 'smoke-license-server',
    app_version: '1.0.0'
  };

  const activated = await activateLicense(payload);
  const validated = await validateLicense(payload);

  if (activated.status !== 'ACTIVE' || validated.status !== 'ACTIVE') {
    throw new Error('La licencia no quedo activa');
  }

  console.log(`Licencia OK - grupo: ${validated.groupId}, unidad: ${validated.unitId}, plan: ${validated.plan}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
