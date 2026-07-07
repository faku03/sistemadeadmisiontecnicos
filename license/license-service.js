const appConfig = require('../config/app.config');
const { getMachineId } = require('./machine-id');
const {
  getLicensePath,
  readLicenseCache,
  writeLicenseCache
} = require('./license-cache');
const { checkPendingLicenseRequest } = require('./license-request-service');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_GRACE_DAYS = 7;
const DEFAULT_LICENSE_SERVER_URL = 'https://sistematickets.licences.mardeltech.com';

function addDays(date, days) {
  return new Date(date.getTime() + (days * DAY_MS));
}

function daysRemaining(date, referenceDate = new Date()) {
  return Math.max(0, Math.ceil((new Date(date).getTime() - new Date(referenceDate).getTime()) / DAY_MS));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function pick(source, ...keys) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null && source[key] !== '') {
      return source[key];
    }
  }
  return undefined;
}

function parseFeatures(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      tickets: true,
      caja: true,
      derivaciones: true
    };
  }

  return {
    tickets: pick(raw, 'tickets') !== false,
    caja: pick(raw, 'caja') !== false,
    derivaciones: pick(raw, 'derivaciones') !== false
  };
}

function normalizeLicensePayload(payload, { machineId: fallbackMachineId, licenseKey: fallbackLicenseKey } = {}) {
  const source = payload?.license && typeof payload.license === 'object'
    ? { ...payload, ...payload.license }
    : payload;

  if (!source || typeof source !== 'object') {
    return null;
  }

  const now = new Date();
  const graceDays = Number(
    pick(source, 'graceDays', 'grace_days') ||
    appConfig.licenseGraceDays ||
    DEFAULT_GRACE_DAYS
  );
  const lastOnlineValidation = pick(
    source,
    'lastOnlineValidation',
    'last_online_validation',
    'validatedAt',
    'validated_at'
  ) || now.toISOString();
  const expiresAt = pick(source, 'expiresAt', 'expires_at', 'expiration', 'expiration_date');

  if (!expiresAt) {
    throw new Error('La respuesta del servidor de licencias no incluye vencimiento');
  }

  return {
    licenseKey: String(
      pick(source, 'licenseKey', 'license_key', 'key') || fallbackLicenseKey || ''
    ).trim().toUpperCase(),
    status: String(pick(source, 'status') || 'ACTIVE').toUpperCase(),
    groupId: String(pick(source, 'groupId', 'group_id') || appConfig.licenseGroupId || ''),
    unitId: String(pick(source, 'unitId', 'unit_id', 'unitCode', 'unit_code') || appConfig.licenseUnitId || ''),
    unitType: String(pick(source, 'unitType', 'unit_type') || appConfig.licenseUnitType || 'SUCURSAL').toUpperCase(),
    machineId: String(pick(source, 'machineId', 'machine_id') || fallbackMachineId || getMachineId()),
    plan: String(pick(source, 'plan') || 'STANDARD').toUpperCase(),
    expiresAt: new Date(expiresAt).toISOString(),
    lastOnlineValidation: new Date(lastOnlineValidation).toISOString(),
    graceUntil: new Date(
      pick(source, 'graceUntil', 'grace_until') || addDays(new Date(lastOnlineValidation), graceDays).toISOString()
    ).toISOString(),
    graceDays,
    features: parseFeatures(pick(source, 'features')),
    groupCode: String(pick(source, 'groupCode', 'group_code') || ''),
    unitCode: String(pick(source, 'unitCode', 'unit_code') || ''),
    unitName: String(pick(source, 'unitName', 'unit_name') || ''),
    rawServerPayload: source
  };
}

