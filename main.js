const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./services/data-source');
const pdfIngreso = require('./pdf/ingreso');
const pdfEntrega = require('./pdf/entrega');
const pdfPresupuesto = require('./pdf/presupuesto');

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 720,
    center: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true
    }
  });

  win.loadFile('index.html');

  // 🔔 cuando vuelve a tomar foco
  win.on('focus', () => {
    win.webContents.send('refrescar-combos');
  });
}

/* ================= CLIENTES ================= */
ipcMain.handle('buscar-cliente-dni', (_, dni) =>
  db.buscarClientePorDni(dni)
);

ipcMain.handle('crear-cliente', (_, data) =>
  db.crearCliente(data)
);

/* ================= TICKETS ================= */
ipcMain.handle('crear-ticket', (_, data) => {
  const sucursal = db.obtenerSucursalLocal();

  if (!sucursal) {
    throw new Error('No hay sucursal local configurada');
  }

  return db.crearTicket({
    ...data,
    sucursal_id: sucursal.id
  });
});


ipcMain.handle('listar-tickets', () =>
  db.listarTickets()
);

ipcMain.handle('pdf-ingreso', (_, uuid) => {
  const ticket = db.obtenerTicketParaPDF(uuid);
  return pdfIngreso(ticket);
});

ipcMain.handle('entregar-ticket', (_, data) => {
  db.entregarTicket(data.uuid, data.trabajo, data.garantia);
  const ticket = db.obtenerTicketParaPDF(data.uuid);
  return pdfEntrega(ticket, data.garantia, data.trabajo);
});

ipcMain.handle('actualizar-presupuesto', (_, data) =>
  db.actualizarPresupuesto(data.uuid, data.valor_reparacion, data.sena)
);

ipcMain.handle('enviar-presupuesto', (_, data) => {
  db.enviarPresupuesto(data.uuid, data.valor_reparacion, data.sena);
  const ticket = db.obtenerTicketParaPDF(data.uuid);
  return pdfPresupuesto(ticket);
});

/* ================= COMBOS ================= */
ipcMain.handle('listar-tipos', () =>
  db.listarTipos()
);

ipcMain.handle('listar-marcas', () =>
  db.listarMarcas()
);

ipcMain.handle('listar-modelos', (_, marcaId) =>
  db.listarModelosPorMarca(marcaId)
);

/* ================= SUCURSAL LOCAL ================= */
ipcMain.handle('obtener-sucursal-local', () =>
  db.obtenerSucursalLocal()
);


/* ================= ABM TIPOS DE EQUIPO ================= */
ipcMain.handle('tipos-equipo-listar', (_, includeDeleted) =>
  db.listarTiposEquipo(includeDeleted)
);

ipcMain.handle('tipos-equipo-crear', (_, data) =>
  db.crearTipoEquipo(data)
);

ipcMain.handle('tipos-equipo-actualizar', (_, data) =>
  db.actualizarTipoEquipo(data)
);

ipcMain.handle('tipos-equipo-eliminar', (_, id) =>
  db.eliminarTipoEquipo(id)
);

ipcMain.handle('tipos-equipo-reactivar', (_, id) =>
  db.reactivarTipoEquipo(id)
);

/* ================= ABM MARCAS ================= */
ipcMain.handle('marcas-listar', (_, includeDeleted) =>
  db.listarMarcasEquipo(includeDeleted)
);

ipcMain.handle('marcas-crear', (_, data) =>
  db.crearMarca(data)
);

ipcMain.handle('marcas-actualizar', (_, data) =>
  db.actualizarMarca(data)
);

ipcMain.handle('marcas-eliminar', (_, id) =>
  db.eliminarMarca(id)
);

ipcMain.handle('marcas-reactivar', (_, id) =>
  db.reactivarMarca(id)
);

ipcMain.handle('listar-estados-ticket', () =>
  db.listarEstadosTicket()
);

ipcMain.handle('actualizar-estado-ticket', (_, data) =>
  db.actualizarEstadoTicket(data.uuid, data.estado_id)
);


/* ================= ABRIR ABMs ================= */
function abrirABM(ruta, titulo, w = 700, h = 600) {
  const win = new BrowserWindow({
    width: w,
    height: h,
    title: titulo,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, ruta));
}

ipcMain.handle('abrir-tipos-equipo', () =>
  abrirABM('abm/tipos_equipo.html', 'Tipos de Equipo')
);

ipcMain.handle('abrir-marcas', () =>
  abrirABM('abm/marcas.html', 'Marcas')
);

ipcMain.handle('abrir-modelos', () =>
  abrirABM('abm/modelos.html', 'Modelos')
);

ipcMain.handle('abrir-sucursales', () =>
  abrirABM('abm/sucursales.html', 'Sucursales')
);

// ================= ABM MODELOS =================
ipcMain.handle('modelos-listar', (_, { marcaId, includeDeleted }) =>
  db.listarModelosABM(marcaId, includeDeleted)
);

ipcMain.handle('modelos-crear', (_, data) =>
  db.crearModelo(data)
);

ipcMain.handle('modelos-actualizar', (_, data) =>
  db.actualizarModelo(data)
);

ipcMain.handle('modelos-eliminar', (_, id) =>
  db.eliminarModelo(id)
);

ipcMain.handle('modelos-reactivar', (_, id) =>
  db.reactivarModelo(id)
);

/* ================= ABM SUCURSALES ================= */
ipcMain.handle('sucursales-listar', (_, includeDeleted) =>
  db.listarSucursales(includeDeleted)
);

ipcMain.handle('sucursales-crear', (_, data) =>
  db.crearSucursal(data)
);

ipcMain.handle('sucursales-actualizar', (_, data) =>
  db.actualizarSucursal(data)
);

ipcMain.handle('sucursales-eliminar', (_, id) =>
  db.eliminarSucursal(id)
);

ipcMain.handle('sucursales-reactivar', (_, id) =>
  db.reactivarSucursal(id)
);

ipcMain.handle('caja-generar-movimiento', (_, uuid) =>
  db.generarMovimientoCaja(uuid)
);

ipcMain.handle('caja-cobrar-movimiento', (_, uuid) =>
  db.cerrarMovimientoCaja(uuid)
);


app.whenReady().then(createWindow);

