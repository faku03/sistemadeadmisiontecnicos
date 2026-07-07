const { createHash, randomBytes, randomUUID } = require('crypto');
const { query } = require('./db');
const { createGroup, createLicense, createUnit } = require('./license-admin');
const { activateLicenseById } = require('./licenses');

const MAX_TEXT = 4000;
const MAX_SHORT = 220;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 12;
const rateBuckets = new Map();

function hashSecret(secret) {
  return createHash('sha256').update(String(secret || '')).digest('hex');
}

function text(value, max = MAX_SHORT) {
  return String(value || '').trim().slice(0, max);
}

function requiredText(value, fieldName, max = MAX_SHORT) {
  const normalized = text(value, max);

  if (!normalized) {
    throw new Error(`${fieldName} es obligatorio`);
  }

  return normalized;
}

function normalizeCode(value) {
  return text(value, 80).toUpperCase().replace(/[^A-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function defaultCode(value, fallback) {
  return normalizeCode(value) || normalizeCode(fallback) || `REQ-${Date.now()}`;
}

function publicRequest(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    status: row.status,
    name: row.name,
    taxId: row.tax_id,
    address: row.address,
    email: row.email,
    phone: row.phone,
    paymentDetail: row.payment_detail,
    machineId: row.machine_id,
    appName: row.app_name,
    appVersion: row.app_version,
    groupCode: row.group_code,
    unitCode: row.unit_code,
    unitName: row.unit_name,
    unitType: row.unit_type,
    licenseId: row.license_id,
    adminNotes: row.admin_notes,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at
  };
}

function assertRateLimit(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || [];
  const recent = bucket.filter(timestamp => now - timestamp < RATE_WINDOW_MS);

  if (recent.length >= RATE_MAX) {
    throw new Error('Demasiadas solicitudes desde esta conexion. Intenta mas tarde.');
  }

  recent.push(now);
  rateBuckets.set(ip, recent);
}

function buildCreatePayload(data = {}) {
  const request = data.request || data;
  const technical = data.technical || {};

  return {
    name: requiredText(request.name, 'Nombre / razon social'),
    taxId: text(request.taxId || request.tax_id, 80),
    address: text(request.address, 320),
    email: requiredText(request.email, 'Email', 160),
    phone: requiredText(request.phone, 'Celular', 80),
    paymentDetail: text(request.payment || request.paymentDetail || request.payment_detail, 800),
    machineId: requiredText(technical.machineId || technical.machine_id || data.machineId || data.machine_id, 'Machine ID', 180),
    appName: text(technical.appName || technical.app_name || data.appName || data.app_name, 80),
    appVersion: text(technical.appVersion || technical.app_version || data.appVersion || data.app_version, 40),
    groupCode: normalizeCode(technical.groupCode || technical.group_code || data.groupCode || data.group_code),
    unitCode: normalizeCode(technical.unitCode || technical.unit_code || data.unitCode || data.unit_code),
    unitName: text(technical.unitName || technical.unit_name || data.unitName || data.unit_name, 180),
    unitType: normalizeCode(technical.unitType || technical.unit_type || data.unitType || data.unit_type || 'SUCURSAL') || 'SUCURSAL',
    raw: {
      ...data,
      text: text(data.text, MAX_TEXT)
    }
  };
}

async function createLicenseRequest(data) {
  const payload = buildCreatePayload(data);
  const requestId = randomUUID();
  const requestSecret = randomBytes(24).toString('base64url');
  const result = await query(
    `
    INSERT INTO license_requests (
      request_id,
      request_secret_hash,
      status,
      name,
      tax_id,
      address,
      email,
      phone,
      payment_detail,
      machine_id,
      app_name,
      app_version,
      group_code,
      unit_code,
      unit_name,
      unit_type,
      request_payload
    )
    VALUES ($1, $2, 'PENDING', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb)
    RETURNING *
    `,
    [
      requestId,
      hashSecret(requestSecret),
      payload.name,
      payload.taxId || null,
      payload.address || null,
      payload.email,
      payload.phone,
      payload.paymentDetail || null,
      payload.machineId,
      payload.appName || null,
      payload.appVersion || null,
      payload.groupCode || null,
      payload.unitCode || null,
      payload.unitName || null,
      payload.unitType,
      JSON.stringify(payload.raw)
    ]
  );

  return {
    ...publicRequest(result.rows[0]),
    requestSecret
  };
}

async function findRequestForSecret(requestId, requestSecret) {
  const result = await query(
    `
    SELECT *
    FROM license_requests
    WHERE request_id = $1
      AND request_secret_hash = $2
    `,
    [requestId, hashSecret(requestSecret)]
  );

  return result.rows[0] || null;
}

async function getLicenseRequestStatus(data = {}) {
  const requestId = requiredText(data.requestId || data.request_id, 'Request ID', 80);
  const requestSecret = requiredText(data.requestSecret || data.request_secret, 'Request secret', 120);
  const machineId = text(data.machineId || data.machine_id, 180);
  const request = await findRequestForSecret(requestId, requestSecret);

  if (!request || (machineId && request.machine_id !== machineId)) {
    throw new Error('Solicitud no encontrada');
  }

  const response = {
    ...publicRequest(request),
    canActivate: request.status === 'APPROVED' && Boolean(request.license_id)
  };

  if (response.canActivate) {
    response.license = await activateLicenseById(request.license_id, request.machine_id, {
      app_name: request.app_name || 'FaroDesk',
      app_version: request.app_version || '',
      ip_address: 'license-request'
    });

    await query(
      `
      UPDATE license_requests
      SET status = 'FULFILLED',
          updated_at = NOW()
      WHERE id = $1
      `,
      [request.id]
    );

    response.status = 'FULFILLED';
  }

  return response;
}

async function listLicenseRequests() {
  const result = await query(
    `
    SELECT *
    FROM license_requests
    ORDER BY
      CASE status
        WHEN 'PENDING' THEN 0
        WHEN 'APPROVED' THEN 1
        WHEN 'REJECTED' THEN 2
        ELSE 3
      END,
      created_at DESC
    LIMIT 300
    `
  );

  return result.rows.map(publicRequest);
}

async function approveLicenseRequest(id, data = {}) {
  const validDays = Number(data.valid_days || data.validDays || 30);
  const billingPeriod = normalizeCode(data.billing_period || data.billingPeriod || 'MONTHLY') || 'MONTHLY';
  const subscriptionStatus = normalizeCode(data.subscription_status || data.subscriptionStatus || 'ACTIVE') || 'ACTIVE';
  const plan = normalizeCode(data.plan || 'STANDARD') || 'STANDARD';
  const graceDays = Number(data.grace_days || data.graceDays || 7);

  const current = await query(`SELECT * FROM license_requests WHERE id = $1`, [id]);

  if (!current.rowCount) {
    throw new Error('Solicitud no encontrada');
  }

  const request = current.rows[0];
  if (!['PENDING', 'REJECTED'].includes(request.status)) {
    throw new Error('La solicitud no esta pendiente');
  }

  let groupId = data.group_id ? Number(data.group_id) : null;
  let unitId = data.unit_id ? Number(data.unit_id) : null;

  if (!groupId) {
    const groupCode = defaultCode(request.group_code, request.name);
    const existingGroup = await query(`SELECT id FROM license_groups WHERE codigo = $1`, [groupCode]);

    if (existingGroup.rowCount) {
      groupId = existingGroup.rows[0].id;
    } else {
      const createdGroup = await createGroup({
        codigo: groupCode,
        nombre: request.name,
        tax_id: request.tax_id,
        contact_name: request.name,
        contact_email: request.email,
        contact_phone: request.phone,
        address: request.address
      });
      groupId = createdGroup.id;
    }
  }

  if (!unitId) {
    const unitCode = defaultCode(request.unit_code, request.unit_name || request.name);
    const existingUnit = await query(
      `SELECT id FROM license_units WHERE group_id = $1 AND codigo = $2`,
      [groupId, unitCode]
    );

    if (existingUnit.rowCount) {
      unitId = existingUnit.rows[0].id;
    } else {
      const createdUnit = await createUnit({
        group_id: groupId,
        codigo: unitCode,
        nombre: request.unit_name || request.name,
        tipo: request.unit_type || 'SUCURSAL'
      });
      unitId = createdUnit.id;
    }
  }

  const license = await createLicense({
    group_id: groupId,
    unit_id: unitId,
    plan,
    subscription_status: subscriptionStatus,
    subscription_reference: text(data.subscription_reference || data.subscriptionReference || request.payment_detail, 220),
    billing_period: billingPeriod,
    valid_days: validDays,
    grace_days: graceDays,
    payment_notes: request.payment_detail,
    features: {
      tickets: true,
      caja: true,
      derivaciones: true
    }
  });

  const updated = await query(
    `
    UPDATE license_requests
    SET status = 'APPROVED',
        license_id = $1,
        admin_notes = $2,
        rejection_reason = NULL,
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE id = $3
    RETURNING *
    `,
    [license.id, text(data.admin_notes || data.adminNotes, 800) || null, id]
  );

  return {
    ...publicRequest(updated.rows[0]),
    license
  };
}

async function rejectLicenseRequest(id, data = {}) {
  const result = await query(
    `
    UPDATE license_requests
    SET status = 'REJECTED',
        rejection_reason = $1,
        admin_notes = $2,
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE id = $3
    RETURNING *
    `,
    [
      requiredText(data.reason || data.rejectionReason, 'Motivo', 800),
      text(data.admin_notes || data.adminNotes, 800) || null,
      id
    ]
  );

  if (!result.rowCount) {
    throw new Error('Solicitud no encontrada');
  }

  return publicRequest(result.rows[0]);
}

async function handleLicenseRequestRoute({ method, path, req, res, sendJson, readJson }) {
  if (method === 'POST' && path === '/license-requests') {
    assertRateLimit(req);
    sendJson(res, 201, await createLicenseRequest(await readJson(req)));
    return true;
  }

  if (method === 'POST' && path === '/license-requests/status') {
    sendJson(res, 200, await getLicenseRequestStatus(await readJson(req)));
    return true;
  }

  return false;
}

async function handleLicenseRequestAdminRoute({ method, path, req, res, sendJson, readJson, isAuthorized }) {
  if (!path.startsWith('/admin/license-requests')) {
    return false;
  }

  if (!isAuthorized) {
    sendJson(res, 401, { error: 'No autorizado' });
    return true;
  }

  if (method === 'GET' && path === '/admin/license-requests') {
    sendJson(res, 200, await listLicenseRequests());
    return true;
  }

  const match = path.match(/^\/admin\/license-requests\/(\d+)\/(approve|reject)$/);

  if (match && method === 'POST' && match[2] === 'approve') {
    sendJson(res, 200, await approveLicenseRequest(match[1], await readJson(req)));
    return true;
  }

  if (match && method === 'POST' && match[2] === 'reject') {
    sendJson(res, 200, await rejectLicenseRequest(match[1], await readJson(req)));
    return true;
  }

  return false;
}

module.exports = {
  approveLicenseRequest,
  createLicenseRequest,
  getLicenseRequestStatus,
  handleLicenseRequestAdminRoute,
  handleLicenseRequestRoute,
  listLicenseRequests,
  rejectLicenseRequest
};
