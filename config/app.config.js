const fs = require('fs');
const path = require('path');

const defaults = {
  sucursalId: '',
  sucursalNombre: '',
  databasePath: null,
  outputPath: null,
  dataMode: 'local',
  apiUrl: 'http://localhost:3000',
  apiSucursalId: null,
  licenseServerUrl: 'http://localhost:3000',
  licenseMode: 'server',
  licenseKey: '',
  licenseGroupId: '',
  licenseUnitId: '',
  licenseUnitType: 'SUCURSAL',
  licenseGraceDays: 7
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
  const appData = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'SistemaTickets', 'app.config.json')
    : null;
  const exeDir = process.execPath
    ? path.join(path.dirname(process.execPath), 'app.config.json')
    : null;

  return [
    process.env.SISTEMA_TICKETS_CONFIG,
    path.join(process.cwd(), 'app.config.json'),
    exeDir,
    appData,
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
    databasePath: process.env.SISTEMA_TICKETS_DB_PATH,
    outputPath: process.env.SISTEMA_TICKETS_OUTPUT_PATH,
    dataMode: process.env.SISTEMA_TICKETS_DATA_MODE,
    apiUrl: process.env.SISTEMA_TICKETS_API_URL,
    apiSucursalId: process.env.SISTEMA_TICKETS_API_SUCURSAL_ID,
    licenseServerUrl: process.env.SISTEMA_TICKETS_LICENSE_SERVER_URL,
    licenseMode: process.env.SISTEMA_TICKETS_LICENSE_MODE,
    licenseKey: process.env.SISTEMA_TICKETS_LICENSE_KEY,
    licenseGroupId: process.env.SISTEMA_TICKETS_LICENSE_GROUP,
    licenseUnitId: process.env.SISTEMA_TICKETS_LICENSE_UNIT,
    licenseUnitType: process.env.SISTEMA_TICKETS_LICENSE_UNIT_TYPE,
    licenseGraceDays: process.env.SISTEMA_TICKETS_LICENSE_GRACE_DAYS
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
