document.addEventListener('DOMContentLoaded', () => {
  const lista = document.getElementById('listaHistorialTicket');
  const detalleBody = document.getElementById('historialDetalleBody');
  const resumen = document.getElementById('historialResumen');
  const btnActualizar = document.getElementById('btnActualizarHistorial');
  const btnCerrar = document.getElementById('btnCerrarHistorial');

  const params = new URLSearchParams(window.location.search);
  const ticketUuid = params.get('uuid');
  let historialActual = [];
  let movimientoSeleccionado = null;
  let dateFormatActual = 'system';

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function fechaHora(valor) {
    return window.dateFormatUtils.formatDateTime(valor, dateFormatActual);
  }

  function texto(value, fallback = 'Sin dato') {
    const limpio = String(value ?? '').trim();
    return limpio ? escapeHtml(limpio) : fallback;
  }

  function renderDetalle(item) {
    if (!item) {
      detalleBody.innerHTML = '<div class="alert-detail-empty">Seleccione un movimiento para ver el detalle completo.</div>';
      return;
    }

    detalleBody.innerHTML = `
      <div class="alert-detail-grid">
        <div><strong>Fecha:</strong> ${texto(fechaHora(item.fecha))}</div>
        <div><strong>Evento:</strong> ${texto(item.titulo)}</div>
        <div><strong>Tipo:</strong> ${texto(item.tipo)}</div>
        <div><strong>Estado origen:</strong> ${texto(item.estado_origen, 'No aplica')}</div>
        <div><strong>Estado destino:</strong> ${texto(item.estado_destino, 'No aplica')}</div>
        <hr>
        <div><strong>Detalle:</strong> ${texto(item.detalle)}</div>
      </div>
    `;
  }

  function renderTabla() {
    lista.innerHTML = '';

    historialActual.forEach(item => {
      const tr = document.createElement('tr');
      if (movimientoSeleccionado?.id === item.id && movimientoSeleccionado?.fecha === item.fecha) {
        tr.classList.add('selected-row');
      }

      tr.innerHTML = `
        <td>${escapeHtml(fechaHora(item.fecha))}</td>
        <td>${escapeHtml(item.titulo || item.tipo || '')}</td>
        <td>${escapeHtml(item.estado_origen || '')}</td>
        <td>${escapeHtml(item.estado_destino || '')}</td>
      `;

      tr.addEventListener('click', () => {
        movimientoSeleccionado = item;
        renderTabla();
        renderDetalle(item);
      });

      lista.appendChild(tr);
    });

    if (!movimientoSeleccionado && historialActual.length) {
      movimientoSeleccionado = historialActual[0];
      renderTabla();
      renderDetalle(movimientoSeleccionado);
      return;
    }

    if (!historialActual.length) {
      detalleBody.innerHTML = '<div class="alert-detail-empty">Todavia no hay movimientos registrados para este ticket.</div>';
    }
  }

  async function cargarHistorial() {
    if (!ticketUuid) {
      resumen.textContent = 'No se recibio el ticket.';
      detalleBody.innerHTML = '<div class="alert-detail-empty">No se pudo abrir el historial porque falta el identificador del ticket.</div>';
      return;
    }

    resumen.textContent = 'Cargando movimientos...';
    const config = await window.api.obtenerConfiguracion();
    dateFormatActual = config?.dateFormat || 'system';
    historialActual = await window.api.obtenerHistorialTicket(ticketUuid);
    if (movimientoSeleccionado) {
      movimientoSeleccionado = historialActual.find(item => item.id === movimientoSeleccionado.id) || historialActual[0] || null;
    }
    resumen.textContent = `${historialActual.length} movimiento${historialActual.length === 1 ? '' : 's'} registrado${historialActual.length === 1 ? '' : 's'}.`;
    renderTabla();
    renderDetalle(movimientoSeleccionado);
  }

  btnActualizar.addEventListener('click', () => {
    cargarHistorial().catch(error => {
      resumen.textContent = error.message || 'No se pudo cargar el historial.';
    });
  });

  btnCerrar.addEventListener('click', () => window.close());

  cargarHistorial().catch(error => {
    resumen.textContent = error.message || 'No se pudo cargar el historial.';
    detalleBody.innerHTML = `<div class="alert-detail-empty">${texto(error.message || 'No se pudo cargar el historial.')}</div>`;
  });
});
