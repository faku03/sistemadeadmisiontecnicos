const { randomBytes } = require('crypto');
const { query, withTransaction } = require('./db');
const {
  hashLicenseKey,
  hasAdminAccess,
  maskLicenseKey,
  validateLicenseKeyFormat
} = require('./licenses');

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function required(value, fieldName) {
  const text = String(value || '').trim();

  if (!text) {
    throw new Error(`${fieldName} es obligatorio`);
  }

  return text;
}

function boolFromData(value, fallback = true) {
  return value === undefined ? fallback : Boolean(value);
}

function addDays(days) {
  return new Date(Date.now() + (Number(days || 30) * DAY_MS));
}

function generateLicenseKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const raw = Array.from(randomBytes(12), byte => alphabet[byte % alphabet.length]).join('');
  return raw.match(/.{1,4}/g).join('-');
}

async function listGroups() {
  const result = await query(`
    SELECT *
    FROM license_groups
    ORDER BY codigo
  `);

  return result.rows;
}

async function createGroup(data) {
  const codigo = normalizeCode(required(data.codigo, 'codigo'));
  const nombre = required(data.nombre, 'nombre');

  const result = await query(
    `
    INSERT INTO license_groups (codigo, nombre, is_active)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [codigo, nombre, boolFromData(data.is_active)]
  );

  return result.rows[0];
}

async function updateGroup(id, data) {
  const result = await query(
    `
    UPDATE license_groups
    SET codigo = $1,
        nombre = $2,
        is_active = $3,
        updated_at = NOW()
    WHERE id = $4
    RETURNING *
    `,
    [
      normalizeCode(required(data.codigo, 'codigo')),
      required(data.nombre, 'nombre'),
      boolFromData(data.is_active),
      id
    ]
  );

  if (result.rowCount === 0) {
    throw new Error('Grupo no encontrado');
  }

  return result.rows[0];
}

async function setGroupActive(id, isActive) {
  const result = await query(
    `
    UPDATE license_groups
    SET is_active = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [isActive, id]
  );

  if (result.rowCount === 0) {
    throw new Error('Grupo no encontrado');
  }

  return result.rows[0];
}

async function listUnits() {
  const result = await query(`
    SELECT
      u.*,
      g.codigo AS group_code,
      g.nombre AS group_name
    FROM license_units u
    JOIN license_groups g ON g.id = u.group_id
    ORDER BY g.codigo, u.codigo
  `);

  return result.rows;
}

async function createUnit(data) {
  const result = await query(
    `
    INSERT INTO license_units (group_id, codigo, nombre, tipo, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      data.group_id,
      normalizeCode(required(data.codigo, 'codigo')),
      required(data.nombre, 'nombre'),
      normalizeCode(data.tipo || 'SUCURSAL'),
      boolFromData(data.is_active)
    ]
  );

  return result.rows[0];
}

async function updateUnit(id, data) {
  const result = await query(
    `
    UPDATE license_units
    SET group_id = $1,
        codigo = $2,
        nombre = $3,
        tipo = $4,
        is_active = $5,
        updated_at = NOW()
    WHERE id = $6
    RETURNING *
    `,
    [
      data.group_id,
      normalizeCode(required(data.codigo, 'codigo')),
      required(data.nombre, 'nombre'),
      normalizeCode(data.tipo || 'SUCURSAL'),
      boolFromData(data.is_active),
      id
    ]
  );

  if (result.rowCount === 0) {
    throw new Error('Unidad no encontrada');
  }

  return result.rows[0];
}

async function setUnitActive(id, isActive) {
  const result = await query(
    `
    UPDATE license_units
    SET is_active = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [isActive, id]
  );

  if (result.rowCount === 0) {
    throw new Error('Unidad no encontrada');
  }

  return result.rows[0];
}

