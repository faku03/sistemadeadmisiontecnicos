const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const db = require('./services/data-source');
const pdfIngreso = require('./pdf/ingreso');
const pdfEntrega = require('./pdf/entrega');
const pdfPresupuesto = require('./pdf/presupuesto');
const pdfConfiguracionPreview = require('./pdf/configuracion-preview');
const license = require('./license/license-service');
const configStore = require('./config/store');
const { readLicenseCache } = require('./license/license-cache');

const appDataBase = path.join(process.env.APPDATA || app.getPath('appData'), 'SistemaTickets');
const electronSessionDir = path.join(appDataBase, 'electron-session');
const electronCacheDir = path.join(appDataBase, 'electron-cache');

fs.mkdirSync(electronSessionDir, { recursive: true });
fs.mkdirSync(electronCacheDir, { recursive: true });

app.setPath('sessionData', electronSessionDir);
app.commandLine.appendSwitch('disk-cache-dir', electronCacheDir);
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

let loginWindow = null;
let mainWindow = null;
let authSession = null;

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
  const installedServerDirs = [
    path.join(exeDir, '..', 'resources', 'server'),
    path.join(exeDir, '..', 'FaroDeskServidor', 'resources', 'server'),
    path.join(exeDir, '..', 'SistemaServidor', 'resources', 'server')
  ];
  const localServerDir = path.join(__dirname, 'server');

  for (const installedServerDir of installedServerDirs) {
    if (fs.existsSync(installedServerDir)) {
      return installedServerDir;
    }
  }

  return localServerDir;
}

function leerAdminTokenServidor() {
  if (process.env.SISTEMA_TICKETS_ADMIN_TOKEN) {
    return String(process.env.SISTEMA_TICKETS_ADMIN_TOKEN).trim();
  }

  const exeDir = path.dirname(process.execPath);
  const candidates = [
    path.join(exeDir, 'server.config.json'),
    path.join(exeDir, '..', 'server.config.json'),
    path.join(exeDir, '..', 'FaroDeskServidor', 'server.config.json'),
    path.join(exeDir, '..', 'SistemaServidor', 'server.config.json'),
    path.join(__dirname, 'server.config.json')
  ];

  for (const configPath of candidates) {
    try {
      if (!fs.existsSync(configPath)) continue;
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const token = String(parsed.SISTEMA_TICKETS_ADMIN_TOKEN || '').trim();
      if (token) return token;
    } catch (_) {
      // Sigue con la siguiente ubicacion posible.
    }
  }

  return '';
}

async function ejecutarConTokenAdminServidor(handler) {
  const token = leerAdminTokenServidor();

  if (token) {
    db.setAuthToken(token);
  }

  try {
    return await handler();
  } finally {
    db.setAuthToken(authSession?.token || '');
  }
}

function contextoAdmin() {
  const config = configStore.getConfig();
  const licenseCache = readLicenseCache() || {};

  return {
    username: 'admin',
    licenseKey: licenseCache.licenseKey || config.licenseKey || '',
    licenseUnitId: config.licenseUnitId || config.sucursalId || '',
    sucursalId: config.sucursalId || '',
    businessTaxId: config.businessTaxId || ''
  };
}

function requireAdminSession() {
  if (!authSession || authSession.user?.role !== 'ADMIN') {
    throw new Error('Solo un administrador puede realizar esta accion.');
  }

  return authSession;
}

function requireRoles(...roles) {
  const allowed = roles.map(role => String(role || '').toUpperCase());
  const currentRole = String(authSession?.user?.role || '').toUpperCase();

  if (!authSession || !allowed.includes(currentRole)) {
    throw new Error('No tiene permisos para realizar esta accion.');
  }

  return authSession;
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
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy', 'Bypass',
    '-WindowStyle', 'Hidden',
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
  await new Promise(resolve => setTimeout(resolve, 5000));
  ejecutarScriptPowerShell(gatewayScript);

  const deadline = Date.now() + 90000;
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
    message: 'Se intento iniciar el gateway local, pero no respondio a tiempo. Revisa C:\\ProgramData\\MardelTech\\SistemaTickets\\logs.'
  };
}

function requireLicense(handler) {
  return async (event, ...args) => {
    await license.requireUsableLicense();
    return handler(event, ...args);
  };
}

