const { createHash } = require('crypto');
const { query, withTransaction } = require('./db');

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date, days) {
  return new Date(date.getTime() + (Number(days) * DAY_MS));
}

function normalizeKey(value) {
  return String(value || '').trim().toUpperCase();
}

function hashLicenseKey(licenseKey) {
  return createHash('sha256').update(normalizeKey(licenseKey)).digest('hex');
}

function maskLicenseKey(licenseKey) {
  const key = normalizeKey(licenseKey);
  const tail = key.slice(-4);
  return `****-****-${tail}`;
}

function validateLicenseKeyFormat(licenseKey) {
  if (!licenseKey) {
    throw new Error('Ingresa una clave de licencia');
  }

  if (!/^([A-Z0-9]{4,}-?){2,}$/.test(licenseKey)) {
    throw new Error('La clave de licencia no tiene un formato valido');
  }
}

function publicLicensePayload(row, licenseKey) {
  const now = new Date();
  const graceDays = Number(row.grace_days || 7);
  const lastOnlineValidation = now.toISOString();

  return {
    licenseKey: normalizeKey(licenseKey),
    status: row.status,
    groupId: row.group_code,
    groupName: row.group_name,
    unitId: row.unit_code,
    unitName: row.unit_name,
    unitType: row.unit_type,
    machineId: row.machine_id,
    plan: row.plan,
    expiresAt: new Date(row.expires_at).toISOString(),
    lastOnlineValidation,
    graceUntil: addDays(now, graceDays).toISOString(),
    graceDays,
    features: row.features || {
      tickets: true,
      caja: true,
      derivaciones: true
    }
  };
}

async function findLicenseByKey(client, licenseKey) {
  const result = await client.query(
    `
    SELECT
      l.*,
      g.codigo AS group_code,
      g.nombre AS group_name,
      u.codigo AS unit_code,
      u.nombre AS unit_name,
      u.tipo AS unit_type
    FROM licenses l
    JOIN license_groups g ON g.id = l.group_id
    JOIN license_units u ON u.id = l.unit_id
    WHERE l.license_key_hash = $1
      AND g.is_active = TRUE
      AND u.is_active = TRUE
    `,
    [hashLicenseKey(licenseKey)]
  );

  return result.rows[0] || null;
}

function assertLicenseUsable(license, machineId) {
  if (!license) {
    throw new Error('Licencia no encontrada');
  }

  if (license.status !== 'ACTIVE') {
    throw new Error('La licencia no esta activa');
  }

  if (new Date(license.expires_at).getTime() < Date.now()) {
    throw new Error('La licencia esta vencida');
  }

  if (license.machine_id && license.machine_id !== machineId) {
    throw new Error('La licencia ya esta activada en otro equipo');
  }
}

async function logValidation(client, licenseId, data, result, errorMessage = '') {
  await client.query(
    `
    INSERT INTO license_validations (
      license_id,
      machine_id,
      app_name,
      app_version,
      ip_address,
      result,
      error_message
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      licenseId,
      data.machine_id || '',
      data.app_name || '',
      data.app_version || '',
      data.ip_address || '',
      result,
      errorMessage
    ]
  );
}

async function activateLicense(data) {
  const licenseKey = normalizeKey(data.license_key);
  validateLicenseKeyFormat(licenseKey);

  if (!data.machine_id) {
    throw new Error('No se pudo identificar el equipo');
  }

  return withTransaction(async client => {
    const license = await findLicenseByKey(client, licenseKey);

    try {
      assertLicenseUsable(license, data.machine_id);

      const bind = await client.query(
        `
        UPDATE licenses
        SET machine_id = COALESCE(machine_id, $1),
            activated_at = COALESCE(activated_at, NOW()),
            last_validated_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
        RETURNING *
        `,
        [data.machine_id, license.id]
      );

      const row = {
        ...license,
        ...bind.rows[0]
      };

      await logValidation(client, license.id, data, 'ACTIVE');
      return publicLicensePayload(row, licenseKey);
    } catch (error) {
      if (license) {
        await logValidation(client, license.id, data, 'REJECTED', error.message);
      }

      throw error;
    }
  });
}

async function validateLicense(data) {
  const licenseKey = normalizeKey(data.license_key);
  validateLicenseKeyFormat(licenseKey);

  if (!data.machine_id) {
    throw new Error('No se pudo identificar el equipo');
  }

  return withTransaction(async client => {
    const license = await findLicenseByKey(client, licenseKey);

    try {
      assertLicenseUsable(license, data.machine_id);

      const update = await client.query(
        `
        UPDATE licenses
        SET last_validated_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [license.id]
      );

      const row = {
        ...license,
        ...update.rows[0]
      };

      await logValidation(client, license.id, data, 'ACTIVE');
      return publicLicensePayload(row, licenseKey);
    } catch (error) {
      if (license) {
        await logValidation(client, license.id, data, 'REJECTED', error.message);
      }

      throw error;
    }
  });
}

async function listLicenses() {
  const result = await query(`
    SELECT
      l.id,
      l.license_key_label,
      l.status,
      l.plan,
      l.machine_id,
      l.expires_at,
      l.activated_at,
      l.last_validated_at,
      g.codigo AS group_code,
      g.nombre AS group_name,
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

function hasAdminAccess(req) {
  const token = process.env.SISTEMA_TICKETS_ADMIN_TOKEN;

  if (!token) {
    return true;
  }

  const auth = String(req.headers.authorization || '');
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return req.headers['x-admin-token'] === token || bearer === token;
}

async function handleLicenseRoute({ method, path, req, res, sendJson, readJson }) {
  if (method === 'POST' && path === '/licenses/activate') {
    sendJson(res, 200, await activateLicense(await readJson(req)));
    return true;
  }

  if (method === 'POST' && path === '/licenses/validate') {
    sendJson(res, 200, await validateLicense(await readJson(req)));
    return true;
  }

  if (method === 'GET' && path === '/licenses') {
    if (!hasAdminAccess(req)) {
      sendJson(res, 401, { error: 'No autorizado' });
      return true;
    }

    sendJson(res, 200, await listLicenses());
    return true;
  }

  return false;
}

module.exports = {
  activateLicense,
  handleLicenseRoute,
  hashLicenseKey,
  maskLicenseKey,
  validateLicense
};
