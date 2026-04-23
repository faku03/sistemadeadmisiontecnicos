let ticketsActuales = [];
let estadosActuales = [];
let ticketSeleccionado = null;
let ticketEntregaActual = null;
let ticketPresupuestoActual = null;
let historialCache = new Map();
let dateFormatActual = 'system';

document.addEventListener('DOMContentLoaded', () => {
  const listaTickets = document.getElementById('listaTicketsFull');
  const buscadorTickets = document.getElementById('buscadorTicketsFull');
  const filtroEstado = document.getElementById('filtroEstadoFull');
  const btnHistorialTicket = document.getElementById('btnHistorialTicketFull');
  const btnActualizar = document.getElementById('btnActualizarTicketsFull');
  const ticketSeleccionadoInfo = document.getElementById('ticketSeleccionadoFullInfo');
  const ticketDetalleBody = document.getElementById('ticketDetalleBody');
  const ticketAcciones = document.getElementById('ticketAccionesFull');
  const btnPdfTicket = document.getElementById('btnPdfTicketFull');
  const btnPresupuestoTicket = document.getElementById('btnPresupuestoTicketFull');
  const btnEnviarPresupuestoTicket = document.getElementById('btnEnviarPresupuestoTicketFull');
  const btnAceptarPresupuestoTicket = document.getElementById('btnAceptarPresupuestoTicketFull');
  const btnRechazarPresupuestoTicket = document.getElementById('btnRechazarPresupuestoTicketFull');
  const btnRetiradoSinRepararTicket = document.getElementById('btnRetiradoSinRepararTicketFull');
  const btnEntregarTicket = document.getElementById('btnEntregarTicketFull');

  const modalEntrega = document.getElementById('modalEntrega');
  const inputTrabajo = document.getElementById('trabajoEntrega');
  const inputGarantia = document.getElementById('garantiaEntrega');
  const btnConfirmarEntrega = document.getElementById('confirmarEntrega');
  const btnCancelarEntrega = document.getElementById('cancelarEntrega');

  const modalPresupuesto = document.getElementById('modalPresupuesto');
  const presupuestoTicketInfo = document.getElementById('presupuestoTicketInfo');
  const valorPresupuesto = document.getElementById('valorPresupuesto');
  const senaPresupuesto = document.getElementById('senaPresupuesto');
  const reparacionPresupuesto = document.getElementById('reparacionPresupuesto');
  const btnGuardarPresupuesto = document.getElementById('btnGuardarPresupuesto');
  const btnEnviarPresupuesto = document.getElementById('btnEnviarPresupuesto');
  const btnCancelarPresupuesto = document.getElementById('btnCancelarPresupuesto');

  function mostrarAlerta(title, message, focusAfter) {
    return window.appDialog?.alert({ title, message, focusAfter }) || Promise.resolve(alert(message));
  }

  function confirmar(title, message, confirmLabel = 'Aceptar') {
    return window.appDialog?.confirm({ title, message, confirmLabel }) || Promise.resolve(confirm(message));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function ticketCodigo(ticket) {
    return ticket.codigo || ticket.uuid;
  }

  function dinero(valor) {
    return `$${Number(valor || 0).toFixed(2)}`;
  }

  function fechaCorta(valor) {
    return window.dateFormatUtils.formatDate(valor, dateFormatActual);
  }

  function descripcionEquipo(ticket) {
    return [ticket.tipo, ticket.marca, ticket.modelo].filter(Boolean).join(' - ');
  }

  function detalleTexto(value, fallback = 'Sin dato') {
    const texto = String(value ?? '').trim();
    return texto ? escapeHtml(texto) : fallback;
  }

  function renderEstadoVisual(ticket) {
    if (!ticket) return '';

    const etapas = [
      { codigo: 'PENDIENTE', label: 'Pendiente' },
      { codigo: 'PRESUPUESTO_ENVIADO', label: 'Presupuesto' },
      { codigo: 'EN_REPARACION', label: 'En reparacion' },
      { codigo: 'LISTO', label: 'Listo' },
      { codigo: 'ENTREGADO', label: 'Entregado' }
    ];
    const indiceActual = etapas.findIndex(etapa => etapa.codigo === ticket.estado_codigo);
    const estadoAlternativo = {
      PRESUPUESTO_RECHAZADO: 'Presupuesto rechazado',
      RETIRADO_SIN_REPARAR: 'Retirado sin reparar',
      DEVUELTO_SIN_REPARAR: 'Devuelto sin reparar'
    }[ticket.estado_codigo];

    const pasos = etapas.map((etapa, indice) => {
      const clase = indiceActual === indice
        ? 'is-current'
        : (indiceActual > indice ? 'is-done' : '');
      const icono = indiceActual > indice ? 'OK' : String(indice + 1);

      return `
        <button type="button" class="estado-step ${clase}" data-estado-codigo="${escapeHtml(etapa.codigo)}" data-estado-label="${escapeHtml(etapa.label)}">
          <div class="estado-step-marker">${icono}</div>
          <div class="estado-step-label">${escapeHtml(etapa.label)}</div>
        </button>
      `;
    }).join('');

    return `
      <div class="estado-panel">
        <div class="estado-track">
          ${pasos}
        </div>
        <div class="estado-actual">
          <strong>Estado actual:</strong>
          <span>${escapeHtml(estadoLegible(ticket))}</span>
        </div>
        ${estadoAlternativo ? `<div class="estado-alternativo">${escapeHtml(estadoAlternativo)}</div>` : ''}
      </div>
    `;
  }

  async function obtenerHistorialTicket(uuid) {
    if (!uuid) return [];
    if (historialCache.has(uuid)) {
      return historialCache.get(uuid);
    }

    const historial = await window.api.obtenerHistorialTicket(uuid);
    historialCache.set(uuid, historial);
    return historial;
  }

  function fechaHoraLarga(valor) {
    return window.dateFormatUtils.formatDateTime(valor, dateFormatActual);
  }

  async function cargarConfiguracionSistema() {
    const config = await window.api.obtenerConfiguracion();
    dateFormatActual = config?.dateFormat || 'system';
  }

  function buscarPasoHistorial(historial, estadoCodigo) {
    const equivalencias = {
      PENDIENTE: ['Pendiente'],
      PRESUPUESTO_ENVIADO: ['Presupuesto enviado'],
      EN_REPARACION: ['En reparacion'],
      LISTO: ['Listo para entregar'],
      ENTREGADO: ['Entregado']
    };

    const descripciones = equivalencias[estadoCodigo] || [];
    return historial.find(item => descripciones.includes(item.estado_destino));
  }

  function conectarEstadoVisual(ticket) {
    const botones = ticketDetalleBody.querySelectorAll('.estado-step');
    botones.forEach(boton => {
      boton.addEventListener('click', async () => {
        if (!ticket) return;

        const estadoCodigo = boton.dataset.estadoCodigo;
        const estadoLabel = boton.dataset.estadoLabel || estadoCodigo;

        try {
          const historial = await obtenerHistorialTicket(ticket.uuid);
          const paso = buscarPasoHistorial(historial, estadoCodigo);

          if (paso) {
            await mostrarAlerta(
              'Paso del ticket',
              `${estadoLabel}: ${fechaHoraLarga(paso.fecha)}`
            );
            return;
          }

          await mostrarAlerta(
            'Paso del ticket',
            `El ticket todavia no paso por ${estadoLabel}.`
          );
        } catch (error) {
          await mostrarAlerta(
            'No se pudo consultar el historial',
            error.message || 'No se pudo consultar el historial del ticket.'
          );
        }
      });
    });
  }

  function puedeEnviarPresupuesto(ticket) {
    return Boolean(ticket) &&
      ['PENDIENTE', 'PRESUPUESTO_ENVIADO'].includes(ticket.estado_codigo);
  }

  function puedeEntregar(ticket) {
    return ticket?.estado_codigo === 'LISTO';
  }

  function puedeAceptarPresupuesto(ticket) {
    return ticket?.estado_codigo === 'PRESUPUESTO_ENVIADO';
  }

  function puedeRechazarPresupuesto(ticket) {
    return ticket?.estado_codigo === 'PRESUPUESTO_ENVIADO';
  }

  function puedeRetirarSinReparar(ticket) {
    return ticket?.estado_codigo === 'PRESUPUESTO_RECHAZADO';
  }

  function estadoLegible(ticket) {
    return ticket?.estado || ticket?.estado_codigo || 'Sin estado';
  }

  async function avisarAccionNoDisponible(titulo, mensaje) {
    await mostrarAlerta(titulo, mensaje);
  }

  async function cargarFiltroEstados() {
    const valorSeleccionado = filtroEstado.value;
    estadosActuales = await window.api.listarEstadosTicket();

    filtroEstado.innerHTML = '';
    filtroEstado.appendChild(new Option('Todos los estados', ''));
    estadosActuales.forEach(estado => {
      filtroEstado.appendChild(new Option(estado.descripcion, estado.id));
    });
    filtroEstado.value = valorSeleccionado;
  }

  async function cargarTickets() {
    listaTickets.innerHTML = '';
    ticketsActuales = await window.api.listarTickets();
    if (!estadosActuales.length) {
      estadosActuales = await window.api.listarEstadosTicket();
    }

    const textoBusqueda = buscadorTickets.value.toLowerCase();
    const estadoFiltro = filtroEstado.value;

    ticketsActuales
      .filter(ticket => {
        const textoCompleto = `
          ${ticket.uuid}
          ${ticket.codigo || ''}
          ${fechaCorta(ticket.fecha_ingreso)}
          ${ticket.nombre} ${ticket.apellido}
          ${ticket.celular || ''}
          ${descripcionEquipo(ticket)}
          ${ticket.descripcion_falla || ''}
        `.toLowerCase();

        const coincideBusqueda = textoCompleto.includes(textoBusqueda);
        const coincideEstado = !estadoFiltro || Number(ticket.estado_id) === Number(estadoFiltro);
        return coincideBusqueda && coincideEstado;
      })
      .forEach(ticket => {
        const tr = document.createElement('tr');
        if (ticketSeleccionado?.uuid === ticket.uuid) {
          tr.classList.add('selected-row');
        }

        tr.innerHTML = `
          <td>${escapeHtml(fechaCorta(ticket.fecha_ingreso))}</td>
          <td>${escapeHtml(ticketCodigo(ticket))}</td>
          <td>${escapeHtml(`${ticket.nombre} ${ticket.apellido}`)}</td>
          <td>${escapeHtml(ticket.celular || '')}</td>
          <td>${escapeHtml(descripcionEquipo(ticket))}</td>
          <td>${escapeHtml(ticket.descripcion_falla || '')}</td>
          <td>
            <select class="combo-estado">
              ${estadosActuales.map(estado =>
                `<option value="${estado.id}" ${
                  Number(estado.id) === Number(ticket.estado_id) ? 'selected' : ''
                }>${escapeHtml(estado.descripcion)}</option>`
              ).join('')}
            </select>
          </td>
          <td>${Number(ticket.valor_reparacion || 0) > 0 ? escapeHtml(dinero(ticket.valor_reparacion)) : ''}</td>
        `;

        tr.addEventListener('click', event => {
          if (event.target?.classList?.contains('combo-estado')) return;
          seleccionarTicket(ticket);
        });

        const comboEstado = tr.querySelector('.combo-estado');
        comboEstado.addEventListener('change', async event => {
          const nuevoEstadoId = parseInt(event.target.value, 10);
          const nuevoEstado = estadosActuales.find(estado => Number(estado.id) === nuevoEstadoId);
          const estadoAnteriorId = ticket.estado_id;

          if (!nuevoEstado) {
            event.target.value = estadoAnteriorId;
            await mostrarAlerta('Estado no encontrado', 'Estado no encontrado');
            return;
          }

          const confirmado = await confirmar(
            'Actualizar estado',
            `Se actualiza el ticket ${ticketCodigo(ticket)} de ${ticket.nombre} ${ticket.apellido}.`,
            'Actualizar'
          );

          if (!confirmado) {
            event.target.value = estadoAnteriorId;
            return;
          }

          await cambiarEstadoTicket(ticket, nuevoEstado);
        });

        listaTickets.appendChild(tr);
      });

    if (ticketSeleccionado) {
      ticketSeleccionado = ticketsActuales.find(t => t.uuid === ticketSeleccionado.uuid) || null;
    }
    actualizarAccionesTicket();
  }

  function seleccionarTicket(ticket) {
    ticketSeleccionado = ticket;
    Array.from(listaTickets.querySelectorAll('tr')).forEach(tr => tr.classList.remove('selected-row'));
    const fila = Array.from(listaTickets.querySelectorAll('tr')).find(tr =>
      tr.children[1]?.textContent === ticketCodigo(ticket)
    );
    fila?.classList.add('selected-row');
    actualizarAccionesTicket();
  }

  function actualizarAccionesTicket() {
    const tieneTicket = Boolean(ticketSeleccionado);
    btnPdfTicket.disabled = !tieneTicket;
    btnPresupuestoTicket.disabled = !tieneTicket;
    btnEnviarPresupuestoTicket.disabled = !tieneTicket;
    btnAceptarPresupuestoTicket.disabled = !tieneTicket;
    btnRechazarPresupuestoTicket.disabled = !tieneTicket;
    btnRetiradoSinRepararTicket.disabled = !tieneTicket;
    btnEntregarTicket.disabled = !tieneTicket;
    btnHistorialTicket.disabled = !tieneTicket;
    ticketAcciones.classList.toggle('hidden', !tieneTicket);

    if (!tieneTicket) {
      ticketSeleccionadoInfo.textContent = 'Seleccione un ticket para operar.';
      ticketDetalleBody.innerHTML = '<div class="alert-detail-empty">Seleccione un ticket de la grilla para ver el detalle completo.</div>';
      return;
    }

    ticketSeleccionadoInfo.textContent =
      `${ticketCodigo(ticketSeleccionado)} - ${ticketSeleccionado.nombre} ${ticketSeleccionado.apellido} - ${descripcionEquipo(ticketSeleccionado)}`;
    ticketDetalleBody.innerHTML = `
      <div class="alert-detail-grid">
        ${renderEstadoVisual(ticketSeleccionado)}
        <div class="detail-row"><strong>Fecha ingreso:</strong><span>${detalleTexto(fechaCorta(ticketSeleccionado.fecha_ingreso))}</span></div>
        <div class="detail-row"><strong>Ticket:</strong><span>${detalleTexto(ticketCodigo(ticketSeleccionado))}</span></div>
        <div class="detail-row"><strong>Estado:</strong><span>${detalleTexto(estadoLegible(ticketSeleccionado))}</span></div>
        <div class="detail-row"><strong>Cliente:</strong><span>${detalleTexto(`${ticketSeleccionado.nombre || ''} ${ticketSeleccionado.apellido || ''}`)}</span></div>
        <div class="detail-row"><strong>DNI:</strong><span>${detalleTexto(ticketSeleccionado.dni)}</span></div>
        <div class="detail-row"><strong>Celular:</strong><span>${detalleTexto(ticketSeleccionado.celular)}</span></div>
        <div class="detail-row"><strong>Email:</strong><span>${detalleTexto(ticketSeleccionado.email)}</span></div>
        <hr>
        <div class="detail-row"><strong>Equipo:</strong><span>${detalleTexto(descripcionEquipo(ticketSeleccionado))}</span></div>
        <div class="detail-row"><strong>Codigo / Serie:</strong><span>${detalleTexto(ticketSeleccionado.codigo_equipo)}</span></div>
        <div class="detail-row"><strong>Falla:</strong><span>${detalleTexto(ticketSeleccionado.descripcion_falla)}</span></div>
        <div class="detail-row"><strong>Reparacion presupuestada:</strong><span>${detalleTexto(ticketSeleccionado.reparacion_presupuestada)}</span></div>
        <hr>
        <div class="detail-row"><strong>Presupuesto:</strong><span>${detalleTexto(
          Number(ticketSeleccionado.valor_reparacion || 0) > 0 ? dinero(ticketSeleccionado.valor_reparacion) : '',
          'Sin cargar'
        )}</span></div>
        <div class="detail-row"><strong>Sena:</strong><span>${detalleTexto(
          Number(ticketSeleccionado.sena || 0) > 0 ? dinero(ticketSeleccionado.sena) : '',
          'Sin sena'
        )}</span></div>
        <div class="detail-row"><strong>Saldo:</strong><span>${detalleTexto(
          Number(ticketSeleccionado.valor_reparacion || 0) > 0
            ? dinero(Number(ticketSeleccionado.valor_reparacion || 0) - Number(ticketSeleccionado.sena || 0))
            : '',
          'Sin calcular'
        )}</span></div>
      </div>
    `;
    conectarEstadoVisual(ticketSeleccionado);
  }

  async function cambiarEstadoTicket(ticket, nuevoEstado) {
    try {
      await window.api.actualizarEstadoTicket({
        uuid: ticket.uuid,
        estado_id: nuevoEstado.id
      });

      if (nuevoEstado.codigo === 'ENTREGADO') {
        await mostrarAlerta('Ticket enviado a Caja', 'El ticket paso a Entregado y se envio a Caja para cobrar.');
      }
    } catch (error) {
      await mostrarAlerta('No se pudo actualizar', error.message || 'No se pudo actualizar el estado');
    }

    await cargarTickets();
    historialCache.delete(ticket.uuid);
  }

  function estadoPorCodigo(codigo) {
    return estadosActuales.find(estado => estado.codigo === codigo);
  }

  async function cambiarEstadoPorCodigo(ticket, codigo, titulo, mensaje, etiquetaConfirmar) {
    if (!ticket) return;

    const validaciones = {
      EN_REPARACION: {
        permitido: puedeAceptarPresupuesto(ticket),
        mensaje: `Solo se puede aceptar un presupuesto cuando esta en Presupuesto enviado.\nEstado actual: ${estadoLegible(ticket)}.`
      },
      PRESUPUESTO_RECHAZADO: {
        permitido: puedeRechazarPresupuesto(ticket),
        mensaje: `Solo se puede rechazar un presupuesto cuando esta en Presupuesto enviado.\nEstado actual: ${estadoLegible(ticket)}.`
      },
      RETIRADO_SIN_REPARAR: {
        permitido: puedeRetirarSinReparar(ticket),
        mensaje: `Solo se puede retirar sin reparar cuando el presupuesto esta rechazado.\nEstado actual: ${estadoLegible(ticket)}.`
      }
    };

    const validacion = validaciones[codigo];
    if (validacion && !validacion.permitido) {
      await avisarAccionNoDisponible('Accion no disponible', validacion.mensaje);
      return;
    }

    const nuevoEstado = estadoPorCodigo(codigo);
    if (!nuevoEstado) {
      await mostrarAlerta('Estado no encontrado', `No existe el estado ${codigo}. Revise la migracion de la base de datos.`);
      return;
    }

    const confirmado = await confirmar(titulo, mensaje, etiquetaConfirmar);
    if (!confirmado) return;

    await cambiarEstadoTicket(ticket, nuevoEstado);
  }

  async function generarPDFIngresoSeleccionado(ticket) {
    if (!ticket) return;

    try {
      const pdfPath = await window.api.generarPDFIngreso(ticket.uuid);
      await mostrarAlerta('PDF generado', `El PDF de ingreso se guardo en:\n${pdfPath}`);
    } catch (error) {
      await mostrarAlerta('No se pudo generar el PDF', error.message || 'No se pudo generar el PDF de ingreso');
    }
  }

  function abrirModalEntrega(uuid) {
    ticketEntregaActual = uuid;
    inputTrabajo.value = '';
    inputGarantia.value = '';
    modalEntrega.classList.remove('hidden');
  }

  function abrirModalPresupuesto(ticket) {
    ticketPresupuestoActual = ticket;
    valorPresupuesto.value = ticket.valor_reparacion || 0;
    senaPresupuesto.value = ticket.sena || 0;
    reparacionPresupuesto.value = ticket.reparacion_presupuestada || '';
    presupuestoTicketInfo.innerHTML = `
      <div><strong>Ticket:</strong> ${escapeHtml(ticketCodigo(ticket))}</div>
      <div><strong>Cliente:</strong> ${escapeHtml(`${ticket.nombre} ${ticket.apellido}`)}</div>
      <div><strong>Equipo:</strong> ${escapeHtml(descripcionEquipo(ticket))}</div>
      <div><strong>Falla:</strong> ${escapeHtml(ticket.descripcion_falla || 'Sin detalle en listado')}</div>
    `;

    modalPresupuesto.classList.remove('hidden');
  }

  function leerPresupuesto() {
    const valor = Number(valorPresupuesto.value || 0);
    const sena = Number(senaPresupuesto.value || 0);

    if (!Number.isFinite(valor) || valor < 0) {
      mostrarAlerta('Importe invalido', 'El valor de reparacion no es valido.', () => valorPresupuesto.focus());
      return null;
    }

    if (!Number.isFinite(sena) || sena < 0) {
      mostrarAlerta('Importe invalido', 'La sena no es valida.', () => senaPresupuesto.focus());
      return null;
    }

    if (sena > valor) {
      mostrarAlerta('Importe invalido', 'La sena no puede ser mayor al valor de reparacion.', () => senaPresupuesto.focus());
      return null;
    }

    return {
      uuid: ticketPresupuestoActual.uuid,
      valor_reparacion: valor,
      sena,
      reparacion_presupuestada: reparacionPresupuesto.value.trim()
    };
  }

  function textoPresupuesto(ticket, presupuesto) {
    const saldo = Number(presupuesto.valor_reparacion || 0) - Number(presupuesto.sena || 0);
    return [
      `Hola ${ticket.nombre}, te enviamos el presupuesto del ticket ${ticketCodigo(ticket)}.`,
      `Equipo: ${ticket.tipo} ${ticket.marca} ${ticket.modelo}.`,
      presupuesto.reparacion_presupuestada
        ? `Reparacion a realizar: ${presupuesto.reparacion_presupuestada}.`
        : '',
      `Valor reparacion: ${dinero(presupuesto.valor_reparacion)}.`,
      `Sena: ${dinero(presupuesto.sena)}.`,
      `Saldo: ${dinero(saldo)}.`
    ].filter(Boolean).join(' ');
  }

  async function enviarPresupuestoCliente(ticket, presupuesto) {
    const pdfPath = await window.api.enviarPresupuesto(presupuesto);
    await mostrarAlerta(
      'PDF generado',
      `El presupuesto se guardo en:\n${pdfPath}\n\nAhora se abrira WhatsApp para enviarlo.`
    );
    await window.api.enviarWhatsAppPresupuesto({
      telefono: ticket.celular,
      texto: textoPresupuesto(ticket, presupuesto)
    });
    return pdfPath;
  }

  async function enviarPresupuestoGuardado(ticket) {
    if (!ticket) return;

    if (!puedeEnviarPresupuesto(ticket)) {
      await avisarAccionNoDisponible(
        'Accion no disponible',
        `El presupuesto solo se puede enviar cuando el ticket esta Pendiente o Presupuesto enviado.\nEstado actual: ${estadoLegible(ticket)}.`
      );
      return;
    }

    if (Number(ticket.valor_reparacion || 0) <= 0) {
      await mostrarAlerta(
        'Falta cargar presupuesto',
        'Primero cargue el valor y la reparacion a realizar. Se abrira la pantalla de presupuesto.'
      );
      abrirModalPresupuesto(ticket);
      return;
    }

    try {
      const presupuesto = {
        uuid: ticket.uuid,
        valor_reparacion: Number(ticket.valor_reparacion || 0),
        sena: Number(ticket.sena || 0),
        reparacion_presupuestada: ticket.reparacion_presupuestada || ''
      };

      const quiereEnviar = await confirmar(
        'Enviar presupuesto',
        `${ticket.presupuesto_enviado ? 'Reenviar' : 'Enviar'} presupuesto del ticket ${ticketCodigo(ticket)} por WhatsApp?`,
        'Enviar'
      );
      if (!quiereEnviar) return;

      await enviarPresupuestoCliente(ticket, presupuesto);
      await cargarFiltroEstados();
      await cargarTickets();
      historialCache.delete(ticket.uuid);
    } catch (error) {
      await mostrarAlerta('No se pudo enviar', error.message || 'No se pudo enviar el presupuesto');
    }
  }

  btnConfirmarEntrega.addEventListener('click', async () => {
    try {
      await window.api.entregarTicket({
        uuid: ticketEntregaActual,
        trabajo: inputTrabajo.value.trim(),
        garantia: parseInt(inputGarantia.value, 10)
      });

      await mostrarAlerta('Ticket enviado a Caja', 'El ticket paso a Entregado y se envio a Caja para cobrar.');
      modalEntrega.classList.add('hidden');
      await cargarTickets();
      historialCache.delete(ticketEntregaActual);
    } catch (error) {
      await mostrarAlerta('No se pudo entregar', error.message || 'No se pudo entregar el ticket');
    }
  });

  btnCancelarEntrega.addEventListener('click', () => {
    modalEntrega.classList.add('hidden');
  });

  btnGuardarPresupuesto.addEventListener('click', async () => {
    const presupuesto = leerPresupuesto();
    if (!presupuesto) return;

    const confirmado = await confirmar(
      'Guardar presupuesto',
      `Guardar presupuesto del ticket ${ticketCodigo(ticketPresupuestoActual)}?`,
      'Guardar'
    );
    if (!confirmado) return;

    try {
      await window.api.actualizarPresupuesto(presupuesto);
      modalPresupuesto.classList.add('hidden');

      const quiereEnviar = await confirmar(
        'Presupuesto guardado',
        'Queres enviarlo al cliente por WhatsApp ahora?',
        'Enviar'
      );
      if (quiereEnviar) {
        await enviarPresupuestoCliente(ticketPresupuestoActual, presupuesto);
        await cargarFiltroEstados();
      }

      await cargarTickets();
      historialCache.delete(ticketPresupuestoActual.uuid);
    } catch (error) {
      await mostrarAlerta('No se pudo guardar', error.message || 'No se pudo guardar el presupuesto');
    }
  });

  btnEnviarPresupuesto.addEventListener('click', async () => {
    const presupuesto = leerPresupuesto();
    if (!presupuesto) return;

    const confirmado = await confirmar(
      'Guardar y enviar',
      `Guardar y enviar presupuesto del ticket ${ticketCodigo(ticketPresupuestoActual)}?`,
      'Guardar y enviar'
    );
    if (!confirmado) return;

    try {
      await enviarPresupuestoCliente(ticketPresupuestoActual, presupuesto);
      modalPresupuesto.classList.add('hidden');
      await cargarFiltroEstados();
      await cargarTickets();
      historialCache.delete(ticketPresupuestoActual.uuid);
    } catch (error) {
      await mostrarAlerta('No se pudo enviar', error.message || 'No se pudo enviar el presupuesto');
    }
  });

  btnCancelarPresupuesto.addEventListener('click', () => {
    modalPresupuesto.classList.add('hidden');
  });

  buscadorTickets.addEventListener('input', cargarTickets);
  filtroEstado.addEventListener('change', cargarTickets);
  btnActualizar.addEventListener('click', async () => {
    await cargarFiltroEstados();
    await cargarTickets();
  });
  btnHistorialTicket.addEventListener('click', async () => {
    if (!ticketSeleccionado) {
      await mostrarAlerta('Sin ticket seleccionado', 'Seleccione un ticket para ver el historial.');
      return;
    }

    await window.api.abrirHistorialTicket(ticketSeleccionado.uuid);
  });
  btnPdfTicket.addEventListener('click', () => generarPDFIngresoSeleccionado(ticketSeleccionado));
  btnPresupuestoTicket.addEventListener('click', () => {
    if (ticketSeleccionado) abrirModalPresupuesto(ticketSeleccionado);
  });
  btnEnviarPresupuestoTicket.addEventListener('click', () => enviarPresupuestoGuardado(ticketSeleccionado));
  btnAceptarPresupuestoTicket.addEventListener('click', () => cambiarEstadoPorCodigo(
    ticketSeleccionado,
    'EN_REPARACION',
    'Aceptar presupuesto',
    `El ticket ${ticketSeleccionado ? ticketCodigo(ticketSeleccionado) : ''} pasara a En reparacion.`,
    'Aceptar'
  ));
  btnRechazarPresupuestoTicket.addEventListener('click', () => cambiarEstadoPorCodigo(
    ticketSeleccionado,
    'PRESUPUESTO_RECHAZADO',
    'Rechazar presupuesto',
    `El ticket ${ticketSeleccionado ? ticketCodigo(ticketSeleccionado) : ''} quedara como Presupuesto rechazado.`,
    'Rechazar'
  ));
  btnRetiradoSinRepararTicket.addEventListener('click', () => cambiarEstadoPorCodigo(
    ticketSeleccionado,
    'RETIRADO_SIN_REPARAR',
    'Retirado sin reparar',
    `El ticket ${ticketSeleccionado ? ticketCodigo(ticketSeleccionado) : ''} quedara como Retirado sin reparar.`,
    'Confirmar'
  ));
  btnEntregarTicket.addEventListener('click', async () => {
    if (!ticketSeleccionado) return;

    if (!puedeEntregar(ticketSeleccionado)) {
      await avisarAccionNoDisponible(
        'Accion no disponible',
        `Para entregar, el ticket debe estar en Listo para entregar.\nEstado actual: ${estadoLegible(ticketSeleccionado)}.`
      );
      return;
    }

    abrirModalEntrega(ticketSeleccionado.uuid);
  });

  modalEntrega.classList.add('hidden');
  modalPresupuesto.classList.add('hidden');

  cargarConfiguracionSistema()
    .then(cargarFiltroEstados)
    .then(cargarTickets)
    .catch(error => mostrarAlerta('No se pudo cargar', error.message || 'No se pudieron cargar los tickets'));
});
