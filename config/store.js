const fs = require('fs');
const path = require('path');
const runtimeConfig = require('./app.config');

const defaults = {
  sucursalId: '',
  sucursalNombre: '',
  outputPath: null,
  pdfBusinessStreet: '',
  pdfBusinessLocality: '',
  pdfBusinessProvince: '',
  pdfBusinessName: '',
  pdfBusinessAddress: '',
  pdfBusinessPhone: '',
  pdfBusinessEmail: '',
  pdfLogoPath: '',
  apiUrl: 'http://localhost:3000',
  apiSucursalId: null,
  licenseServerUrl: 'http://localhost:3000',
  licenseMode: 'server',
  licenseKey: '',
  licenseGroupId: '',
  licenseUnitId: '',
  licenseUnitType: 'SUCURSAL',
  licenseGraceDays: 7,
  alertPendingDays: 2,
  alertRepairDays: 5,
  alertBudgetDays: 3,
  alertReadyDays: 7
};

function configFilePath() {
  return path.join(process.env.APPDATA || process.cwd(), 'SistemaTickets', 'app.config.json');
}

function getConfig() {
  return {
    ...defaults,
    ...runtimeConfig
  };
}

function saveConfig(nextConfig = {}) {
  const merged = {
    ...getConfig(),
    ...nextConfig
  };

  const filePath = configFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2));
  Object.assign(runtimeConfig, merged);

  return merged;
}

module.exports = {
  getConfig,
  saveConfig,
  configFilePath
};
