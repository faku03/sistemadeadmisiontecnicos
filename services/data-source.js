const appConfig = require('../config/app.config');
const { ApiClient } = require('../api/client');
const { readLicenseCache } = require('../license/license-cache');

const api = new ApiClient(process.env.SISTEMA_TICKETS_API_URL || appConfig.apiUrl);

function normalizarCrearCliente(cliente) {
  return cliente?.id || cliente;
}

function codigoTecnicoLicencia() {
  const licencia = readLicenseCache();
  return licencia?.licenseKey ||
    appConfig.licenseKey ||
    appConfig.licenseUnitId ||
    process.env.SISTEMA_TICKETS_LICENSE_KEY ||
    'SINLICENCIA';
}

async function obtenerSucursalParaTicket() {
  const sucursales = await api.listarSucursales(false);
  const sucursal = sucursales.find(s => appConfig.sucursalId && s.codigo === appConfig.sucursalId) ||
    sucursales.find(s => s.sucursal_local) ||
    sucursales[0] ||
    null;

  if (!sucursal) {
    throw new Error('No hay sucursal local configurada');
  }

  return sucursal;
}

module.exports = {
  setAuthToken: token =>
    api.setAuthToken(token),

  authBootstrapAdmin: data =>
    api.authBootstrapAdmin(data),

  authResetAdmin: data =>
    api.authResetAdmin(data),

  authLogin: (username, password) =>
    api.authLogin(username, password),

  authLogout: () =>
    api.authLogout(),

  authVerifyPassword: password =>
    api.authVerifyPassword(password),

  authMe: () =>
    api.authMe(),

  authListUsers: () =>
    api.authListUsers(),

  authListAudit: limit =>
    api.authListAudit(limit),

  authCreateUser: data =>
    api.authCreateUser(data),

  authUpdateUser: data =>
    api.authUpdateUser(data),

  authUpdateUserStatus: (id, isActive) =>
    api.authUpdateUserStatus(id, isActive),

  authResetUserPassword: (id, password) =>
    api.authResetUserPassword(id, password),

  buscarClientePorDni: dni =>
    api.buscarClientePorDni(dni),

  crearCliente: data =>
    api.crearCliente(data).then(normalizarCrearCliente),

  listarClientes: includeDeleted =>
    api.listarClientes(includeDeleted),

  actualizarCliente: data =>
    api.actualizarCliente(data.id, data),

  eliminarCliente: id =>
    api.eliminarCliente(id),

  reactivarCliente: id =>
    api.reactivarCliente(id),

  crearTicket: async data => {
    const sucursal = await obtenerSucursalParaTicket();

    return api.crearTicket({
      ...data,
      sucursal_id: sucursal.id,
      tecnico_codigo: codigoTecnicoLicencia()
    });
  },

  listarTickets: () =>
    api.listarTickets(appConfig.apiSucursalId),

  obtenerTicketParaPDF: uuid =>
    api.obtenerTicketParaPDF(uuid),

  obtenerHistorialTicket: uuid =>
    api.obtenerHistorialTicket(uuid),

  entregarTicket: (uuid, trabajo, garantia) =>
    api.entregarTicket(uuid, { trabajo, garantia }),

  actualizarPresupuesto: (uuid, valor_reparacion, sena, reparacion_presupuestada) =>
    api.guardarPresupuesto(uuid, { valor_reparacion, sena, reparacion_presupuestada }),

  enviarPresupuesto: (uuid, valor_reparacion, sena, reparacion_presupuestada) =>
    api.enviarPresupuesto(uuid, { valor_reparacion, sena, reparacion_presupuestada }),

  listarTipos: () =>
    api.listarTiposEquipo(false),

  listarMarcas: () =>
    api.listarMarcas(false),

  listarModelosPorMarca: marcaId =>
    api.listarModelos({ marcaId, includeDeleted: false }),

  obtenerSucursalLocal: obtenerSucursalParaTicket,

  listarTiposEquipo: includeDeleted =>
    api.listarTiposEquipo(includeDeleted),

  crearTipoEquipo: data =>
    api.crearTipoEquipo(data),

  actualizarTipoEquipo: data =>
    api.actualizarTipoEquipo(data.id, data),

  eliminarTipoEquipo: id =>
    api.eliminarTipoEquipo(id),

  reactivarTipoEquipo: id =>
    api.reactivarTipoEquipo(id),

  listarMarcasEquipo: includeDeleted =>
    api.listarMarcas(includeDeleted),

  crearMarca: data =>
    api.crearMarca(data),

  actualizarMarca: data =>
    api.actualizarMarca(data.id, data),

  eliminarMarca: id =>
    api.eliminarMarca(id),

  reactivarMarca: id =>
    api.reactivarMarca(id),

  listarModelosABM: (marcaIdOrIncludeDeleted, includeDeleted) => {
    const soloIncludeDeleted = typeof marcaIdOrIncludeDeleted === 'boolean';
    return api.listarModelos({
      marcaId: soloIncludeDeleted ? null : marcaIdOrIncludeDeleted,
      includeDeleted: soloIncludeDeleted ? marcaIdOrIncludeDeleted : includeDeleted
    });
  },

  crearModelo: data =>
    api.crearModelo(data),

  actualizarModelo: data =>
    api.actualizarModelo(data.id, data),

  eliminarModelo: id =>
    api.eliminarModelo(id),

  reactivarModelo: id =>
    api.reactivarModelo(id),

  listarSucursales: includeDeleted =>
    api.listarSucursales(includeDeleted),

  crearSucursal: data =>
    api.crearSucursal(data),

  actualizarSucursal: data =>
    api.actualizarSucursal(data.id, data),

  eliminarSucursal: id =>
    api.eliminarSucursal(id),

  reactivarSucursal: id =>
    api.reactivarSucursal(id),

  listarEstadosTicket: () =>
    api.listarEstadosTicket(),

  listarCodigosNomenclador: () =>
    api.listarCodigosNomenclador(),

  actualizarEstadoTicket: (uuid, estado_id) =>
    api.actualizarEstado(uuid, { estado_id }),

  generarMovimientoCaja: uuid =>
    api.actualizarEstado(uuid, { estado_codigo: 'ENTREGADO' }),

  cerrarMovimientoCaja: uuid =>
    api.cobrarCaja(uuid),

  listarCajaPendiente: () =>
    api.listarCajaPendiente(),

  listarCajaCobrada: limite =>
    api.listarCajaCobrada(limite),

  cobrarCaja: uuid =>
    api.cobrarCaja(uuid),

  registrarDevolucionCaja: data =>
    api.registrarDevolucionCaja(data),

  obtenerInformeCaja: filtros =>
    api.obtenerInformeCaja(filtros),

  obtenerListadoCaja: filtros =>
    api.obtenerListadoCaja(filtros),

  obtenerRutaDB: () =>
    appConfig.apiUrl || process.env.SISTEMA_TICKETS_API_URL || 'http://localhost:3000',

  obtenerComprobanteX: uuid =>
    api.obtenerComprobanteX(uuid),

  mode: 'api'
};
