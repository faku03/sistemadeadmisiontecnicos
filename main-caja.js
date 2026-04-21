const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const db = require('./services/data-source');
const license = require('./license/license-service');

const appDataBase = path.join(process.env.APPDATA || app.getPath('appData'), 'SistemaTicketsCaja');
const electronSessionDir = path.join(appDataBase, 'electron-session');
const electronCacheDir = path.join(appDataBase, 'electron-cache');

fs.mkdirSync(electronSessionDir, { recursive: true });
fs.mkdirSync(electronCacheDir, { recursive: true });

app.setPath('sessionData', electronSessionDir);
app.commandLine.appendSwitch('disk-cache-dir', electronCacheDir);
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

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

ipcMain.handle('caja:listar-cobrados', (_, limite) =>
  db.listarCajaCobrada(limite)
);

ipcMain.handle('caja:cobrar', (_, uuid) =>
  db.cobrarCaja(uuid)
);

ipcMain.handle('caja:devolver', (_, data) =>
  db.registrarDevolucionCaja(data)
);

ipcMain.handle('caja:informe', (_, filtros) =>
  db.obtenerInformeCaja(filtros)
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

app.whenReady().then(createWindow);
