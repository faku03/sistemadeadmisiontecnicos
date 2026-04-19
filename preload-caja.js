const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('apiCaja', {
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
    ipcRenderer.invoke('caja:ruta-db')
});
