document.addEventListener('DOMContentLoaded', () => {
  const alertasResumen = document.getElementById('alertasResumen');
  const alertasTickets = document.getElementById('alertasTickets');
  const alertaDetalle = document.getElementById('alertaDetalle');
  const alertaDetalleBody = document.getElementById('alertaDetalleBody');
  const alertaAcciones = document.getElementById('alertaAcciones');
  const filtroEstadoAlerta = document.getElementById('filtroEstadoAlerta');
  const btnConfigAlertas = document.getElementById('btnConfigAlertas');
  const alertasConfig = document.getElementById('alertasConfig');
  const alertaDiasPendiente = document.getElementById('alertaDiasPendiente');
  const alertaDiasReparacion = document.getElementById('alertaDiasReparacion');
  const alertaDiasPresupuesto = document.getElementById('alertaDiasPresupuesto');
  const alertaDiasListo = document.getElementById('alertaDiasListo');
  const btnGuardarAlertas = document.getElementById('btnGuardarAlertas');
  const btnRestaurarAlertas = document.getElementById('btnRestaurarAlertas');
  const btnActualizarAlertas = document.getElementById('btnActualizarAlertas');
  const btnPdfTicket = document.getElementById('btnPdfTicket');
  const btnPresupuestoTicket = document.getElementById('btnPresupuestoTicket');
  const btnEnviarPresupuestoTicket = document.getElementById('btnEnviarPresupuestoTicket');
  const btnAceptarPresupuestoTicket = document.getElementById('btnAceptarPresupuestoTicket');
  const btnRechazarPresupuestoTicket = document.getElementById('btnRechazarPresupuestoTicket');
  const btnRetiradoSinRepararTicket = document.getElementById('btnRetiradoSinRepararTicket');
  const btnHistorialTicket = document.getElementById('btnHistorialTicket');
  const btnEntregarTicket = document.getElementById('btnEntregarTicket');
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

  const alertasDefaults = {
    pendiente: 2,
    reparacion: 5,
    presupuesto: 3,
    listo: 7
  };

  let ticketsActuales = [];
  let alertasActuales = [];
  let alertaSeleccionada = null;
  let ticketEntregaActual = null;
  let ticketPresupuestoActual = null;
  let historialCache = new Map();
  let alertasConfigActual = { ...alertasDefaults };

  function mostrarAlerta(title, message) {
    return window.appDialog?.alert({ title, message }) || Promise.resolve(alert(message));
  }

  function confirmar(title, message, confirmLabel = 'Aceptar') {
    return window.appDialog?.confirm({ title, message, confirmLabel }) || Promise.resolve(confirm(message));
  }

  function ticketCodigo(ticket) {
    return ticket.codigo || ticket.uuid;
  }

  function fechaEstado(ticket) {
    return ticket.updated_at || ticket.fecha_ingreso;
  }

  function fechaCorta(valor) {
    if (!valor) return '';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleDateString('es-AR');
  }

  function diasExactosDesde(valor) {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return 0;
    return (Date.now() - fecha.getTime()) / 86400000;
  }

  function diasEnterosDesde(valor) {
    return Math.max(0, Math.floor(diasExactosDesde(valor)));
  }

  function descripcionEquipo(ticket) {
    return [ticket.tipo, ticket.marca, ticket.modelo].filter(Boolean).join(' - ');
  }

  function dinero(valor) {
    return `$${Number(valor || 0).toFixed(2)}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
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
    if (!valor) return '';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleString('es-AR');
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
    const botones = alertaDetalleBody.querySelectorAll('.estado-step');
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

  function normalizarDias(valor, defecto) {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero > 0 ? Math.floor(numero) : defecto;
  }

  function aplicarConfigAlertas(config = {}) {
    alertasConfigActual = {
      pendiente: normalizarDias(config.pendiente, alertasDefaults.pendiente),
      reparacion: normalizarDias(config.reparacion, alertasDefaults.reparacion),
      presupuesto: normalizarDias(config.presupuesto, alertasDefaults.presupuesto),
      listo: normalizarDias(config.listo, alertasDefaults.listo)
    };
    cargarInputsAlertas(alertasConfigActual);
    return alertasConfigActual;
  }

  async function cargarConfigAlertasSistema() {
    const config = await window.api.obtenerConfiguracion();
    return aplicarConfigAlertas({
      pendiente: config.alertPendingDays,
      reparacion: config.alertRepairDays,
      presupuesto: config.alertBudgetDays,
      listo: config.alertReadyDays
    });
  }

  function cargarInputsAlertas(config) {
    alertaDiasPendiente.value = config.pendiente;
    alertaDiasReparacion.value = config.reparacion;
    alertaDiasPresupuesto.value = config.presupuesto;
    alertaDiasListo.value = config.listo;
  }

  function alertasDeTickets(tickets, config) {
    const reglas = [
      { codigo: 'PENDIENTE', titulo: 'Pendiente sin avanzar', limite: config.pendiente },
      { codigo: 'EN_REPARACION', titulo: 'Reparacion demorada', limite: config.reparacion },
      { codigo: 'PRESUPUESTO_ENVIADO', titulo: 'Presupuesto sin respuesta', limite: config.presupuesto },
      { codigo: 'LISTO', titulo: 'Listo sin retirar', limite: config.listo }
    ];

    return tickets
      .filter(ticket => !['ENTREGADO', 'DEVUELTO_SIN_REPARAR', 'RETIRADO_SIN_REPARAR'].includes(ticket.estado_codigo))
      .flatMap(ticket => {
        const regla = reglas.find(item => item.codigo === ticket.estado_codigo);
        if (!regla) return [];

        const fecha = fechaEstado(ticket);
        if (diasExactosDesde(fecha) <= regla.limite) return [];

        return [{
          ticket,
          fecha,
          titulo: regla.titulo,
          dias: diasEnterosDesde(fecha)
        }];
      })
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }

  function cargarFiltroEstados(alertas) {
    const valorActual = filtroEstadoAlerta.value;
    const opciones = [...new Set(alertas.map(alerta => alerta.ticket.estado_codigo))];

    filtroEstadoAlerta.innerHTML = '';
    filtroEstadoAlerta.appendChild(new Option('Todos los estados', ''));
    opciones.forEach(codigo => {
      const alerta = alertas.find(item => item.ticket.estado_codigo === codigo);
      filtroEstadoAlerta.appendChild(new Option(alerta?.ticket.estado || codigo, codigo));
    });
    filtroEstadoAlerta.value = opciones.includes(valorActual) ? valorActual : '';
  }

  function renderDetalle(alerta) {
    if (!alerta) {
      alertaDetalleBody.innerHTML = '<div class="alert-detail-empty">Seleccione una alerta para ver el detalle.</div>';
      alertaAcciones.classList.add('hidden');
      return;
    }

    const ticket = alerta.ticket;
    alertaDetalleBody.innerHTML = `
      <div class="alert-detail-grid">
        ${renderEstadoVisual(ticket)}
        <div><strong>Alerta:</strong> ${alerta.titulo}</div>
        <div><strong>Estado:</strong> ${ticket.estado}</div>
        <div><strong>Fecha del estado:</strong> ${fechaCorta(alerta.fecha)}</div>
        <div><strong>Dias en estado:</strong> ${alerta.dias}</div>
        <div><strong>Ticket:</strong> ${ticketCodigo(ticket)}</div>
        <div><strong>Cliente:</strong> ${ticket.nombre} ${ticket.apellido}</div>
        <div><strong>Celular:</strong> ${ticket.celular || '-'}</div>
        <div><strong>Equipo:</strong> ${descripcionEquipo(ticket)}</div>
        <div><strong>Falla:</strong> ${ticket.descripcion_falla || '-'}</div>
        <div><strong>Reparacion:</strong> ${ticket.reparacion_presupuestada || '-'}</div>
        <div><strong>Presupuesto:</strong> $${Number(ticket.valor_reparacion || 0).toFixed(2)}</div>
        <div><strong>Sena:</strong> $${Number(ticket.sena || 0).toFixed(2)}</div>
      </div>
    `;
    conectarEstadoVisual(ticket);
    alertaAcciones.classList.remove('hidden');
    actualizarAcciones(ticket);
  }

  function actualizarAcciones(ticket) {
    const tieneTicket = Boolean(ticket);
    btnPdfTicket.disabled = !tieneTicket;
    btnPresupuestoTicket.disabled = !tieneTicket;
    btnEnviarPresupuestoTicket.disabled = !tieneTicket;
    btnAceptarPresupuestoTicket.disabled = !tieneTicket;
    btnRechazarPresupuestoTicket.disabled = !tieneTicket;
    btnRetiradoSinRepararTicket.disabled = !tieneTicket;
    btnHistorialTicket.disabled = !tieneTicket;
    btnEntregarTicket.disabled = !tieneTicket;
  }

  function renderTabla() {
    const estadoFiltro = filtroEstadoAlerta.value;
    const alertasFiltradas = alertasActuales.filter(alerta =>
      !estadoFiltro || alerta.ticket.estado_codigo === estadoFiltro
    );

    alertasTickets.innerHTML = '';

    if (alertasFiltradas.length === 0) {
      alertasResumen.textContent = 'Sin alertas activas.';
      alertaSeleccionada = null;
      renderDetalle(null);
      return;
    }

    alertasResumen.textContent = `Hay ${alertasFiltradas.length} alerta${alertasFiltradas.length === 1 ? '' : 's'} activa${alertasFiltradas.length === 1 ? '' : 's'}.`;

    alertasFiltradas.forEach(alerta => {
      const tr = document.createElement('tr');
      if (alertaSeleccionada?.ticket.uuid === alerta.ticket.uuid) {
        tr.classList.add('selected-row');
      }

      tr.innerHTML = `
        <td>${fechaCorta(alerta.fecha)}</td>
        <td>${alerta.ticket.estado}</td>
        <td>${alerta.titulo}</td>
        <td>${ticketCodigo(alerta.ticket)}</td>
        <td>${alerta.ticket.nombre} ${alerta.ticket.apellido}</td>
        <td>${descripcionEquipo(alerta.ticket)}</td>
        <td>${alerta.dias}</td>
      `;

      tr.addEventListener('click', () => {
        alertaSeleccionada = alerta;
        renderTabla();
        renderDetalle(alerta);
      });

      alertasTickets.appendChild(tr);
    });

    if (alertaSeleccionada) {
      const encontrada = alertasFiltradas.find(alerta => alerta.ticket.uuid === alertaSeleccionada.ticket.uuid);
      alertaSeleccionada = encontrada || alertasFiltradas[0];
    } else {
      alertaSeleccionada = alertasFiltradas[0];
    }

    renderDetalle(alertaSeleccionada);
    Array.from(alertasTickets.querySelectorAll('tr')).forEach(tr => {
      if (tr.children[3]?.textContent === ticketCodigo(alertaSeleccionada.ticket)) {
        tr.classList.add('selected-row');
      }
    });
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

    await cargarAlertas();
    historialCache.delete(ticket.uuid);
  }

  function estadoPorCodigo(codigo) {
    const ticket = ticketsActuales.find(item => item.estado_codigo === codigo);
    return ticket ? { codigo, id: ticket.estado_id } : null;
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

    const estados = await window.api.listarEstadosTicket();
    const nuevoEstado = estados.find(estado => estado.codigo === codigo);
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
      <div><strong>Ticket:</strong> ${ticketCodigo(ticket)}</div>
      <div><strong>Cliente:</strong> ${ticket.nombre} ${ticket.apellido}</div>
      <div><strong>Equipo:</strong> ${descripcionEquipo(ticket)}</div>
      <div><strong>Falla:</strong> ${ticket.descripcion_falla || 'Sin detalle en listado'}</div>
    `;

    modalPresupuesto.classList.remove('hidden');
  }

  function leerPresupuesto() {
    const valor = Number(valorPresupuesto.value || 0);
    const sena = Number(senaPresupuesto.value || 0);

    if (!Number.isFinite(valor) || valor < 0) {
      mostrarAlerta('Importe invalido', 'El valor de reparacion no es valido.');
      return null;
    }

    if (!Number.isFinite(sena) || sena < 0) {
      mostrarAlerta('Importe invalido', 'La sena no es valida.');
      return null;
    }

    if (sena > valor) {
      mostrarAlerta('Importe invalido', 'La sena no puede ser mayor al valor de reparacion.');
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
      presupuesto.reparacion_presupuestada ? `Reparacion a realizar: ${presupuesto.reparacion_presupuestada}.` : '',
      `Valor reparacion: ${dinero(presupuesto.valor_reparacion)}.`,
      `Sena: ${dinero(presupuesto.sena)}.`,
      `Saldo: ${dinero(saldo)}.`
    ].filter(Boolean).join(' ');
  }

  async function enviarPresupuestoCliente(ticket, presupuesto) {
    const pdfPath = await window.api.enviarPresupuesto(presupuesto);
    await mostrarAlerta('PDF generado', `El presupuesto se guardo en:\n${pdfPath}\n\nAhora se abrira WhatsApp para enviarlo.`);
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
      await mostrarAlerta('Falta cargar presupuesto', 'Primero cargue el valor y la reparacion a realizar. Se abrira la pantalla de presupuesto.');
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
      await cargarAlertas();
      historialCache.delete(ticket.uuid);
    } catch (error) {
      await mostrarAlerta('No se pudo enviar', error.message || 'No se pudo enviar el presupuesto');
    }
  }

  async function cargarAlertas() {
    const config = await cargarConfigAlertasSistema();
    ticketsActuales = await window.api.listarTickets();
    alertasActuales = alertasDeTickets(ticketsActuales, config);
    cargarFiltroEstados(alertasActuales);
    renderTabla();
  }

  btnGuardarAlertas.addEventListener('click', async () => {
    await window.api.guardarConfiguracion({
      alertPendingDays: normalizarDias(alertaDiasPendiente.value, alertasDefaults.pendiente),
      alertRepairDays: normalizarDias(alertaDiasReparacion.value, alertasDefaults.reparacion),
      alertBudgetDays: normalizarDias(alertaDiasPresupuesto.value, alertasDefaults.presupuesto),
      alertReadyDays: normalizarDias(alertaDiasListo.value, alertasDefaults.listo)
    });
    await cargarAlertas();
    await mostrarAlerta('Alertas actualizadas', 'Los dias de alerta fueron guardados.');
    alertasConfig.classList.add('hidden');
  });

  btnRestaurarAlertas.addEventListener('click', async () => {
    await window.api.guardarConfiguracion({
      alertPendingDays: alertasDefaults.pendiente,
      alertRepairDays: alertasDefaults.reparacion,
      alertBudgetDays: alertasDefaults.presupuesto,
      alertReadyDays: alertasDefaults.listo
    });
    await cargarAlertas();
    await mostrarAlerta('Alertas actualizadas', 'Se restauraron los valores por defecto.');
    alertasConfig.classList.add('hidden');
  });

  btnActualizarAlertas.addEventListener('click', () => {
    cargarAlertas().catch(error => mostrarAlerta('No se pudieron cargar', error.message || 'No se pudieron cargar las alertas.'));
  });

  btnConfigAlertas.addEventListener('click', () => {
    window.api.abrirConfiguracion();
  });

  filtroEstadoAlerta.addEventListener('change', renderTabla);

  btnPdfTicket.addEventListener('click', () => generarPDFIngresoSeleccionado(alertaSeleccionada?.ticket));
  btnPresupuestoTicket.addEventListener('click', () => {
    if (alertaSeleccionada?.ticket) abrirModalPresupuesto(alertaSeleccionada.ticket);
  });
  btnEnviarPresupuestoTicket.addEventListener('click', () => enviarPresupuestoGuardado(alertaSeleccionada?.ticket));
  btnAceptarPresupuestoTicket.addEventListener('click', () => cambiarEstadoPorCodigo(
    alertaSeleccionada?.ticket,
    'EN_REPARACION',
    'Aceptar presupuesto',
    `El ticket ${alertaSeleccionada?.ticket ? ticketCodigo(alertaSeleccionada.ticket) : ''} pasara a En reparacion.`,
    'Aceptar'
  ));
  btnRechazarPresupuestoTicket.addEventListener('click', () => cambiarEstadoPorCodigo(
    alertaSeleccionada?.ticket,
    'PRESUPUESTO_RECHAZADO',
    'Rechazar presupuesto',
    `El ticket ${alertaSeleccionada?.ticket ? ticketCodigo(alertaSeleccionada.ticket) : ''} quedara como Presupuesto rechazado.`,
    'Rechazar'
  ));
  btnRetiradoSinRepararTicket.addEventListener('click', () => cambiarEstadoPorCodigo(
    alertaSeleccionada?.ticket,
    'RETIRADO_SIN_REPARAR',
    'Retirado sin reparar',
    `El ticket ${alertaSeleccionada?.ticket ? ticketCodigo(alertaSeleccionada.ticket) : ''} quedara como Retirado sin reparar.`,
    'Confirmar'
  ));
  btnHistorialTicket.addEventListener('click', async () => {
    const ticket = alertaSeleccionada?.ticket;
    if (!ticket) {
      await mostrarAlerta('Sin ticket seleccionado', 'Seleccione una alerta para ver el historial del ticket.');
      return;
    }

    await window.api.abrirHistorialTicket(ticket.uuid);
  });
  btnEntregarTicket.addEventListener('click', async () => {
    const ticket = alertaSeleccionada?.ticket;
    if (!ticket) return;

    if (!puedeEntregar(ticket)) {
      await avisarAccionNoDisponible(
        'Accion no disponible',
        `Para entregar, el ticket debe estar en Listo para entregar.\nEstado actual: ${estadoLegible(ticket)}.`
      );
      return;
    }

    abrirModalEntrega(ticket.uuid);
  });

  btnConfirmarEntrega.addEventListener('click', async () => {
    try {
      await window.api.entregarTicket({
        uuid: ticketEntregaActual,
        trabajo: inputTrabajo.value.trim(),
        garantia: parseInt(inputGarantia.value, 10)
      });

      await mostrarAlerta('Ticket enviado a Caja', 'El ticket paso a Entregado y se envio a Caja para cobrar.');
      modalEntrega.classList.add('hidden');
      await cargarAlertas();
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
      }

      await cargarAlertas();
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
      await cargarAlertas();
      historialCache.delete(ticketPresupuestoActual.uuid);
    } catch (error) {
      await mostrarAlerta('No se pudo enviar', error.message || 'No se pudo enviar el presupuesto');
    }
  });

  btnCancelarPresupuesto.addEventListener('click', () => {
    modalPresupuesto.classList.add('hidden');
  });

  window.eventos.onConfiguracionActualizada(async (config) => {
    aplicarConfigAlertas({
      pendiente: config.alertPendingDays,
      reparacion: config.alertRepairDays,
      presupuesto: config.alertBudgetDays,
      listo: config.alertReadyDays
    });
    await cargarAlertas();
  });

  cargarAlertas().catch(error => mostrarAlerta('No se pudieron cargar', error.message || 'No se pudieron cargar las alertas.'));
});
