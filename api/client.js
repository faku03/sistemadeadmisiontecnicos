const os = require('os');

const DEFAULT_API_URL = 'http://localhost:3000';

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

function normalizarBaseUrl(rawUrl) {
  const safeUrl = String(rawUrl || DEFAULT_API_URL).trim() || DEFAULT_API_URL;

  try {
    const parsed = new URL(safeUrl);
    if (esHostLocal(parsed.hostname) && parsed.hostname !== '127.0.0.1') {
      parsed.hostname = '127.0.0.1';
    }
    return parsed.toString().replace(/\/$/, '');
  } catch (_) {
    return safeUrl.replace(/\/$/, '');
  }
}

class ApiClient {
  constructor(baseUrl = process.env.SISTEMA_TICKETS_API_URL || DEFAULT_API_URL) {
    this.baseUrl = normalizarBaseUrl(baseUrl);
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || `Error HTTP ${response.status}`);
    }

    return data;
  }

  health() {
    return this.request('/health');
  }

  listarTickets(sucursalId) {
    const qs = sucursalId ? `?sucursal_id=${encodeURIComponent(sucursalId)}` : '';
    return this.request(`/tickets${qs}`);
  }

  buscarClientePorDni(dni) {
    return this.request(`/clientes/buscar?dni=${encodeURIComponent(dni)}`);
  }

  crearCliente(data) {
    return this.request('/clientes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  listarClientes(includeDeleted = false) {
    return this.request(`/clientes?includeDeleted=${includeDeleted ? 'true' : 'false'}`);
  }

  actualizarCliente(id, data) {
    return this.request(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  eliminarCliente(id) {
    return this.request(`/clientes/${id}`, {
      method: 'DELETE'
    });
  }

  reactivarCliente(id) {
    return this.request(`/clientes/${id}/reactivar`, {
      method: 'POST'
    });
  }

  listarTiposEquipo(includeDeleted = false) {
    return this.request(`/tipos-equipo?includeDeleted=${includeDeleted ? 'true' : 'false'}`);
  }

  crearTipoEquipo(data) {
    return this.request('/tipos-equipo', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  actualizarTipoEquipo(id, data) {
    return this.request(`/tipos-equipo/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  eliminarTipoEquipo(id) {
    return this.request(`/tipos-equipo/${id}`, {
      method: 'DELETE'
    });
  }

  reactivarTipoEquipo(id) {
    return this.request(`/tipos-equipo/${id}/reactivar`, {
      method: 'POST'
    });
  }

  listarMarcas(includeDeleted = false) {
    return this.request(`/marcas?includeDeleted=${includeDeleted ? 'true' : 'false'}`);
  }

  crearMarca(data) {
    return this.request('/marcas', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  actualizarMarca(id, data) {
    return this.request(`/marcas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  eliminarMarca(id) {
    return this.request(`/marcas/${id}`, {
      method: 'DELETE'
    });
  }

  reactivarMarca(id) {
    return this.request(`/marcas/${id}/reactivar`, {
      method: 'POST'
    });
  }

  listarModelos({ marcaId, includeDeleted = false } = {}) {
    const params = new URLSearchParams();
    params.set('includeDeleted', includeDeleted ? 'true' : 'false');

    if (marcaId) {
      params.set('marca_id', marcaId);
    }

    return this.request(`/modelos?${params.toString()}`);
  }

  crearModelo(data) {
    return this.request('/modelos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  actualizarModelo(id, data) {
    return this.request(`/modelos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  eliminarModelo(id) {
    return this.request(`/modelos/${id}`, {
      method: 'DELETE'
    });
  }

  reactivarModelo(id) {
    return this.request(`/modelos/${id}/reactivar`, {
      method: 'POST'
    });
  }

  listarSucursales(includeDeleted = false) {
    return this.request(`/sucursales?includeDeleted=${includeDeleted ? 'true' : 'false'}`);
  }

  listarEstadosTicket() {
    return this.request('/estados-ticket');
  }

  crearSucursal(data) {
    return this.request('/sucursales', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  actualizarSucursal(id, data) {
    return this.request(`/sucursales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  eliminarSucursal(id) {
    return this.request(`/sucursales/${id}`, {
      method: 'DELETE'
    });
  }

  reactivarSucursal(id) {
    return this.request(`/sucursales/${id}/reactivar`, {
      method: 'POST'
    });
  }

  crearTicket(data) {
    return this.request('/tickets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  obtenerTicketParaPDF(uuid) {
    return this.request(`/tickets/${uuid}/pdf-data`);
  }

  obtenerHistorialTicket(uuid) {
    return this.request(`/tickets/${uuid}/historial`);
  }

  actualizarEstado(uuid, data) {
    return this.request(`/tickets/${uuid}/estado`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  guardarPresupuesto(uuid, data) {
    return this.request(`/tickets/${uuid}/presupuesto`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  enviarPresupuesto(uuid, data) {
    return this.request(`/tickets/${uuid}/presupuesto-enviar`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  entregarTicket(uuid, data) {
    return this.request(`/tickets/${uuid}/entrega`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  derivarTicket(uuid, data) {
    return this.request(`/tickets/${uuid}/derivaciones`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  listarCajaPendiente() {
    return this.request('/caja/pendientes');
  }

  listarCajaCobrada(limite = 100) {
    return this.request(`/caja/cobrados?limite=${encodeURIComponent(limite)}`);
  }

  cobrarCaja(uuid) {
    return this.request(`/caja/${uuid}/cobrar`, {
      method: 'POST'
    });
  }

  registrarDevolucionCaja(data) {
    return this.request(`/caja/${data.ticket_uuid}/devoluciones`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  obtenerInformeCaja({ desde, hasta } = {}) {
    const params = new URLSearchParams();

    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);

    return this.request(`/caja/informe?${params.toString()}`);
  }

  obtenerListadoCaja({ desde, hasta, ticket, cliente } = {}) {
    const params = new URLSearchParams();

    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    if (ticket) params.set('ticket', ticket);
    if (cliente) params.set('cliente', cliente);

    return this.request(`/caja/listado?${params.toString()}`);
  }

  obtenerComprobanteX(uuid) {
    return this.request(`/caja/${uuid}/comprobante-x`, {
      method: 'POST'
    });
  }
}

module.exports = {
  ApiClient
};
