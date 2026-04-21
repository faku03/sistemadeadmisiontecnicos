const { contextBridge, ipcRenderer } = require('electron');

/* ================= API PRINCIPAL ================= */
contextBridge.exposeInMainWorld('api', {
  // ===== LICENCIA =====
  obtenerEstadoLicencia: () =>
    ipcRenderer.invoke('licencia:estado'),

  marcarAvisoLicencia: () =>
    ipcRenderer.invoke('licencia:marcar-aviso'),

  activarLicencia: clave =>
    ipcRenderer.invoke('licencia:activar', clave),

  // ===== CLIENTES =====
  buscarClientePorDni: dni =>
    ipcRenderer.invoke('buscar-cliente-dni', dni),

  crearCliente: data =>
    ipcRenderer.invoke('crear-cliente', data),

  // ===== TICKETS =====
  crearTicket: data =>
    ipcRenderer.invoke('crear-ticket', data),

  listarTickets: () =>
    ipcRenderer.invoke('listar-tickets'),

  generarPDFIngreso: uuid =>
    ipcRenderer.invoke('pdf-ingreso', uuid),

  entregarTicket: data =>
    ipcRenderer.invoke('entregar-ticket', data),

  actualizarPresupuesto: data =>
    ipcRenderer.invoke('actualizar-presupuesto', data),

  enviarPresupuesto: data =>
    ipcRenderer.invoke('enviar-presupuesto', data),

  enviarWhatsAppPresupuesto: data =>
    ipcRenderer.invoke('whatsapp-presupuesto', data),

  generarMovimientoCaja: uuid =>
    ipcRenderer.invoke('caja-generar-movimiento', uuid),

  cobrarMovimientoCaja: uuid =>
    ipcRenderer.invoke('caja-cobrar-movimiento', uuid),

  // ===== COMBOS =====
  listarTipos: () =>
    ipcRenderer.invoke('listar-tipos'),

  listarMarcas: () =>
    ipcRenderer.invoke('listar-marcas'),

  listarModelosPorMarca: marcaId =>
    ipcRenderer.invoke('listar-modelos', marcaId),

  // ===== SUCURSAL =====
  obtenerSucursalLocal: () =>
    ipcRenderer.invoke('obtener-sucursal-local'),

  // ===== ABRIR ABMs =====
  abrirTiposEquipo: () =>
    ipcRenderer.invoke('abrir-tipos-equipo'),

  abrirMarcas: () =>
    ipcRenderer.invoke('abrir-marcas'),

  abrirModelos: () =>
    ipcRenderer.invoke('abrir-modelos'),

  abrirClientes: () =>
    ipcRenderer.invoke('abrir-clientes'),

  abrirSucursales: () =>
    ipcRenderer.invoke('abrir-sucursales'),

  abrirTickets: () =>
    ipcRenderer.invoke('abrir-tickets'),

  abrirAlertasTickets: () =>
    ipcRenderer.invoke('abrir-alertas-tickets'),

  abrirConfiguracion: () =>
    ipcRenderer.invoke('abrir-configuracion'),

  abrirHistorialTicket: uuid =>
    ipcRenderer.invoke('abrir-historial-ticket', uuid),

  listarEstadosTicket: () =>  ipcRenderer.invoke('listar-estados-ticket'),
  actualizarEstadoTicket: data => ipcRenderer.invoke('actualizar-estado-ticket', data),

  obtenerHistorialTicket: uuid =>
    ipcRenderer.invoke('ticket-obtener-historial', uuid),

  obtenerConfiguracion: () =>
    ipcRenderer.invoke('configuracion-obtener'),

  guardarConfiguracion: data =>
    ipcRenderer.invoke('configuracion-guardar', data),

  seleccionarLogoPdf: () =>
    ipcRenderer.invoke('configuracion-seleccionar-logo'),

  probarPdfConfiguracion: data =>
    ipcRenderer.invoke('configuracion-probar-pdf', data)

});

/* ================= API TIPOS DE EQUIPO (ABM) ================= */
contextBridge.exposeInMainWorld('apiTiposEquipo', {
  listar: verEliminados =>
    ipcRenderer.invoke('tipos-equipo-listar', verEliminados),

  crear: data =>
    ipcRenderer.invoke('tipos-equipo-crear', data),

  actualizar: data =>
    ipcRenderer.invoke('tipos-equipo-actualizar', data),

  eliminar: id =>
    ipcRenderer.invoke('tipos-equipo-eliminar', id),

  reactivar: id =>
    ipcRenderer.invoke('tipos-equipo-reactivar', id)
});

/* ================= API MARCAS (ABM) ================= */
contextBridge.exposeInMainWorld('apiMarcas', {
  listar: verEliminados =>
    ipcRenderer.invoke('marcas-listar', verEliminados),

  crear: data =>
    ipcRenderer.invoke('marcas-crear', data),

  actualizar: data =>
    ipcRenderer.invoke('marcas-actualizar', data),

  eliminar: id =>
    ipcRenderer.invoke('marcas-eliminar', id),

  reactivar: id =>
    ipcRenderer.invoke('marcas-reactivar', id)
});

/* ================= API MODELOS ================= */
contextBridge.exposeInMainWorld('apiModelos', {
  listar: (marcaId, verEliminados) =>
    ipcRenderer.invoke('modelos-listar', {
      marcaId,
      includeDeleted: verEliminados
    }),

  crear: data =>
    ipcRenderer.invoke('modelos-crear', data),

  actualizar: data =>
    ipcRenderer.invoke('modelos-actualizar', data),

  eliminar: id =>
    ipcRenderer.invoke('modelos-eliminar', id),

  reactivar: id =>
    ipcRenderer.invoke('modelos-reactivar', id)
});

contextBridge.exposeInMainWorld('eventos', {
  onRefrescarCombos: (callback) =>
    ipcRenderer.on('refrescar-combos', callback),

  onConfiguracionActualizada: (callback) =>
    ipcRenderer.on('configuracion-actualizada', (_, data) => callback(data))
});

/* ================= API SUCURSALES ================= */
contextBridge.exposeInMainWorld('apiSucursales', {
  listar: verEliminados =>
    ipcRenderer.invoke('sucursales-listar', verEliminados),

  crear: data =>
    ipcRenderer.invoke('sucursales-crear', data),

  actualizar: data =>
    ipcRenderer.invoke('sucursales-actualizar', data),

  eliminar: id =>
    ipcRenderer.invoke('sucursales-eliminar', id),

  reactivar: id =>
    ipcRenderer.invoke('sucursales-reactivar', id),

  obtenerSucursalLocal: () =>
    ipcRenderer.invoke('obtener-sucursal-local')
});

/* ================= API CLIENTES (ABM) ================= */
contextBridge.exposeInMainWorld('apiClientes', {
  listar: verEliminados =>
    ipcRenderer.invoke('clientes-listar', verEliminados),

  crear: data =>
    ipcRenderer.invoke('clientes-crear', data),

  actualizar: data =>
    ipcRenderer.invoke('clientes-actualizar', data),

  eliminar: id =>
    ipcRenderer.invoke('clientes-eliminar', id),

  reactivar: id =>
    ipcRenderer.invoke('clientes-reactivar', id)
});
