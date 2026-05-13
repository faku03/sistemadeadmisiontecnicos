const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const db = require('./services/data-source');
const configStore = require('./config/store');
const pdfReporteCaja = require('./pdf/reporte_caja');
const license = require('./license/license-service');

const appDataBase = path.join(process.env.APPDATA || app.getPath('appData'), 'SistemaTicketsCaja');
const electronSessionDir = path.join(appDataBase, 'electron-session');
const electronCacheDir = path.join(appDataBase, 'electron-cache');

fs.mkdirSync(electronSessionDir, { recursive: true });
fs.mkdirSync(electronCacheDir, { recursive: true });

app.setPath('sessionData', electronSessionDir);
app.commandLine.appendSwitch('disk-cache-dir', electronCacheDir);
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

function gatewayUrlActual() {
  const config = configStore.getConfig();
  return String(process.env.SISTEMA_TICKETS_API_URL || config.apiUrl || 'http://localhost:3000').trim();
}

function esHostLocal(hostname) {
  const normalized = String(hostname || '').toLowerCase();
  const localNames = new Set([
    '127.0.0.1',
    'localhost',
    '::1',
    String(os.hostname() || '').toLowerCase(),
    String(process.env.COMPUTERNAME || '').toLowerCase()
  ].filter(Boolean));

  return localNames.has(normalized);
}

function normalizarGatewayUrl(url) {
  try {
    const parsed = new URL(String(url || '').trim());
    if (esHostLocal(parsed.hostname) && parsed.hostname !== '127.0.0.1') {
      parsed.hostname = '127.0.0.1';
    }
    return parsed.toString().replace(/\/$/, '');
  } catch (_) {
    return String(url || '').trim();
  }
}

function scriptsServidorDir() {
  const exeDir = path.dirname(process.execPath);
  const installedServerDir = path.join(exeDir, '..', 'SistemaServidor', 'resources', 'server');
  const localServerDir = path.join(__dirname, 'server');

  if (fs.existsSync(installedServerDir)) {
    return installedServerDir;
  }

  return localServerDir;
}

