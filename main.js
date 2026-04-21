const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const db = require('./services/data-source');
const pdfIngreso = require('./pdf/ingreso');
const pdfEntrega = require('./pdf/entrega');
const pdfPresupuesto = require('./pdf/presupuesto');
const license = require('./license/license-service');

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
ipcMain.handle('licencia:estado', () =>
  license.validateLicense()
);

ipcMain.handle('licencia:marcar-aviso', () =>
  license.markWarningShown()
);

ipcMain.handle('licencia:activar', (_, clave) =>
  license.activateLicense(clave)
);

ipcMain.handle('buscar-cliente-dni', (_, dni) =>
  db.buscarClientePorDni(dni)
);

ipcMain.handle('crear-cliente', (_, data) =>
  db.crearCliente(data)
);

ipcMain.handle('clientes-listar', (_, includeDeleted) =>
  db.listarClientes(includeDeleted)
);

ipcMain.handle('clientes-crear', (_, data) =>
  db.crearCliente(data)
);

ipcMain.handle('clientes-actualizar', (_, data) =>
  db.actualizarCliente(data)
);

ipcMain.handle('clientes-eliminar', (_, id) =>
  db.eliminarCliente(id)
);

ipcMain.handle('clientes-reactivar', (_, id) =>
  db.reactivarCliente(id)
);

/* ================= TICKETS ================= */
ipcMain.handle('crear-ticket', async (_, data) => {
  const sucursal = await db.obtenerSucursalLocal();

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

ipcMain.handle('pdf-ingreso', async (_, uuid) => {
  const ticket = await db.obtenerTicketParaPDF(uuid);
  const filePath = pdfIngreso(ticket);
  const error = await shell.openPath(filePath);
  if (error) {
    throw new Error(error);
  }
  return filePath;
});

ipcMain.handle('entregar-ticket', async (_, data) => {
  await db.entregarTicket(data.uuid, data.trabajo, data.garantia);
  const ticket = await db.obtenerTicketParaPDF(data.uuid);
  return pdfEntrega(ticket, data.garantia, data.trabajo);
});

ipcMain.handle('actualizar-presupuesto', (_, data) =>
  db.actualizarPresupuesto(data.uuid, data.valor_reparacion, data.sena, data.reparacion_presupuestada)
);

ipcMain.handle('enviar-presupuesto', async (_, data) => {
  await db.enviarPresupuesto(data.uuid, data.valor_reparacion, data.sena, data.reparacion_presupuestada);
  const ticket = await db.obtenerTicketParaPDF(data.uuid);
  return pdfPresupuesto(ticket);
});

ipcMain.handle('whatsapp-presupuesto', (_, data) => {
  const telefono = String(data.telefono || '').replace(/\D/g, '');
  const texto = encodeURIComponent(data.texto || '');
  const url = telefono
    ? `https://wa.me/${telefono}?text=${texto}`
    : `https://wa.me/?text=${texto}`;

  return shell.openExternal(url);
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
function abrirABM(ruta, titulo, w = 1060, h = 720) {
  const win = new BrowserWindow({
    width: w,
    height: h,
    minWidth: 900,
    minHeight: 620,
    center: true,
    title: titulo,
    autoHideMenuBar: true,
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

ipcMain.handle('abrir-clientes', () =>
  abrirABM('abm/clientes.html', 'Clientes')
);

ipcMain.handle('abrir-sucursales', () =>
  abrirABM('abm/sucursales.html', 'Sucursales')
);

ipcMain.handle('abrir-tickets', () =>
  abrirABM('tickets.html', 'Todos los Tickets', 1220, 760)
);

ipcMain.handle('abrir-alertas-tickets', () =>
  abrirABM('alertas.html', 'Alertas de Tickets', 1120, 760)
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

