const {
  createGroup,
  createLicense,
  createUnit,
  listGroups,
  listLicenses,
  listUnits
} = require('../server/license-admin');
const { activateLicense } = require('../server/licenses');
const { pool } = require('../server/db');

async function main() {
  const suffix = Date.now().toString(36).toUpperCase();
  const group = await createGroup({
    codigo: `SMOKE-${suffix}`,
    nombre: `Grupo smoke ${suffix}`
  });

  const unit = await createUnit({
    group_id: group.id,
    codigo: `SUC-${suffix}`,
    nombre: `Sucursal smoke ${suffix}`,
    tipo: 'SUCURSAL'
  });

  const license = await createLicense({
    group_id: group.id,
    unit_id: unit.id,
    plan: 'STANDARD',
    valid_days: 30,
    grace_days: 7
  });

  const activated = await activateLicense({
    license_key: license.license_key,
    machine_id: `ADMIN-SMOKE-${suffix}`,
    app_name: 'smoke-license-admin',
    app_version: '1.0.0'
  });

  const [groups, units, licenses] = await Promise.all([
    listGroups(),
    listUnits(),
    listLicenses()
  ]);

  if (activated.status !== 'ACTIVE') {
    throw new Error('La licencia administrativa no pudo activarse');
  }

  console.log(
    `Admin OK - grupos: ${groups.length}, unidades: ${units.length}, licencias: ${licenses.length}, clave: ${license.license_key}`
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
