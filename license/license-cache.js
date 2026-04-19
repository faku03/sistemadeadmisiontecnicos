const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SECRET = process.env.SISTEMA_TICKETS_LICENSE_SECRET || 'dev-license-secret-change-me';

function getLicenseDir() {
  return process.env.SISTEMA_TICKETS_LICENSE_DIR ||
    path.join(process.env.APPDATA || process.cwd(), 'SistemaTickets');
}

function getLicensePath() {
  return path.join(getLicenseDir(), 'license-cache.json');
}

function sign(payload) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
}

function readLicenseCache() {
  const filePath = getLicensePath();

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const { signature, ...payload } = raw;

  if (signature !== sign(payload)) {
    return null;
  }

  return payload;
}

function writeLicenseCache(payload) {
  const dir = getLicenseDir();
  fs.mkdirSync(dir, { recursive: true });

  const filePath = getLicensePath();
  fs.writeFileSync(
    filePath,
    JSON.stringify({ ...payload, signature: sign(payload) }, null, 2)
  );

  return filePath;
}

module.exports = {
  getLicensePath,
  readLicenseCache,
  writeLicenseCache
};
