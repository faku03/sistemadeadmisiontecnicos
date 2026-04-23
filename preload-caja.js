const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('apiCaja', {
  obtenerEstadoLicencia: () =>
    ipcRenderer.invoke('licencia:estado'),

  obtenerConfiguracion: () =>
    ipcRenderer.invoke('configuracion-obtener'),

  marcarAvisoLicencia: () =>
    ipcRenderer.invoke('licencia:marcar-aviso'),

  activarLicencia: clave =>
    ipcRenderer.invoke('licencia:activar', clave),

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
    ipcRenderer.invoke('caja:generar-reporte-listado-pdf', data)
});