async function listLicenses() {
  const result = await query(`
    SELECT
      l.id,
      l.license_key,
      l.license_key_label,
      l.status,
      l.plan,
      l.machine_id,
      l.grace_days,
      l.expires_at,
      l.features,
      l.activated_at,
      l.last_validated_at,
      l.created_at,
      g.id AS group_id,
      g.codigo AS group_code,
      g.nombre AS group_name,
      u.id AS unit_id,
      u.codigo AS unit_code,
      u.nombre AS unit_name,
      u.tipo AS unit_type
    FROM licenses l
    JOIN license_groups g ON g.id = l.group_id
    JOIN license_units u ON u.id = l.unit_id
    ORDER BY g.codigo, u.codigo, l.id
  `);

  return result.rows;
}

async function createLicense(data) {
  const licenseKey = normalizeCode(data.license_key || generateLicenseKey());
  validateLicenseKeyFormat(licenseKey);

  const expiresAt = data.expires_at
    ? new Date(data.expires_at)
    : addDays(data.valid_days || 30);

  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error('Fecha de vencimiento invalida');
  }

  return withTransaction(async client => {
    const unit = await client.query(
      `SELECT group_id FROM license_units WHERE id = $1`,
      [data.unit_id]
    );

    if (unit.rowCount === 0) {
      throw new Error('Unidad no encontrada');
    }

    const groupId = data.group_id || unit.rows[0].group_id;

    if (Number(groupId) !== Number(unit.rows[0].group_id)) {
      throw new Error('La unidad no pertenece al grupo indicado');
    }

    const result = await client.query(
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
        expires_at,
        features
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
      RETURNING *
      `,
      [
        groupId,
        data.unit_id,
        licenseKey,
        hashLicenseKey(licenseKey),
        maskLicenseKey(licenseKey),
        normalizeCode(data.status || 'ACTIVE'),
        normalizeCode(data.plan || 'STANDARD'),
        Number(data.grace_days || 7),
        expiresAt.toISOString(),
        JSON.stringify(data.features || { tickets: true, caja: true, derivaciones: true })
      ]
    );

    return {
      ...result.rows[0],
      license_key: licenseKey
    };
  });
}

async function updateLicense(id, data) {
  const result = await query(
    `
    UPDATE licenses
    SET status = $1,
        plan = $2,
        grace_days = $3,
        expires_at = $4,
        features = $5::jsonb,
        updated_at = NOW()
    WHERE id = $6
    RETURNING *
    `,
    [
      normalizeCode(data.status || 'ACTIVE'),
      normalizeCode(data.plan || 'STANDARD'),
      Number(data.grace_days || 7),
      new Date(required(data.expires_at, 'expires_at')).toISOString(),
      JSON.stringify(data.features || { tickets: true, caja: true, derivaciones: true }),
      id
    ]
  );

  if (result.rowCount === 0) {
    throw new Error('Licencia no encontrada');
  }

  return result.rows[0];
}

async function setLicenseStatus(id, status) {
  const result = await query(
    `
    UPDATE licenses
    SET status = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING *
    `,
    [status, id]
  );

  if (result.rowCount === 0) {
    throw new Error('Licencia no encontrada');
  }

  return result.rows[0];
}

async function releaseLicenseMachine(id) {
  const result = await query(
    `
    UPDATE licenses
    SET machine_id = NULL,
        activated_at = NULL,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );

  if (result.rowCount === 0) {
    throw new Error('Licencia no encontrada');
  }

  return result.rows[0];
}

async function listValidations(url) {
  const licenseId = url.searchParams.get('license_id');
  const params = [];
  const where = licenseId ? 'WHERE lv.license_id = $1' : '';

  if (licenseId) {
    params.push(licenseId);
  }

  const result = await query(
    `
    SELECT
      lv.*,
      l.license_key_label,
      g.codigo AS group_code,
      u.codigo AS unit_code
    FROM license_validations lv
    LEFT JOIN licenses l ON l.id = lv.license_id
    LEFT JOIN license_groups g ON g.id = l.group_id
    LEFT JOIN license_units u ON u.id = l.unit_id
    ${where}
    ORDER BY lv.created_at DESC
    LIMIT 200
    `,
    params
  );

  return result.rows;
}

async function handleLicenseAdminRoute({ method, path, url, req, res, sendJson, readJson }) {
  if (!path.startsWith('/admin/')) {
    return false;
  }

  if (!hasAdminAccess(req)) {
    sendJson(res, 401, { error: 'No autorizado' });
    return true;
  }

  if (method === 'GET' && path === '/admin/license-groups') {
    sendJson(res, 200, await listGroups());
    return true;
  }

  if (method === 'POST' && path === '/admin/license-groups') {
    sendJson(res, 201, await createGroup(await readJson(req)));
    return true;
  }

  const groupMatch = path.match(/^\/admin\/license-groups\/(\d+)\/?(deactivate|reactivate)?$/);

  if (groupMatch && method === 'PUT' && !groupMatch[2]) {
    sendJson(res, 200, await updateGroup(groupMatch[1], await readJson(req)));
    return true;
  }

  if (groupMatch && method === 'POST' && groupMatch[2] === 'deactivate') {
    sendJson(res, 200, await setGroupActive(groupMatch[1], false));
    return true;
  }

  if (groupMatch && method === 'POST' && groupMatch[2] === 'reactivate') {
    sendJson(res, 200, await setGroupActive(groupMatch[1], true));
    return true;
  }

  if (method === 'GET' && path === '/admin/license-units') {
    sendJson(res, 200, await listUnits());
    return true;
  }

  if (method === 'POST' && path === '/admin/license-units') {
    sendJson(res, 201, await createUnit(await readJson(req)));
    return true;
  }

  const unitMatch = path.match(/^\/admin\/license-units\/(\d+)\/?(deactivate|reactivate)?$/);

  if (unitMatch && method === 'PUT' && !unitMatch[2]) {
    sendJson(res, 200, await updateUnit(unitMatch[1], await readJson(req)));
    return true;
  }

  if (unitMatch && method === 'POST' && unitMatch[2] === 'deactivate') {
    sendJson(res, 200, await setUnitActive(unitMatch[1], false));
    return true;
  }

  if (unitMatch && method === 'POST' && unitMatch[2] === 'reactivate') {
    sendJson(res, 200, await setUnitActive(unitMatch[1], true));
    return true;
  }

  if (method === 'GET' && path === '/admin/licenses') {
    sendJson(res, 200, await listLicenses());
    return true;
  }

  if (method === 'POST' && path === '/admin/licenses') {
    sendJson(res, 201, await createLicense(await readJson(req)));
    return true;
  }

  const licenseMatch = path.match(/^\/admin\/licenses\/(\d+)\/?(suspend|activate|release-machine)?$/);

  if (licenseMatch && method === 'PUT' && !licenseMatch[2]) {
    sendJson(res, 200, await updateLicense(licenseMatch[1], await readJson(req)));
    return true;
  }

  if (licenseMatch && method === 'POST' && licenseMatch[2] === 'suspend') {
    sendJson(res, 200, await setLicenseStatus(licenseMatch[1], 'SUSPENDED'));
    return true;
  }

  if (licenseMatch && method === 'POST' && licenseMatch[2] === 'activate') {
    sendJson(res, 200, await setLicenseStatus(licenseMatch[1], 'ACTIVE'));
    return true;
  }

  if (licenseMatch && method === 'POST' && licenseMatch[2] === 'release-machine') {
    sendJson(res, 200, await releaseLicenseMachine(licenseMatch[1]));
    return true;
  }

  if (method === 'GET' && path === '/admin/license-validations') {
    sendJson(res, 200, await listValidations(url));
    return true;
  }

  return false;
}

module.exports = {
  createGroup,
  createLicense,
  createUnit,
  handleLicenseAdminRoute,
  listGroups,
  listLicenses,
  listUnits
};
