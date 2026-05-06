document.addEventListener('DOMContentLoaded', () => {
  const buscar = document.getElementById('buscarCobradosDevolucion');
  const tabla = document.getElementById('tablaCobradosDevolucion');
  const devolucionSeleccionadoInfo = document.getElementById('devolucionSeleccionadoInfo');
  const devolucionTicketInfo = document.getElementById('devolucionTicketInfo');
  const devolucionTicket = document.getElementById('devolucionTicket');
  const devolucionImporte = document.getElementById('devolucionImporte');
  const devolucionMotivo = document.getElementById('devolucionMotivo');
  const btnRegistrarDevolucion = document.getElementById('btnRegistrarDevolucion');

  let cobrados = [];
  let seleccionado = null;
  let dateFormat = 'system';
  let currencyCode = 'ARS';
  let currencyFormat = 'system';

  function dinero(valor) {
    return window.dateFormatUtils.formatCurrency(valor, currencyCode, currencyFormat);
  }

  function ticketCodigo(item) {
    return item.ticket_codigo || item.ticket_uuid;
  }

  function descripcionEquipo(item) {
    return [item.tipo, item.marca, item.modelo].filter(Boolean).join(' - ');
  }

  function fechaHora(valor) {
    return window.dateFormatUtils.formatDateTime(valor, dateFormat);
  }

  function textoMovimiento(item) {
    return `
      ${item.ticket_uuid}
      ${item.ticket_codigo || ''}
      ${item.nombre} ${item.apellido}
      ${item.celular || ''}
      ${item.tipo} ${item.marca} ${item.modelo}
    `.toLowerCase();
  }

  function mostrarAlerta(title, message, focusAfter) {
    return window.appDialog?.alert({ title, message, focusAfter }) || Promise.resolve(alert(message));
  }

  function confirmar(title, message, confirmLabel = 'Aceptar') {
    return window.appDialog?.confirm({ title, message, confirmLabel }) || Promise.resolve(confirm(message));
  }

  function actualizarSeleccion(item) {
    seleccionado = item || null;

    if (!seleccionado) {
      devolucionSeleccionadoInfo.textContent = 'Seleccione un ticket cobrado para registrar la devolucion.';
      devolucionTicketInfo.innerHTML = '<div class="muted">Sin ticket seleccionado.</div>';
      return;
    }

    devolucionSeleccionadoInfo.textContent = `${ticketCodigo(seleccionado)} | ${seleccionado.nombre} ${seleccionado.apellido} | ${descripcionEquipo(seleccionado)} | Cobrado ${dinero(seleccionado.saldo)} | Devuelto ${dinero(seleccionado.devoluciones)}`;
    devolucionTicketInfo.innerHTML = `
      <div><strong>Ticket:</strong> ${ticketCodigo(seleccionado)}</div>
      <div><strong>Cliente:</strong> ${seleccionado.nombre} ${seleccionado.apellido}</div>
      <div><strong>Equipo:</strong> ${descripcionEquipo(seleccionado)}</div>
      <div><strong>Cobrado:</strong> ${dinero(seleccionado.saldo)}</div>
      <div><strong>Ya devuelto:</strong> ${dinero(seleccionado.devoluciones)}</div>
    `;
    devolucionTicket.value = ticketCodigo(seleccionado);
  }

  function renderTabla() {
    const filtro = buscar.value.trim().toLowerCase();
    tabla.innerHTML = '';

    const visibles = cobrados.filter(item => textoMovimiento(item).includes(filtro));

    if (visibles.length === 0) {
      tabla.innerHTML = '<tr><td colspan="6" class="table-empty">No hay tickets cobrados para mostrar.</td></tr>';
      return;
    }

    visibles.forEach(item => {
      const tr = document.createElement('tr');
      if (seleccionado?.ticket_uuid === item.ticket_uuid) {
        tr.classList.add('selected-row');
      }

      tr.innerHTML = `
        <td>${fechaHora(item.fecha_cobro)}</td>
        <td>${item.nombre} ${item.apellido}</td>
        <td>${descripcionEquipo(item)}</td>
        <td>${ticketCodigo(item)}</td>
        <td>${dinero(item.saldo)}</td>
        <td>${dinero(item.devoluciones)}</td>
      `;

      tr.addEventListener('click', () => {
        actualizarSeleccion(item);
        renderTabla();
        devolucionImporte.focus();
        devolucionImporte.select();
      });

      tabla.appendChild(tr);
    });
  }

  async function cargar() {
    const config = await window.apiCaja.obtenerConfiguracion();
    dateFormat = config?.dateFormat || 'system';
    currencyCode = config?.currencyCode || 'ARS';
    currencyFormat = config?.currencyFormat || 'system';
    cobrados = await window.apiCaja.listarCobrados(200);
    seleccionado = cobrados.find(item => item.ticket_uuid === seleccionado?.ticket_uuid) || null;
    actualizarSeleccion(seleccionado);
    renderTabla();
  }

  btnRegistrarDevolucion.addEventListener('click', async () => {
    const ticket = devolucionTicket.value.trim();
    const importe = Number(devolucionImporte.value || 0);
    const motivo = devolucionMotivo.value.trim();

    if (!ticket) {
      await mostrarAlerta('Falta el ticket', 'Seleccione o ingrese el ticket a devolver.', () => devolucionTicket.focus());
      return;
    }

    if (!Number.isFinite(importe) || importe <= 0) {
      await mostrarAlerta('Importe invalido', 'Ingrese un importe de devolucion mayor a cero.', () => devolucionImporte.focus());
      return;
    }

    const confirmado = await confirmar(
      'Confirmar devolucion',
      `Se registrara una devolucion por ${dinero(importe)} del ticket ${ticket}${motivo ? `.\n\nMotivo: ${motivo}` : ''}`,
      'Registrar'
    );
    if (!confirmado) return;

    try {
      await window.apiCaja.devolver({
        ticket_uuid: ticket,
        importe,
        motivo
      });

      await mostrarAlerta('Devolucion registrada', 'La devolucion fue registrada correctamente.');
      devolucionImporte.value = '';
      devolucionMotivo.value = '';
      await cargar();
      devolucionImporte.focus();
    } catch (error) {
      await mostrarAlerta('No se pudo registrar la devolucion', error.message || 'No se pudo registrar la devolucion');
    }
  });

  buscar.addEventListener('input', renderTabla);

  cargar().catch(error => {
    mostrarAlerta('No se pudo cargar la pantalla', error.message || 'No se pudieron cargar los cobrados.');
  });
});
