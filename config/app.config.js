const fs = require('fs');
const path = require('path');

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

function readJson(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (_) {
    return {};
  }

  return {};
}

function configPaths() {
  const exeDir = process.execPath
    ? path.join(path.dirname(process.execPath), 'app.config.json')
    : null;
  const appData = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'SistemaTickets', 'app.config.json')
    : null;

  return [
    process.env.SISTEMA_TICKETS_CONFIG,
    exeDir,
    appData,
    path.join(process.cwd(), 'app.config.json'),
    path.join(__dirname, 'app.config.json')
  ].filter(Boolean);
}

function externalConfig() {
  for (const filePath of configPaths()) {
    const config = readJson(filePath);

    if (Object.keys(config).length) {
      return config;
    }
  }

  return {};
}

function envConfig() {
  return {
    sucursalId: process.env.SISTEMA_TICKETS_SUCURSAL_ID,
    sucursalNombre: process.env.SISTEMA_TICKETS_SUCURSAL_NOMBRE,
    outputPath: process.env.SISTEMA_TICKETS_OUTPUT_PATH,
    pdfBusinessStreet: process.env.SISTEMA_TICKETS_PDF_BUSINESS_STREET,
    pdfBusinessLocality: process.env.SISTEMA_TICKETS_PDF_BUSINESS_LOCALITY,
    pdfBusinessProvince: process.env.SISTEMA_TICKETS_PDF_BUSINESS_PROVINCE,
    pdfBusinessName: process.env.SISTEMA_TICKETS_PDF_BUSINESS_NAME,
    pdfBusinessAddress: process.env.SISTEMA_TICKETS_PDF_BUSINESS_ADDRESS,
    pdfBusinessPhone: process.env.SISTEMA_TICKETS_PDF_BUSINESS_PHONE,
    pdfBusinessEmail: process.env.SISTEMA_TICKETS_PDF_BUSINESS_EMAIL,
    pdfLogoPath: process.env.SISTEMA_TICKETS_PDF_LOGO_PATH,
    dateFormat: process.env.SISTEMA_TICKETS_DATE_FORMAT,
    currencyCode: process.env.SISTEMA_TICKETS_CURRENCY_CODE,
    currencyFormat: process.env.SISTEMA_TICKETS_CURRENCY_FORMAT,
    apiUrl: process.env.SISTEMA_TICKETS_API_URL,
    apiSucursalId: process.env.SISTEMA_TICKETS_API_SUCURSAL_ID,
    licenseServerUrl: process.env.SISTEMA_TICKETS_LICENSE_SERVER_URL,
    licenseMode: process.env.SISTEMA_TICKETS_LICENSE_MODE,
    licenseKey: process.env.SISTEMA_TICKETS_LICENSE_KEY,
    licenseGroupId: process.env.SISTEMA_TICKETS_LICENSE_GROUP,
    licenseUnitId: process.env.SISTEMA_TICKETS_LICENSE_UNIT,
    licenseUnitType: process.env.SISTEMA_TICKETS_LICENSE_UNIT_TYPE,
    licenseGraceDays: process.env.SISTEMA_TICKETS_LICENSE_GRACE_DAYS,
    licenseSupportWhatsApp: process.env.SISTEMA_TICKETS_LICENSE_SUPPORT_WHATSAPP,
    licenseSupportEmail: process.env.SISTEMA_TICKETS_LICENSE_SUPPORT_EMAIL,
    alertPendingDays: process.env.SISTEMA_TICKETS_ALERT_PENDING_DAYS,
    alertRepairDays: process.env.SISTEMA_TICKETS_ALERT_REPAIR_DAYS,
    alertBudgetDays: process.env.SISTEMA_TICKETS_ALERT_BUDGET_DAYS,
    alertReadyDays: process.env.SISTEMA_TICKETS_ALERT_READY_DAYS
  };
}

function cleanUndefined(config) {
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== undefined && value !== '')
  );
}

module.exports = {
  ...defaults,
  ...externalConfig(),
  ...cleanUndefined(envConfig())
};
