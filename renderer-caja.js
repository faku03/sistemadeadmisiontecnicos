const formatoMoneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS'
});

document.addEventListener('DOMContentLoaded', () => {
  window.licenseUI?.init();

  const rutaDB = document.getElementById('rutaDB');
  const btnRefrescar = document.getElementById('btnRefrescar');
  const tablaPendientes = document.getElementById('tablaPendientes');
  const tablaCobrados = document.getElementById('tablaCobrados');
  const tabs = Array.from(document.querySelectorAll('.caja-tabs .config-tab'));
  const panels = Array.from(document.querySelectorAll('.caja-tab-panel'));
  const buscarPendientes = document.getElementById('buscarPendientes');
  const buscarCobrados = document.getElementById('buscarCobrados');
  const btnAbrirDevoluciones = document.getElementById('btnAbrirDevoluciones');
  const btnListadoCaja = document.getElementById('btnListadoCaja');
  const btnCobrarSeleccionado = document.getElementById('btnCobrarSeleccionado');
  const btnPdfComprobante = document.getElementById('btnPdfComprobante');
  const btnWhatsappComprobante = document.getElementById('btnWhatsappComprobante');
  const pendienteSeleccionadoInfo = document.getElementById('pendienteSeleccionadoInfo');
  const cobradoSeleccionadoInfo = document.getElementById('cobradoSeleccionadoInfo');
  const totalCobrado = document.getElementById('totalCobrado');
  const totalDevuelto = document.getElementById('totalDevuelto');
  const totalNeto = document.getElementById('totalNeto');

  let pendientes = [];
  let cobrados = [];
  let pendienteSeleccionado = null;
  let cobradoSeleccionado = null;
  let dateFormat = 'system';

  function dinero(valor) {
    return formatoMoneda.format(Number(valor || 0));
  }

  function fechaVisible(valor, withTime = false) {
    if (!valor) return '';
    return withTime
      ? window.dateFormatUtils.formatDateTime(valor, dateFormat)
      : window.dateFormatUtils.formatDate(valor, dateFormat);
  }

  function activarTab(tab) {
    tabs.forEach(item => item.classList.toggle('is-active', item.dataset.tab === tab));
    panels.forEach(panel => panel.classList.toggle('hidden', panel.dataset.panel !== tab));
  }

  function mostrarAlerta(title, message, focusAfter) {
    return window.appDialog?.alert({ title, message, focusAfter }) || Promise.resolve(alert(message));
  }

  function confirmar(title, message, confirmLabel = 'Aceptar') {
    return window.appDialog?.confirm({ title, message, confirmLabel }) || Promise.resolve(confirm(message));
  }

  function ticketCodigo(item) {
    return item.ticket_codigo || item.ticket_uuid;
  }

  function descripcionEquipo(item) {
    return [item.tipo, item.marca, item.modelo].filter(Boolean).join(' - ');
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

  function actualizarAccionesPendiente() {
    btnCobrarSeleccionado.disabled = !pendienteSeleccionado;
    pendienteSeleccionadoInfo.textContent = pendienteSeleccionado
      ? `${ticketCodigo(pendienteSeleccionado)} | ${pendienteSeleccionado.nombre} ${pendienteSeleccionado.apellido} | ${descripcionEquipo(pendienteSeleccionado)} | Saldo ${dinero(pendienteSeleccionado.saldo)}`
      : 'Seleccione un ticket pendiente para cobrar.';
  }

  function actualizarAccionesCobrado() {
    const habilitado = Boolean(cobradoSeleccionado);
    btnPdfComprobante.disabled = !habilitado;
    btnWhatsappComprobante.disabled = !habilitado;
    cobradoSeleccionadoInfo.textContent = cobradoSeleccionado
      ? `${ticketCodigo(cobradoSeleccionado)} | ${cobradoSeleccionado.nombre} ${cobradoSeleccionado.apellido} | ${descripcionEquipo(cobradoSeleccionado)} | Cobrado ${dinero(cobradoSeleccionado.saldo)} | Devuelto ${dinero(cobradoSeleccionado.devoluciones)}`
      : 'Seleccione un ticket cobrado para operar.';
  }

  function renderPendientes() {
    const filtro = buscarPendientes.value.trim().toLowerCase();
    tablaPendientes.innerHTML = '';

    const visibles = pendientes.filter(item => textoMovimiento(item).includes(filtro));

    if (visibles.length === 0) {
      tablaPendientes.innerHTML = '<tr><td colspan="7" class="table-empty">No hay tickets pendientes para mostrar.</td></tr>';
      return;
    }

    visibles.forEach(item => {
      const tr = document.createElement('tr');
      if (pendienteSeleccionado?.ticket_uuid === item.ticket_uuid) {
        tr.classList.add('selected-row');
      }

      tr.innerHTML = `
        <td>${item.nombre} ${item.apellido}</td>
        <td>${item.celular || ''}</td>
        <td>${descripcionEquipo(item)}</td>
        <td>${ticketCodigo(item)}</td>
        <td>${dinero(item.importe_total)}</td>
        <td>${dinero(item.sena)}</td>
        <td>${dinero(item.saldo)}</td>
      `;

      tr.addEventListener('click', () => {
        pendienteSeleccionado = item;
        actualizarAccionesPendiente();
        renderPendientes();
      });

      tablaPendientes.appendChild(tr);
    });
  }

  function renderCobrados() {
    const filtro = buscarCobrados.value.trim().toLowerCase();
    tablaCobrados.innerHTML = '';

    const visibles = cobrados.filter(item => textoMovimiento(item).includes(filtro));

    if (visibles.length === 0) {
      tablaCobrados.innerHTML = '<tr><td colspan="6" class="table-empty">No hay tickets cobrados para mostrar.</td></tr>';
      return;
    }

    visibles.forEach(item => {
      const tr = document.createElement('tr');
      if (cobradoSeleccionado?.ticket_uuid === item.ticket_uuid) {
        tr.classList.add('selected-row');
      }

      tr.innerHTML = `
        <td>${fechaVisible(item.fecha_cobro, true)}</td>
        <td>${item.nombre} ${item.apellido}</td>
        <td>${descripcionEquipo(item)}</td>
        <td>${ticketCodigo(item)}</td>
        <td>${dinero(item.saldo)}</td>
        <td>${dinero(item.devoluciones)}</td>
      `;

      tr.addEventListener('click', () => {
        cobradoSeleccionado = item;
        actualizarAccionesCobrado();
        renderCobrados();
      });

      tablaCobrados.appendChild(tr);
    });
  }

  async function cargarInforme() {
    const informe = await window.apiCaja.informe({});

    totalCobrado.textContent = dinero(informe.cobros.total);
    totalDevuelto.textContent = dinero(informe.devoluciones.total);
    totalNeto.textContent = dinero(informe.neto);
  }

  async function cargarTodo() {
    const config = await window.apiCaja.obtenerConfiguracion();
    dateFormat = config?.dateFormat || 'system';
    pendientes = await window.apiCaja.listarPendientes();
    cobrados = await window.apiCaja.listarCobrados(100);

    pendienteSeleccionado = pendientes.find(item => item.ticket_uuid === pendienteSeleccionado?.ticket_uuid) || null;
    cobradoSeleccionado = cobrados.find(item => item.ticket_uuid === cobradoSeleccionado?.ticket_uuid) || null;

    actualizarAccionesPendiente();
    actualizarAccionesCobrado();
    renderPendientes();
    renderCobrados();
    await cargarInforme();
  }

  async function cobrarSeleccionado() {
    if (!pendienteSeleccionado) {
      await mostrarAlerta('Sin ticket seleccionado', 'Seleccione un ticket pendiente para cobrar.');
      return;
    }

    const confirmado = await confirmar(
      'Confirmar cobro',
      `Se registrara el cobro del ticket ${ticketCodigo(pendienteSeleccionado)} por ${dinero(pendienteSeleccionado.saldo)}.\n\nCliente: ${pendienteSeleccionado.nombre} ${pendienteSeleccionado.apellido}\nEquipo: ${descripcionEquipo(pendienteSeleccionado)}`,
      'Cobrar'
    );
    if (!confirmado) return;

    try {
      await window.apiCaja.cobrar(pendienteSeleccionado.ticket_uuid);
      await mostrarAlerta(
        'Cobro registrado',
        `El ticket ${ticketCodigo(pendienteSeleccionado)} fue marcado como cobrado correctamente.`
      );
      cobradoSeleccionado = null;
      pendienteSeleccionado = null;
      await cargarTodo();
    } catch (error) {
      await mostrarAlerta('No se pudo registrar el cobro', error.message || 'No se pudo registrar el cobro');
    }
  }

  async function abrirPdfComprobante() {
    if (!cobradoSeleccionado) {
      await mostrarAlerta('Sin ticket seleccionado', 'Seleccione un ticket cobrado para abrir el comprobante.');
      return;
    }

    try {
      const comprobante = await window.apiCaja.comprobanteX(cobradoSeleccionado.ticket_uuid);
      await window.apiCaja.abrirPDF(comprobante.pdf_path);
      await mostrarAlerta(
        'Comprobante disponible',
        `El comprobante X ${String(comprobante.numero).padStart(8, '0')} ya esta disponible.`
      );
    } catch (error) {
      await mostrarAlerta('No se pudo abrir el comprobante', error.message || 'No se pudo abrir el comprobante');
    }
  }

  async function enviarWhatsappComprobante() {
    if (!cobradoSeleccionado) {
      await mostrarAlerta('Sin ticket seleccionado', 'Seleccione un ticket cobrado para enviarlo por WhatsApp.');
      return;
    }

    try {
      const comprobante = await window.apiCaja.comprobanteX(cobradoSeleccionado.ticket_uuid);
      const numero = String(comprobante.numero).padStart(8, '0');
      const texto =
        `Hola ${cobradoSeleccionado.nombre}, te enviamos el comprobante X ${numero} ` +
        `por la reparacion de ${descripcionEquipo(cobradoSeleccionado)}. ` +
        `Importe cobrado: ${dinero(cobradoSeleccionado.saldo)}. ` +
        `Documento no valido como factura.`;

      await window.apiCaja.whatsapp({
        telefono: cobradoSeleccionado.celular,
        texto
      });
    } catch (error) {
      await mostrarAlerta('No se pudo abrir WhatsApp', error.message || 'No se pudo abrir WhatsApp');
    }
  }

  btnCobrarSeleccionado.addEventListener('click', cobrarSeleccionado);
  btnPdfComprobante.addEventListener('click', abrirPdfComprobante);
  btnWhatsappComprobante.addEventListener('click', enviarWhatsappComprobante);
  btnRefrescar.addEventListener('click', () => {
    cargarTodo().catch(error => mostrarAlerta('No se pudo actualizar', error.message || 'No se pudo actualizar caja.'));
  });
  buscarPendientes.addEventListener('input', renderPendientes);
  buscarCobrados.addEventListener('input', renderCobrados);
  tabs.forEach(tab => tab.addEventListener('click', () => activarTab(tab.dataset.tab)));
  btnAbrirDevoluciones.addEventListener('click', () => window.apiCaja.abrirDevoluciones());
  btnListadoCaja.addEventListener('click', () => window.apiCaja.abrirListado());

  window.apiCaja.rutaDB().then(ruta => {
    rutaDB.textContent = `Gateway: ${ruta}`;
  });

  activarTab('cobrar');
  cargarTodo().catch(error => {
    mostrarAlerta('No se pudo cargar caja', error.message || 'No se pudo cargar la informacion de caja.');
  });
});