function simulatedValidation(machineId) {
  const enabled = process.env.SISTEMA_TICKETS_LICENSE_MOCK !== 'disabled';

  if (!enabled) {
    throw new Error('No se pudo validar la licencia online');
  }

  const now = new Date();
  const graceDays = Number(appConfig.licenseGraceDays || DEFAULT_GRACE_DAYS);

  return {
    licenseKey: process.env.SISTEMA_TICKETS_LICENSE_KEY || appConfig.licenseKey || '',
    status: process.env.SISTEMA_TICKETS_LICENSE_STATUS || 'ACTIVE',
    groupId: process.env.SISTEMA_TICKETS_LICENSE_GROUP || appConfig.licenseGroupId || '',
    unitId: process.env.SISTEMA_TICKETS_LICENSE_UNIT || appConfig.licenseUnitId || '',
    unitType: process.env.SISTEMA_TICKETS_LICENSE_UNIT_TYPE || appConfig.licenseUnitType || 'SUCURSAL',
    machineId,
    plan: process.env.SISTEMA_TICKETS_LICENSE_PLAN || 'STANDARD',
    expiresAt: addDays(now, 30).toISOString(),
    lastOnlineValidation: now.toISOString(),
    graceUntil: addDays(now, graceDays).toISOString(),
    graceDays,
    features: {
      tickets: true,
      caja: true,
      derivaciones: true
    }
  };
}

function licenseServerUrl() {
  return String(
    process.env.SISTEMA_TICKETS_LICENSE_SERVER_URL ||
    appConfig.licenseServerUrl ||
    DEFAULT_LICENSE_SERVER_URL
  ).replace(/\/$/, '');
}

function licenseMode() {
  return String(process.env.SISTEMA_TICKETS_LICENSE_MODE || appConfig.licenseMode || 'server').toLowerCase();
}

function shouldUseLicenseServer() {
  return Boolean(process.env.SISTEMA_TICKETS_LICENSE_SERVER_URL) || licenseMode() === 'server';
}

function shouldUseMockValidation() {
  return licenseMode() === 'mock';
}

async function fetchServerNow() {
  const response = await fetch(`${licenseServerUrl()}/health`, {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`No se pudo consultar la hora del servidor (${response.status})`);
  }

  const body = await response.json().catch(() => null);
  const headerDate = response.headers.get('date');
  const bodyDate = pick(body, 'serverTime', 'server_time', 'now', 'timestamp');
  const resolved = bodyDate || headerDate;

  if (!resolved) {
    throw new Error('El servidor no devolvio una hora valida');
  }

  const date = new Date(resolved);

  if (Number.isNaN(date.getTime())) {
    throw new Error('No se pudo interpretar la hora del servidor');
  }

  return date;
}

