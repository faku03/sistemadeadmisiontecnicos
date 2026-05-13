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
  businessTaxId: '',
  businessContactName: '',
  businessMobile: '',
  pdfLogoPath: '',
  dateFormat: 'system',
  currencyCode: 'ARS',
  currencyFormat: 'system',
  apiUrl: 'http://localhost:3000',
  apiSucursalId: null,
  licenseServerUrl: 'https://sistematickets.licences.mardeltech.com',
  licenseMode: 'server',
  licenseKey: '',
  licenseGroupId: '',
  licenseUnitId: '',
  licenseUnitType: 'SUCURSAL',
  licenseGraceDays: 7,
  licenseSupportWhatsApp: '',
  licenseSupportEmail: '',
  alertPendingDays: 2,
  alertRepairDays: 5,
  alertBudgetDays: 3,
  alertReadyDays: 7
};

function configFilePath() {
  const exeConfigPath = process.execPath
    ? path.join(path.dirname(process.execPath), 'app.config.json')
    : null;

  if (exeConfigPath && path.basename(process.execPath).toLowerCase() !== 'electron.exe') {
    return exeConfigPath;
  }

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
