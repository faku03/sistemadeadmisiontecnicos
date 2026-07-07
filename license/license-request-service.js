const appConfig = require('../config/app.config');
const { getMachineId } = require('./machine-id');
const {
  readLicenseCache,
  writeLicenseCache
} = require('./license-cache');

const DEFAULT_LICENSE_SERVER_URL = 'https://sistematickets.licences.mardeltech.com';
const DEFAULT_TIMEOUT_MS = 15000;

function licenseServerUrl() {
  return String(
    process.env.SISTEMA_TICKETS_LICENSE_SERVER_URL ||
    appConfig.licenseServerUrl ||
    DEFAULT_LICENSE_SERVER_URL
  ).replace(/\/$/, '');
}

async function requestLicenseServer(path, data) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${licenseServerUrl()}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(body?.error || body?.message || `Error HTTP ${response.status}`);
    }

    return body;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('El servidor de licencias no respondio a tiempo.');
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function mergePendingRequest(result) {
  const current = readLicenseCache() || {};
  const pending = {
    requestId: result.requestId,
    requestSecret: result.requestSecret,
    status: result.status || 'PENDING',
    createdAt: result.createdAt || new Date().toISOString()
  };

  writeLicenseCache({
    ...current,
    pendingLicenseRequest: pending
  });

  return pending;
}

function clearPendingRequest(cache, status = 'FULFILLED') {
  if (!cache?.pendingLicenseRequest) {
    return cache;
  }

  const next = {
    ...cache,
    pendingLicenseRequest: {
      ...cache.pendingLicenseRequest,
      status,
      resolvedAt: new Date().toISOString()
    }
  };

  writeLicenseCache(next);
  return next;
}

async function submitLicenseRequest(data = {}) {
  const machineId = getMachineId();
  const payload = {
    ...data,
    technical: {
      ...(data.technical || {}),
      machineId,
      appName: process.env.SISTEMA_TICKETS_APP_NAME || 'FaroDesk',
      appVersion: process.env.SISTEMA_TICKETS_APP_VERSION || '1.0.0'
    }
  };
  const result = await requestLicenseServer('/license-requests', payload);
  const pending = mergePendingRequest(result);

  return {
    ok: true,
    requestId: pending.requestId,
    status: pending.status,
    message: 'Solicitud registrada'
  };
}

async function checkPendingLicenseRequest() {
  const cache = readLicenseCache();
  const pending = cache?.pendingLicenseRequest;

  if (!pending?.requestId || !pending?.requestSecret) {
    return null;
  }

  const result = await requestLicenseServer('/license-requests/status', {
    requestId: pending.requestId,
    requestSecret: pending.requestSecret,
    machineId: getMachineId()
  });

  if (result.license) {
    clearPendingRequest({
      ...result.license,
      pendingLicenseRequest: pending
    }, result.status || 'FULFILLED');

    return result.license;
  }

  writeLicenseCache({
    ...cache,
    pendingLicenseRequest: {
      ...pending,
      status: result.status || pending.status,
      lastCheckedAt: new Date().toISOString(),
      rejectionReason: result.rejectionReason || ''
    }
  });

  return null;
}

module.exports = {
  checkPendingLicenseRequest,
  submitLicenseRequest
};
