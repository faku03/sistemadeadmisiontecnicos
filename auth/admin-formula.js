function sanitizeAlphaNum(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function lastFour(value, fallback = '0000') {
  const clean = sanitizeAlphaNum(value);
  if (!clean) {
    return fallback;
  }

  return clean.slice(-4).padStart(4, '0');
}

function buildAdminPassword(data = {}) {
  const unitSeed = data.licenseKey || data.licenseUnitId || data.sucursalId || '';
  const taxSeed = data.businessTaxId || data.licenseUnitId || data.sucursalId || '';

  return `MT${lastFour(unitSeed)}${lastFour(taxSeed)}`;
}

module.exports = {
  buildAdminPassword
};