async function healthGateway(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/health`, {
      signal: controller.signal
    });
    return response.ok;
  } catch (_) {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function ejecutarScriptPowerShell(scriptPath) {
  if (!fs.existsSync(scriptPath)) {
    return false;
  }

  const child = spawn('powershell.exe', [
    '-ExecutionPolicy', 'Bypass',
    '-File', scriptPath
  ], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });

  child.unref();
  return true;
}

async function asegurarGatewayLocal() {
  const apiUrl = gatewayUrlActual();
  const apiUrlEfectiva = normalizarGatewayUrl(apiUrl);
  let parsed;

  try {
    parsed = new URL(apiUrl);
  } catch (_) {
    return {
      ok: false,
      started: false,
      local: false,
      apiUrl,
      message: 'La URL del gateway no es valida.'
    };
  }

  if (await healthGateway(apiUrlEfectiva)) {
    return {
      ok: true,
      started: false,
      local: esHostLocal(parsed.hostname),
      apiUrl
    };
  }

  if (!esHostLocal(parsed.hostname)) {
    return {
      ok: false,
      started: false,
      local: false,
      apiUrl,
      message: 'No se pudo conectar con el gateway configurado.'
    };
  }

  const serverScripts = scriptsServidorDir();
  const postgresScript = path.join(serverScripts, 'start-postgresql.ps1');
  const gatewayScript = path.join(serverScripts, 'start-gateway.ps1');

  ejecutarScriptPowerShell(postgresScript);
  await new Promise(resolve => setTimeout(resolve, 2500));
  ejecutarScriptPowerShell(gatewayScript);

  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (await healthGateway(apiUrlEfectiva)) {
      return {
        ok: true,
        started: true,
        local: true,
        apiUrl
      };
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  return {
    ok: false,
    started: true,
    local: true,
    apiUrl,
    message: 'Se intento iniciar el gateway local, pero no respondio a tiempo.'
  };
}

function requireLicense(handler) {
  return async (event, ...args) => {
    await license.requireUsableLicense();
    return handler(event, ...args);
  };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 720,
    center: true,
    autoHideMenuBar: true,
    title: 'Sistema de Caja',
    webPreferences: {
      preload: path.join(__dirname, 'preload-caja.js'),
      contextIsolation: true,
      sandbox: true
    }
  });

  win.loadFile('index-caja.html');
}

function abrirVentana(ruta, titulo, width = 1060, height = 720) {
  const win = new BrowserWindow({
    width,
    height,
    minWidth: 900,
    minHeight: 620,
    center: true,
    autoHideMenuBar: true,
    title: titulo,
    webPreferences: {
      preload: path.join(__dirname, 'preload-caja.js'),
      contextIsolation: true,
      sandbox: true
    }
  });

  win.loadFile(ruta);
}

let ultimoReporteCaja = {
  filtros: {},
  resultado: {
    items: [],
    totales: {
      cobrado: 0,
      devuelto: 0,
      neto: 0,
      movimientos: 0
    }
  }
};

function datosNegocioReporte() {
  const config = configStore.getConfig();
  const street = String(config.pdfBusinessStreet || '').trim();
  const locality = String(config.pdfBusinessLocality || '').trim();
  const province = String(config.pdfBusinessProvince || '').trim();
  const direccion = [
    street,
    [locality, province].filter(Boolean).join(', ')
  ].filter(Boolean).join(' - ');

  return {
    nombre: config.pdfBusinessName || config.sucursalNombre || 'Sistema de Caja',
    direccion: direccion || config.pdfBusinessAddress || '',
    telefono: config.pdfBusinessPhone || '',
    email: config.pdfBusinessEmail || '',
    logoUrl: obtenerLogoReporte()
  };
}

function obtenerLogoReporte() {
  const config = configStore.getConfig();
  const configured = String(config.pdfLogoPath || '').trim();
  const candidates = [
    configured,
    path.join(process.cwd(), 'images', 'logopdf.png'),
    path.join(process.cwd(), 'images', 'logo.png')
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolved = path.isAbsolute(candidate)
      ? candidate
      : path.join(process.cwd(), candidate);

    if (fs.existsSync(resolved)) {
      return pathToFileURL(resolved).href;
    }
  }

  return '';
}

ipcMain.handle('caja:listar-pendientes', () =>
  db.listarCajaPendiente()
);

ipcMain.handle('licencia:estado', () =>
  license.validateLicense()
);

ipcMain.handle('licencia:marcar-aviso', () =>
  license.markWarningShown()
);

ipcMain.handle('licencia:activar', (_, clave) =>
  license.activateLicense(clave)
);

ipcMain.handle('abrir-url-externa', (_, url) =>
  shell.openExternal(url)
);

ipcMain.handle('gateway:asegurar', () =>
  asegurarGatewayLocal()
);

ipcMain.handle('caja:listar-cobrados', (_, limite) =>
  db.listarCajaCobrada(limite)
);

ipcMain.handle('caja:cobrar', requireLicense((_, uuid) =>
  db.cobrarCaja(uuid)
));

ipcMain.handle('caja:devolver', requireLicense((_, data) =>
  db.registrarDevolucionCaja(data)
));

ipcMain.handle('caja:informe', (_, filtros) =>
  db.obtenerInformeCaja(filtros)
);

ipcMain.handle('caja:listado', (_, filtros) =>
  db.obtenerListadoCaja(filtros)
);

ipcMain.handle('caja:ruta-db', () =>
  db.obtenerRutaDB()
);

ipcMain.handle('caja:comprobante-x', (_, uuid) =>
  db.obtenerComprobanteX(uuid)
);

ipcMain.handle('caja:abrir-pdf', async (_, ruta) => {
  const error = await shell.openPath(ruta);
  return !error;
});

ipcMain.handle('caja:whatsapp', (_, data) => {
  const telefono = String(data.telefono || '').replace(/\D/g, '');
  const texto = encodeURIComponent(data.texto || '');
  const url = telefono
    ? `https://wa.me/${telefono}?text=${texto}`
    : `https://wa.me/?text=${texto}`;

  return shell.openExternal(url);
});

ipcMain.handle('caja:abrir-devoluciones', () =>
  abrirVentana('devoluciones-caja.html', 'Devoluciones de Caja', 1120, 720)
);

ipcMain.handle('caja:abrir-listado', () =>
  abrirVentana('listado-caja.html', 'Listado de Caja', 1220, 760)
);

ipcMain.handle('configuracion-obtener', () =>
  configStore.getConfig()
);

ipcMain.handle('caja:abrir-reporte-listado', (_, payload = {}) => {
  ultimoReporteCaja = {
    filtros: payload.filtros || {},
    resultado: payload.resultado || {
      items: [],
      totales: {
        cobrado: 0,
        devuelto: 0,
        neto: 0,
        movimientos: 0
      }
    }
  };

  abrirVentana('reporte-listado-caja.html', 'Reporte de Caja', 1120, 760);
  return true;
});

ipcMain.handle('caja:reporte-listado-data', () => ({
  negocio: datosNegocioReporte(),
  filtros: ultimoReporteCaja.filtros || {},
  dateFormat: configStore.getConfig().dateFormat || 'system',
  currencyCode: configStore.getConfig().currencyCode || 'ARS',
  currencyFormat: configStore.getConfig().currencyFormat || 'system',
  resultado: ultimoReporteCaja.resultado || {
    items: [],
    totales: {
      cobrado: 0,
      devuelto: 0,
      neto: 0,
      movimientos: 0
    }
  }
}));

ipcMain.handle('caja:generar-reporte-listado-pdf', (_, payload = {}) => {
  const config = configStore.getConfig();
  const reportPayload = {
    negocio: payload.negocio || datosNegocioReporte(),
    filtros: payload.filtros || ultimoReporteCaja.filtros || {},
    resultado: payload.resultado || ultimoReporteCaja.resultado || { items: [], totales: {} },
    dateFormat: config.dateFormat || 'system'
  };

  return pdfReporteCaja(reportPayload);
});

app.whenReady().then(createWindow);