async function requestLicenseServer(path, data) {
  const response = await fetch(`${licenseServerUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const fallbackMessage = path.includes('/activate')
      ? 'No se pudo activar la licencia. Verifica la clave e intenta de nuevo.'
      : 'No se pudo validar la licencia con el servidor.';
    const error = new Error(body?.error || body?.message || fallbackMessage);
    error.licenseRejected = true;
    error.statusCode = response.status;
    throw error;
  }

  return body;
}

function appName() {
  return process.env.SISTEMA_TICKETS_APP_NAME || 'sistema-tickets';
}

function appVersion() {
  return process.env.SISTEMA_TICKETS_APP_VERSION || '1.0.0';
}

function activationPayload(licenseKey, machineId) {
  return {
    license_key: licenseKey,
    machine_id: machineId,
    app_name: appName(),
    app_version: appVersion()
  };
}

function localActivation(licenseKey) {
  const key = String(licenseKey || '').trim().toUpperCase();

  if (!key) {
    throw new Error('Ingresa una clave de licencia');
  }

  if (!/^([A-Z0-9]{4,}-?){2,}$/.test(key)) {
    throw new Error('La clave de licencia no tiene un formato valido');
  }

  const machineId = getMachineId();
  const now = new Date();
  const graceDays = Number(appConfig.licenseGraceDays || DEFAULT_GRACE_DAYS);
  const activated = {
    licenseKey: key,
    status: 'ACTIVE',
    groupId: appConfig.licenseGroupId || '',
    unitId: appConfig.licenseUnitId || '',
    unitType: appConfig.licenseUnitType || 'SUCURSAL',
    machineId,
    plan: 'STANDARD',
    expiresAt: addDays(now, 30).toISOString(),
    lastOnlineValidation: now.toISOString(),
    graceUntil: addDays(now, graceDays).toISOString(),
    graceDays,
    features: {
      tickets: true,
      caja: true,
      derivaciones: true
    }
  };

  writeLicenseCache(activated);

  return {
    ...evaluateCache(activated, { online: true }),
    online: true,
    machineId,
    cachePath: getLicensePath()
  };
}

async function activateLicense(licenseKey) {
  const key = String(licenseKey || '').trim().toUpperCase();
  const machineId = getMachineId();

  if (shouldUseLicenseServer()) {
    const response = await requestLicenseServer('/licenses/activate', activationPayload(key, machineId));
    const validated = normalizeLicensePayload(response, { machineId, licenseKey: key });
    writeLicenseCache(validated);

    return {
      ...evaluateCache(validated, { online: true }),
      online: true,
      machineId,
      cachePath: getLicensePath()
    };
  }

  return localActivation(key);
}

function buildInitialGraceCache(machineId, serverNow) {
  const graceDays = Number(appConfig.licenseGraceDays || DEFAULT_GRACE_DAYS);
  const startedAt = new Date(serverNow);

  return {
    licenseKey: '',
    status: 'PENDING_ACTIVATION',
    groupId: appConfig.licenseGroupId || '',
    unitId: appConfig.licenseUnitId || '',
    unitType: appConfig.licenseUnitType || 'SUCURSAL',
    machineId,
    plan: 'TRIAL',
    expiresAt: addDays(startedAt, graceDays).toISOString(),
    lastOnlineValidation: startedAt.toISOString(),
    graceUntil: addDays(startedAt, graceDays).toISOString(),
    graceDays,
    features: {
      tickets: true,
      caja: true,
      derivaciones: true
    },
    groupCode: appConfig.licenseGroupId || '',
    unitCode: appConfig.licenseUnitId || '',
    unitName: appConfig.sucursalNombre || '',
    trialStartedAt: startedAt.toISOString(),
    activationRequired: true
  };
}

function evaluateCache(cache, { online = false, referenceDate = new Date() } = {}) {
  if (!cache) {
    return {
      status: 'BLOCKED',
      canUse: false,
      reason: 'No hay licencia validada',
      daysRemaining: 0
    };
  }

  if (cache.status === 'PENDING_ACTIVATION') {
    if (new Date(cache.graceUntil).getTime() < new Date(referenceDate).getTime()) {
      return {
        ...cache,
        status: 'BLOCKED',
        canUse: false,
        reason: 'El periodo inicial de 7 dias ya vencio. Debes activar una licencia.',
        daysRemaining: 0
      };
    }

    const remaining = daysRemaining(cache.graceUntil, referenceDate);

    return {
      ...cache,
      status: 'GRACE',
      canUse: true,
      reason: `Sistema en periodo inicial. Quedan ${remaining} dias para activar la licencia.`,
      daysRemaining: remaining
    };
  }

  if (cache.status !== 'ACTIVE') {
    return {
      ...cache,
      status: 'BLOCKED',
      canUse: false,
      reason: 'La licencia no esta activa',
      daysRemaining: 0
    };
  }

  if (new Date(cache.expiresAt).getTime() < new Date(referenceDate).getTime()) {
    return {
      ...cache,
      status: 'BLOCKED',
      canUse: false,
      reason: 'La licencia esta vencida',
      daysRemaining: 0
    };
  }

  if (new Date(cache.graceUntil).getTime() < new Date(referenceDate).getTime()) {
    return {
      ...cache,
      status: 'BLOCKED',
      canUse: false,
      reason: 'La licencia no pudo validarse dentro del periodo de gracia',
      daysRemaining: 0
    };
  }

  const remaining = daysRemaining(cache.graceUntil, referenceDate);

  return {
    ...cache,
    status: online ? 'ACTIVE' : 'GRACE',
    canUse: true,
    reason: online
      ? 'Licencia activa'
      : `No se pudo validar online. Quedan ${remaining} dias de gracia.`,
    daysRemaining: remaining
  };
}

async function validateLicense({ forceOffline = false } = {}) {
  const machineId = getMachineId();
  const previous = readLicenseCache();
  const currentLicenseKey = String(previous?.licenseKey || appConfig.licenseKey || '').trim().toUpperCase();

  if (!forceOffline) {
    try {
      const approvedRequestLicense = await checkPendingLicenseRequest();
      if (approvedRequestLicense) {
        return {
          ...evaluateCache(approvedRequestLicense, { online: true, referenceDate: approvedRequestLicense.lastOnlineValidation }),
          online: true,
          machineId,
          cachePath: getLicensePath()
        };
      }

      if (shouldUseLicenseServer() && !currentLicenseKey) {
        const serverNow = await fetchServerNow();
        const latestCache = readLicenseCache();
        const currentTrial = previous?.status === 'PENDING_ACTIVATION'
          ? {
              ...previous,
              machineId,
              lastOnlineValidation: serverNow.toISOString(),
              pendingLicenseRequest: latestCache?.pendingLicenseRequest || previous.pendingLicenseRequest
            }
          : {
              ...buildInitialGraceCache(machineId, serverNow),
              pendingLicenseRequest: latestCache?.pendingLicenseRequest || previous?.pendingLicenseRequest
            };

        writeLicenseCache(currentTrial);
        return {
          ...evaluateCache(currentTrial, { online: true, referenceDate: serverNow }),
          online: true,
          machineId,
          cachePath: getLicensePath()
        };
      }

      const validated = shouldUseLicenseServer()
        ? normalizeLicensePayload(
            await requestLicenseServer(
              '/licenses/validate',
              activationPayload(currentLicenseKey, machineId)
            ),
            {
              machineId,
              licenseKey: currentLicenseKey
            }
          )
        : shouldUseMockValidation()
          ? simulatedValidation(machineId)
          : null;

      if (validated) {
        writeLicenseCache(validated);
        return {
          ...evaluateCache(validated, { online: true, referenceDate: validated.lastOnlineValidation }),
          online: true,
          machineId,
          cachePath: getLicensePath()
        };
      }
    } catch (error) {
      if (error.licenseRejected) {
        return {
          status: 'BLOCKED',
          canUse: false,
          reason: error.message || 'Licencia rechazada por el servidor',
          daysRemaining: 0,
          online: true,
          machineId,
          cachePath: getLicensePath()
        };
      }
      // Network/server availability errors fall back to cached grace period.
    }
  }

  if (previous?.status === 'PENDING_ACTIVATION') {
    const remaining = daysRemaining(previous.graceUntil, previous.lastOnlineValidation);
    return {
      ...previous,
      status: 'BLOCKED',
      canUse: false,
      reason: remaining > 0
        ? 'Para usar el periodo inicial debes conectarte a internet y validar la hora con el servidor.'
        : 'El periodo inicial de 7 dias ya vencio. Debes activar una licencia.',
      daysRemaining: remaining,
      online: false,
      machineId,
      cachePath: getLicensePath()
    };
  }

  return {
    ...evaluateCache(previous, { online: false }),
    online: false,
    machineId,
    cachePath: getLicensePath()
  };
}

async function requireUsableLicense() {
  const status = await validateLicense();

  if (!status.canUse) {
    throw new Error(status.reason || 'Licencia bloqueada');
  }

  return status;
}

function markWarningShown() {
  const cache = readLicenseCache();

  if (!cache) {
    return null;
  }

  const updated = {
    ...cache,
    lastWarningDate: todayKey()
  };

  writeLicenseCache(updated);
  return updated;
}

function shouldShowDailyWarning(status) {
  const cache = readLicenseCache();
  return status === 'GRACE' && cache?.lastWarningDate !== todayKey();
}

module.exports = {
  activateLicense,
  requireUsableLicense,
  validateLicense,
  markWarningShown,
  shouldShowDailyWarning,
  normalizeLicensePayload
};