function createMainWindow() {
  const createdAt = Date.now();
  mainWindow = new BrowserWindow({
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

  mainWindow.loadFile('index.html');

  // 🔔 cuando vuelve a tomar foco
  mainWindow.on('closed', () => {
    mainWindow = null;
    authSession = null;
    db.setAuthToken('');
  });

  mainWindow.on('focus', () => {
    if ((Date.now() - createdAt) < 2500) {
      return;
    }
    mainWindow.webContents.send('refrescar-combos');
  });
}

function createLoginWindow() {
  if (loginWindow) {
    loginWindow.focus();
    return;
  }

  loginWindow = new BrowserWindow({
    width: 520,
    height: 460,
    center: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    title: 'Ingreso al sistema',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true
    }
  });

  loginWindow.loadFile('login.html');

  loginWindow.on('closed', () => {
    loginWindow = null;
    if (!mainWindow && !authSession) {
      app.quit();
    }
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

ipcMain.handle('abrir-url-externa', (_, url) =>
  shell.openExternal(url)
);

ipcMain.handle('licencia:guardar-solicitud-txt', async (_, texto) => {
  const outputDir = path.join(app.getPath('documents'), 'SistemaTickets', 'solicitudes-licencia');
  const fileName = `solicitud-licencia-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
  const filePath = path.join(outputDir, fileName);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(filePath, String(texto || ''), 'utf8');
  await shell.openPath(filePath);
  return filePath;
});

ipcMain.handle('gateway:asegurar', () =>
  asegurarGatewayLocal()
);

ipcMain.handle('auth:contexto-admin', () =>
  contextoAdmin()
);

ipcMain.handle('auth:bootstrap-admin', async (_, data = {}) => {
  const gateway = await asegurarGatewayLocal();
  if (!gateway.ok) {
    throw new Error(gateway.message || 'No se pudo preparar el gateway local.');
  }

  return ejecutarConTokenAdminServidor(() => db.authBootstrapAdmin(data));
});

ipcMain.handle('auth:reset-admin', async (_, data = {}) => {
  const gateway = await asegurarGatewayLocal();
  if (!gateway.ok) {
    throw new Error(gateway.message || 'No se pudo preparar el gateway local.');
  }

  return ejecutarConTokenAdminServidor(() => db.authResetAdmin(data));
});

ipcMain.handle('auth:login', async (_, credentials = {}) => {
  const gateway = await asegurarGatewayLocal();
  if (!gateway.ok) {
    throw new Error(gateway.message || 'No se pudo iniciar el gateway local.');
  }

  const session = await db.authLogin(credentials.username, credentials.password);
  authSession = session;
  db.setAuthToken(session.token || '');

  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.close();
  }

  createMainWindow();
  return session.user;
});

ipcMain.handle('auth:logout', async () => {
  try {
    await db.authLogout();
  } catch (_) {
    // no-op
  }

  authSession = null;
  db.setAuthToken('');

  BrowserWindow.getAllWindows().forEach(window => {
    if (!window.isDestroyed()) {
      window.close();
    }
  });

  createLoginWindow();
  return { ok: true };
});

ipcMain.handle('auth:verify-password', async (_, data = {}) => {
  if (!authSession || authSession.user?.role !== 'ADMIN') {
    throw new Error('Solo un administrador puede validar la clave.');
  }

  return db.authVerifyPassword(data.password);
});

ipcMain.handle('auth:current-user', () =>
  authSession?.user || null
);

ipcMain.handle('auth:list-users', async () => {
  if (!authSession || authSession.user?.role !== 'ADMIN') {
    throw new Error('Solo un administrador puede listar usuarios.');
  }

  return db.authListUsers();
});

ipcMain.handle('auth:list-audit', async (_, limit = 80) => {
  if (!authSession || authSession.user?.role !== 'ADMIN') {
    throw new Error('Solo un administrador puede ver la auditoria.');
  }

  return db.authListAudit(limit);
});

ipcMain.handle('auth:create-user', async (_, data = {}) => {
  if (!authSession || authSession.user?.role !== 'ADMIN') {
    throw new Error('Solo un administrador puede crear usuarios.');
  }

  return db.authCreateUser(data);
});

ipcMain.handle('auth:update-user', async (_, data = {}) => {
  if (!authSession || authSession.user?.role !== 'ADMIN') {
    throw new Error('Solo un administrador puede editar usuarios.');
  }

  return db.authUpdateUser(data);
});

ipcMain.handle('auth:update-user-status', async (_, data = {}) => {
  if (!authSession || authSession.user?.role !== 'ADMIN') {
    throw new Error('Solo un administrador puede cambiar el estado de usuarios.');
  }

  return db.authUpdateUserStatus(data.id, data.isActive);
});

ipcMain.handle('auth:reset-user-password', async (_, data = {}) => {
  if (!authSession || authSession.user?.role !== 'ADMIN') {
    throw new Error('Solo un administrador puede restablecer claves.');
  }

  return db.authResetUserPassword(data.id, data.password);
});

ipcMain.handle('buscar-cliente-dni', (_, dni) =>
  db.buscarClientePorDni(dni)
);

ipcMain.handle('crear-cliente', requireLicense((_, data) =>
  db.crearCliente(data)
));

ipcMain.handle('clientes-listar', (_, includeDeleted) =>
  db.listarClientes(includeDeleted)
);

ipcMain.handle('clientes-crear', requireLicense((_, data) =>
  db.crearCliente(data)
));

ipcMain.handle('clientes-actualizar', requireLicense((_, data) =>
  db.actualizarCliente(data)
));

ipcMain.handle('clientes-eliminar', requireLicense((_, id) =>
  db.eliminarCliente(id)
));

ipcMain.handle('clientes-reactivar', requireLicense((_, id) =>
  db.reactivarCliente(id)
));

/* ================= TICKETS ================= */
ipcMain.handle('crear-ticket', requireLicense(async (_, data) => {
  const sucursal = await db.obtenerSucursalLocal();

  if (!sucursal) {
    throw new Error('No hay sucursal local configurada');
  }

  return db.crearTicket({
    ...data,
    sucursal_id: sucursal.id
  });
}));


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

ipcMain.handle('entregar-ticket', requireLicense(async (_, data) => {
  await db.entregarTicket(data.uuid, data.trabajo, data.garantia);
  const ticket = await db.obtenerTicketParaPDF(data.uuid);
  return pdfEntrega(ticket, data.garantia, data.trabajo);
}));

ipcMain.handle('actualizar-presupuesto', requireLicense((_, data) =>
  db.actualizarPresupuesto(data.uuid, data.valor_reparacion, data.sena, data.reparacion_presupuestada)
));

ipcMain.handle('enviar-presupuesto', requireLicense(async (_, data) => {
  await db.enviarPresupuesto(data.uuid, data.valor_reparacion, data.sena, data.reparacion_presupuestada);
  const ticket = await db.obtenerTicketParaPDF(data.uuid);
  return pdfPresupuesto(ticket);
}));

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

ipcMain.handle('configuracion-obtener', () =>
  configStore.getConfig()
);

ipcMain.handle('configuracion-guardar', (_, data) => {
  requireAdminSession();
  const saved = configStore.saveConfig(data);

  BrowserWindow.getAllWindows().forEach(window => {
    if (!window.isDestroyed()) {
      window.webContents.send('configuracion-actualizada', saved);
    }
  });

  return saved;
});

ipcMain.handle('configuracion-seleccionar-logo', async (event) => {
  requireAdminSession();
  const parent = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(parent || undefined, {
    title: 'Seleccionar logo para PDF',
    properties: ['openFile'],
    filters: [
      { name: 'Imagenes', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
    ]
  });

  if (result.canceled || !result.filePaths?.length) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('configuracion-probar-pdf', async (_, data) => {
  requireAdminSession();
  const filePath = pdfConfiguracionPreview(data);
  const error = await shell.openPath(filePath);
  if (error) {
    throw new Error(error);
  }
  return filePath;
});


/* ================= ABM TIPOS DE EQUIPO ================= */
ipcMain.handle('tipos-equipo-listar', (_, includeDeleted) =>
  db.listarTiposEquipo(includeDeleted)
);

ipcMain.handle('tipos-equipo-crear', requireLicense((_, data) =>
  db.crearTipoEquipo(data)
));

ipcMain.handle('tipos-equipo-actualizar', requireLicense((_, data) =>
  db.actualizarTipoEquipo(data)
));

ipcMain.handle('tipos-equipo-eliminar', requireLicense((_, id) =>
  db.eliminarTipoEquipo(id)
));

ipcMain.handle('tipos-equipo-reactivar', requireLicense((_, id) =>
  db.reactivarTipoEquipo(id)
));

/* ================= ABM MARCAS ================= */
ipcMain.handle('marcas-listar', (_, includeDeleted) =>
  db.listarMarcasEquipo(includeDeleted)
);

ipcMain.handle('marcas-crear', requireLicense((_, data) =>
  db.crearMarca(data)
));

ipcMain.handle('marcas-actualizar', requireLicense((_, data) =>
  db.actualizarMarca(data)
));

ipcMain.handle('marcas-eliminar', requireLicense((_, id) =>
  db.eliminarMarca(id)
));

ipcMain.handle('marcas-reactivar', requireLicense((_, id) =>
  db.reactivarMarca(id)
));

ipcMain.handle('listar-estados-ticket', () =>
  db.listarEstadosTicket()
);

ipcMain.handle('actualizar-estado-ticket', requireLicense((_, data) =>
  db.actualizarEstadoTicket(data.uuid, data.estado_id)
));


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

function abrirVentanaModal(event, ruta, titulo, w = 860, h = 620) {
  const parent = BrowserWindow.fromWebContents(event.sender);
  const win = new BrowserWindow({
    width: w,
    height: h,
    minWidth: 760,
    minHeight: 520,
    center: true,
    title: titulo,
    autoHideMenuBar: true,
    modal: Boolean(parent),
    parent: parent || undefined,
    alwaysOnTop: true,
    minimizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, ruta));
}

ipcMain.handle('abrir-tipos-equipo', () =>
  (requireRoles('ADMIN', 'OPERADOR'), abrirABM('abm/tipos_equipo.html', 'Tipos de Equipo'))
);

ipcMain.handle('abrir-marcas', () =>
  (requireRoles('ADMIN', 'OPERADOR'), abrirABM('abm/marcas.html', 'Marcas'))
);

ipcMain.handle('abrir-modelos', () =>
  (requireRoles('ADMIN', 'OPERADOR'), abrirABM('abm/modelos.html', 'Modelos'))
);

ipcMain.handle('abrir-clientes', () =>
  (requireRoles('ADMIN', 'OPERADOR'), abrirABM('abm/clientes.html', 'Clientes'))
);

ipcMain.handle('abrir-sucursales', () =>
  (requireAdminSession(), abrirABM('abm/sucursales.html', 'Sucursales'))
);

ipcMain.handle('abrir-tickets', () =>
  abrirABM('tickets.html', 'Todos los Tickets', 1220, 760)
);

ipcMain.handle('abrir-alertas-tickets', () =>
  abrirABM('alertas.html', 'Alertas de Tickets', 1120, 760)
);

ipcMain.handle('abrir-configuracion', () =>
  (requireAdminSession(), abrirABM('configuracion.html', 'Configuracion', 980, 720))
);

ipcMain.handle('abrir-historial-ticket', (event, uuid) =>
  (() => {
    const parent = BrowserWindow.fromWebContents(event.sender);
    const win = new BrowserWindow({
      width: 920,
      height: 640,
      minWidth: 760,
      minHeight: 520,
      center: true,
      title: 'Historial del Ticket',
      autoHideMenuBar: true,
      modal: Boolean(parent),
      parent: parent || undefined,
      alwaysOnTop: true,
      minimizable: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        sandbox: true
      }
    });

    win.loadFile(path.join(__dirname, 'historial-ticket.html'), {
      query: { uuid }
    });
  })()
);

ipcMain.handle('ticket-obtener-historial', (_, uuid) =>
  db.obtenerHistorialTicket(uuid)
);

// ================= ABM MODELOS =================
ipcMain.handle('modelos-listar', (_, { marcaId, includeDeleted }) =>
  db.listarModelosABM(marcaId, includeDeleted)
);

ipcMain.handle('modelos-crear', requireLicense((_, data) =>
  db.crearModelo(data)
));

ipcMain.handle('modelos-actualizar', requireLicense((_, data) =>
  db.actualizarModelo(data)
));

ipcMain.handle('modelos-eliminar', requireLicense((_, id) =>
  db.eliminarModelo(id)
));

ipcMain.handle('modelos-reactivar', requireLicense((_, id) =>
  db.reactivarModelo(id)
));

/* ================= ABM SUCURSALES ================= */
ipcMain.handle('sucursales-listar', (_, includeDeleted) =>
  db.listarSucursales(includeDeleted)
);

ipcMain.handle('sucursales-crear', requireLicense((_, data) =>
  db.crearSucursal(data)
));

ipcMain.handle('sucursales-actualizar', requireLicense((_, data) =>
  db.actualizarSucursal(data)
));

ipcMain.handle('sucursales-eliminar', requireLicense((_, id) =>
  db.eliminarSucursal(id)
));

ipcMain.handle('sucursales-reactivar', requireLicense((_, id) =>
  db.reactivarSucursal(id)
));

ipcMain.handle('caja-generar-movimiento', requireLicense((_, uuid) =>
  db.generarMovimientoCaja(uuid)
));

ipcMain.handle('caja-cobrar-movimiento', requireLicense((_, uuid) =>
  db.cerrarMovimientoCaja(uuid)
));


app.whenReady().then(() => {
  db.setAuthToken('');
  createLoginWindow();
});

app.on('activate', () => {
  if (!loginWindow && !mainWindow) {
    createLoginWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

