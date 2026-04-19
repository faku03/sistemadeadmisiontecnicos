const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const db = require('./db/dbservice');

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

ipcMain.handle('caja:listar-pendientes', () =>
  db.listarCajaPendiente()
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

app.whenReady().then(createWindow);
