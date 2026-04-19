const DEFAULT_API_URL = 'http://localhost:3000';

class ApiClient {
  constructor(baseUrl = process.env.SISTEMA_TICKETS_API_URL || DEFAULT_API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
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

  crearTicket(data) {
    return this.request('/tickets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
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

  cobrarCaja(uuid) {
    return this.request(`/caja/${uuid}/cobrar`, {
      method: 'POST'
    });
  }
}

module.exports = {
  ApiClient
};
