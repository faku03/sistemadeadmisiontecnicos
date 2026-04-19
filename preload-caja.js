const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('apiCaja', {
  obtenerEstadoLicencia: () =>
    ipcRenderer.invoke('licencia:estado'),

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

  rutaDB: () =>
    ipcRenderer.invoke('caja:ruta-db'),

  comprobanteX: uuid =>
    ipcRenderer.invoke('caja:comprobante-x', uuid),

  abrirPDF: ruta =>
    ipcRenderer.invoke('caja:abrir-pdf', ruta),

  whatsapp: data =>
    ipcRenderer.invoke('caja:whatsapp', data)
});
