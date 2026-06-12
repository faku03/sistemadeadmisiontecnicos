const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('apiCaja', {
  login: (username, password) =>
    ipcRenderer.invoke('auth:login', { username, password }),

  cerrarSesion: () =>
    ipcRenderer.invoke('auth:logout'),

  obtenerUsuarioActual: () =>
    ipcRenderer.invoke('auth:current-user'),

  bootstrapAdmin: data =>
    ipcRenderer.invoke('auth:bootstrap-admin', data),

  restablecerClaveAdmin: data =>
    ipcRenderer.invoke('auth:reset-admin', data),

  verificarClaveAdmin: password =>
    ipcRenderer.invoke('auth:verify-password', { password }),

  obtenerContextoAdmin: () =>
    ipcRenderer.invoke('auth:contexto-admin'),

  listarUsuarios: () =>
    ipcRenderer.invoke('auth:list-users'),

  listarAuditoriaUsuarios: limit =>
    ipcRenderer.invoke('auth:list-audit', limit),

  crearUsuario: data =>
    ipcRenderer.invoke('auth:create-user', data),

  actualizarUsuario: data =>
    ipcRenderer.invoke('auth:update-user', data),

  actualizarEstadoUsuario: (id, isActive) =>
    ipcRenderer.invoke('auth:update-user-status', { id, isActive }),

  restablecerClaveUsuario: (id, password) =>
    ipcRenderer.invoke('auth:reset-user-password', { id, password }),

  obtenerEstadoLicencia: () =>
    ipcRenderer.invoke('licencia:estado'),

  obtenerConfiguracion: () =>
    ipcRenderer.invoke('configuracion-obtener'),

  marcarAvisoLicencia: () =>
    ipcRenderer.invoke('licencia:marcar-aviso'),

  activarLicencia: clave =>
    ipcRenderer.invoke('licencia:activar', clave),

  abrirUrlExterna: url =>
    ipcRenderer.invoke('abrir-url-externa', url),

  guardarSolicitudLicencia: texto =>
    ipcRenderer.invoke('licencia:guardar-solicitud-txt', texto),

  asegurarGateway: () =>
    ipcRenderer.invoke('gateway:asegurar'),

  listarPendientes: () =>
    ipcRenderer.invoke('caja:listar-pendientes'),

  listarCobrados: limite =>
    ipcRenderer.invoke('caja:listar-cobrados', limite),

  cobrar: uuid =>
    ipcRenderer.invoke('caja:cobrar', uuid),

  devolver: data =>
    ipcRenderer.invoke('caja:devolver', data),

  informe: filtros =>
    ipcRenderer.invoke('caja:informe', filtros),

  listado: filtros =>
    ipcRenderer.invoke('caja:listado', filtros),

  rutaDB: () =>
    ipcRenderer.invoke('caja:ruta-db'),

  comprobanteX: uuid =>
    ipcRenderer.invoke('caja:comprobante-x', uuid),

  abrirPDF: ruta =>
    ipcRenderer.invoke('caja:abrir-pdf', ruta),

  whatsapp: data =>
    ipcRenderer.invoke('caja:whatsapp', data),

  abrirDevoluciones: () =>
    ipcRenderer.invoke('caja:abrir-devoluciones'),

  abrirListado: () =>
    ipcRenderer.invoke('caja:abrir-listado'),

  abrirReporteListado: data =>
    ipcRenderer.invoke('caja:abrir-reporte-listado', data),

  obtenerReporteListado: () =>
    ipcRenderer.invoke('caja:reporte-listado-data'),

  generarReporteListadoPdf: data =>
    ipcRenderer.invoke('caja:generar-reporte-listado-pdf', data),

  abrirUrlExterna: url =>
    ipcRenderer.invoke('abrir-url-externa', url)
});
