const appConfig = require('../config/app.config');
const { getMachineId } = require('./machine-id');
const {
  getLicensePath,
  readLicenseCache,
  writeLicenseCache
} = require('./license-cache');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_GRACE_DAYS = 7;
const DEFAULT_LICENSE_SERVER_URL = 'http://localhost:3000';

function addDays(date, days) {
  return new Date(date.getTime() + (days * DAY_MS));
}

function daysRemaining(date) {
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / DAY_MS));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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
  return String(process.env.SISTEMA_TICKETS_LICENSE_MODE || appConfig.licenseMode || 'mock').toLowerCase();
}

function shouldUseLicenseServer() {
  return Boolean(process.env.SISTEMA_TICKETS_LICENSE_SERVER_URL) || licenseMode() === 'server';
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
    throw new Error(body?.error || `Error HTTP ${response.status}`);
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
    const validated = await requestLicenseServer('/licenses/activate', activationPayload(key, machineId));
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

function evaluateCache(cache, { online = false } = {}) {
  if (!cache) {
    return {
      status: 'BLOCKED',
      canUse: false,
      reason: 'No hay licencia validada',
      daysRemaining: 0
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

  if (new Date(cache.expiresAt).getTime() < Date.now()) {
    return {
      ...cache,
      status: 'BLOCKED',
      canUse: false,
      reason: 'La licencia esta vencida',
      daysRemaining: 0
    };
  }

  if (new Date(cache.graceUntil).getTime() < Date.now()) {
    return {
      ...cache,
      status: 'BLOCKED',
      canUse: false,
      reason: 'La licencia no pudo validarse dentro del periodo de gracia',
      daysRemaining: 0
    };
  }

  const remaining = daysRemaining(cache.graceUntil);

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

  if (!forceOffline) {
    try {
      const validated = shouldUseLicenseServer()
        ? await requestLicenseServer(
            '/licenses/validate',
            activationPayload(previous?.licenseKey || appConfig.licenseKey, machineId)
          )
        : simulatedValidation(machineId);

      writeLicenseCache(validated);
      return {
        ...evaluateCache(validated, { online: true }),
        online: true,
        machineId,
        cachePath: getLicensePath()
      };
    } catch (_) {
      // Falls back to cached grace period.
    }
  }

  return {
    ...evaluateCache(previous, { online: false }),
    online: false,
    machineId,
    cachePath: getLicensePath()
  };
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
  validateLicense,
  markWarningShown,
  shouldShowDailyWarning
};
