// ================= ESTADO GLOBAL =================
let clienteActual = null;
let ticketEntregaActual = null;
let dateFormatActual = 'system';
let currencyCodeActual = 'ARS';
let currencyFormatActual = 'system';

document.addEventListener('DOMContentLoaded', () => {
  const inicioPantalla = performance.now();
  const tiemposInicio = [];
  const medirPaso = (nombre) => {
    tiemposInicio.push({
      nombre,
      ms: Math.round(performance.now() - inicioPantalla)
    });
  };

  // ================= ELEMENTOS =================
  const dni = document.getElementById('dni');
  const nombre = document.getElementById('nombre');
  const apellido = document.getElementById('apellido');
  const celular = document.getElementById('celular');
  const email = document.getElementById('email');
  const clienteAviso = document.getElementById('clienteAviso');

  const tipoEquipo = document.getElementById('tipoEquipo');
  const marca = document.getElementById('marca');
  const modelo = document.getElementById('modelo');
  const falla = document.getElementById('falla');

  const btnGuardar = document.getElementById('btnGuardar');
  const listaTickets = document.getElementById('listaTickets');

  // ===== MODAL ENTREGA =====
  const modalEntrega = document.getElementById('modalEntrega');
  const inputTrabajo = document.getElementById('trabajoEntrega');
  const inputGarantia = document.getElementById('garantiaEntrega');
  const btnConfirmarEntrega = document.getElementById('confirmarEntrega');
  const btnCancelarEntrega = document.getElementById('cancelarEntrega');

  // ===== MENÚ =====
  const btnMenuDatos = document.getElementById('btnMenuDatos');
  const menuDatos = document.getElementById('menuDatos');

  const menuTipos = document.getElementById('menuTipos');
  const menuMarcas = document.getElementById('menuMarcas');
  const menuModelos = document.getElementById('menuModelos');
  const menuClientes = document.getElementById('menuClientes');
  const menuSucursales = document.getElementById('menuSucursales');
  const sucursalActual = document.getElementById('sucursalActual');
  const filtroEstado = document.getElementById('filtroEstado');
  const buscadorTickets = document.getElementById('buscadorTickets');
  const btnVerTodosTickets = document.getElementById('btnVerTodosTickets');
  const ticketSeleccionadoInfo = document.getElementById('ticketSeleccionadoInfo');
  const btnPdfTicket = document.getElementById('btnPdfTicket');
  const btnPresupuestoTicket = document.getElementById('btnPresupuestoTicket');
  const btnEnviarPresupuestoTicket = document.getElementById('btnEnviarPresupuestoTicket');
  const btnAceptarPresupuestoTicket = document.getElementById('btnAceptarPresupuestoTicket');
  const btnRechazarPresupuestoTicket = document.getElementById('btnRechazarPresupuestoTicket');
  const btnRetiradoSinRepararTicket = document.getElementById('btnRetiradoSinRepararTicket');
  const btnEntregarTicket = document.getElementById('btnEntregarTicket');
  const btnVerAlertasTickets = document.getElementById('btnVerAlertasTickets');
  const btnConfiguracion = document.getElementById('btnConfiguracion');
  const alertasResumen = document.getElementById('alertasResumen');

  let ticketPresupuestoActual = null;
  let ticketsActuales = [];
  let estadosActuales = [];
  let tiposActuales = [];
  let estadosPromise = null;
  let tiposPromise = null;
  let ticketSeleccionado = null;
  let pantallaInicializada = false;
  let refrescoCombosTimer = null;
  const alertasDefaults = {
    pendiente: 2,
    reparacion: 5,
    presupuesto: 3,
    listo: 7
  };
  let alertasConfigActual = { ...alertasDefaults };

  const modalPresupuesto = document.getElementById('modalPresupuesto');
  const presupuestoTicketInfo = document.getElementById('presupuestoTicketInfo');
  const valorPresupuesto = document.getElementById('valorPresupuesto');
  const senaPresupuesto = document.getElementById('senaPresupuesto');
  const reparacionPresupuesto = document.getElementById('reparacionPresupuesto');
  const btnGuardarPresupuesto = document.getElementById('btnGuardarPresupuesto');
  const btnEnviarPresupuesto = document.getElementById('btnEnviarPresupuesto');
  const btnCancelarPresupuesto = document.getElementById('btnCancelarPresupuesto');

  if (!dni || !btnGuardar || !btnMenuDatos) {
    console.error('Faltan elementos críticos del DOM');
    return;
  }

  modalEntrega.classList.add('hidden');
  modalPresupuesto.classList.add('hidden');
  inicializarPantalla().catch(error => {
    mostrarAlerta('Error al iniciar', error.message || 'No se pudo inicializar la pantalla');
  });

  function ticketCodigo(ticket) {
    return ticket.codigo || ticket.uuid;
  }

  function dinero(valor) {
    return window.dateFormatUtils.formatCurrency(valor, currencyCodeActual, currencyFormatActual);
  }

  function fechaCorta(valor) {
    return window.dateFormatUtils.formatDate(valor, dateFormatActual);
  }

  function fechaEstado(ticket) {
    return ticket.updated_at || ticket.fecha_ingreso;
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
    actualizarPanelAlertas(ticketsActuales);
  }

  async function cargarConfiguracionSistema() {
    const config = await window.api.obtenerConfiguracion();
    dateFormatActual = config.dateFormat || 'system';
    currencyCodeActual = config.currencyCode || 'ARS';
    currencyFormatActual = config.currencyFormat || 'system';
    aplicarConfigAlertas({
      pendiente: config.alertPendingDays,
      reparacion: config.alertRepairDays,
      presupuesto: config.alertBudgetDays,
      listo: config.alertReadyDays
    });
    return config;
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

  async function obtenerEstadosTicket(force = false) {
    if (!force && estadosActuales.length) {
      return estadosActuales;
    }

    if (!force && estadosPromise) {
      return estadosPromise;
    }

    estadosPromise = window.api.listarEstadosTicket().then(estados => {
      estadosActuales = estados;
      estadosPromise = null;
      return estados;
    }).catch(error => {
      estadosPromise = null;
      throw error;
    });

    estadosActuales = await estadosPromise;
    return estadosActuales;
  }

  async function obtenerTiposEquipo(force = false) {
    if (!force && tiposActuales.length) {
      return tiposActuales;
    }

    if (!force && tiposPromise) {
      return tiposPromise;
    }

    tiposPromise = window.api.listarTipos().then(tipos => {
      tiposActuales = tipos;
      tiposPromise = null;
      return tipos;
    }).catch(error => {
      tiposPromise = null;
      throw error;
    });

    tiposActuales = await tiposPromise;
    return tiposActuales;
  }

  function mostrarAvisoCliente(texto) {
    if (!clienteAviso) return;
    clienteAviso.textContent = texto;
    clienteAviso.classList.remove('hidden');
  }

  function ocultarAvisoCliente() {
    if (!clienteAviso) return;
    clienteAviso.textContent = '';
    clienteAviso.classList.add('hidden');
  }

  function enfocarNombreCliente() {
    setTimeout(() => {
      window.focus();
      nombre.disabled = false;
      nombre.focus();
      nombre.select();
    }, 80);
  }

  function mostrarAlerta(title, message, focusAfter) {
    return window.appDialog?.alert({ title, message, focusAfter }) || Promise.resolve(alert(message));
  }

  function confirmar(title, message, confirmLabel = 'Aceptar') {
    return window.appDialog?.confirm({ title, message, confirmLabel }) || Promise.resolve(confirm(message));
  }

  // ================= CAMBIO DE ESTADO =================
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
  }

  // ================= CLIENTE =================
  async function buscarCliente(mostrarAviso) {
    const valor = dni.value.trim();
    if (!valor) {
      limpiarClienteActual();
      ocultarAvisoCliente();
      return false;
    }

    const cliente = await window.api.buscarClientePorDni(valor);

    if (cliente) {
      clienteActual = cliente;
      ocultarAvisoCliente();
      nombre.value = cliente.nombre;
      apellido.value = cliente.apellido;
      celular.value = cliente.celular || '';
      email.value = cliente.email || '';

      nombre.disabled =
      apellido.disabled =
      celular.disabled =
      email.disabled = true;

      return true;
    } else {
      clienteActual = null;
      nombre.value = apellido.value = celular.value = email.value = '';
      nombre.disabled =
      apellido.disabled =
      celular.disabled =
      email.disabled = false;

      if (mostrarAviso) {
        ocultarAvisoCliente();
        await mostrarAlerta(
          'Cliente no encontrado',
          'El DNI ingresado no existe.\nComplete los datos para cargar un cliente nuevo.',
          enfocarNombreCliente
        );
      }

      return false;
    }
  }

  function limpiarClienteActual() {
    clienteActual = null;
    nombre.value = '';
    apellido.value = '';
    celular.value = '';
    email.value = '';
    nombre.disabled = false;
    apellido.disabled = false;
    celular.disabled = false;
    email.disabled = false;
  }

  dni.addEventListener('input', () => {
    if (!dni.value.trim()) {
      limpiarClienteActual();
      ocultarAvisoCliente();
    }
  });

  dni.addEventListener('keydown', async event => {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    try {
      await buscarCliente(true);
    } catch (error) {
      await mostrarAlerta('No se pudo buscar', error.message || 'No se pudo buscar el cliente', () => dni.focus());
    }
  });

  // ================= GUARDAR TICKET =================
  btnGuardar.addEventListener('click', async () => {
    try {
      btnGuardar.disabled = true;

      if (!clienteActual) {
        if (!dni.value || !nombre.value || !apellido.value) {
          await mostrarAlerta('Faltan datos del cliente', 'Completa los datos del cliente.', () => dni.focus());
          return;
        }

        const id = await window.api.crearCliente({
          dni: dni.value,
          nombre: nombre.value,
          apellido: apellido.value,
          celular: celular.value,
          email: email.value
        });

        clienteActual = { id };
      }

      if (!tipoEquipo.value || !marca.value || !modelo.value || !falla.value.trim()) {
        await mostrarAlerta('Faltan datos del equipo', 'Completa tipo, marca, modelo y descripcion de la falla.');
        return;
      }

      const ticket = await window.api.crearTicket({
        cliente_id: clienteActual.id,
        tipo_equipo_id: tipoEquipo.value,
        modelo_id: modelo.value,
        descripcion_falla: falla.value.trim()
      });

      clienteActual = null;

      dni.value = '';
      nombre.value = '';
      apellido.value = '';
      celular.value = '';
      email.value = '';
      ocultarAvisoCliente();

      nombre.disabled = false;
      apellido.disabled = false;
      celular.disabled = false;
      email.disabled = false;

      tipoEquipo.value = '';
      limpiarMarcas();
      limpiarModelos();
      falla.value = '';

      await mostrarAlerta('Ticket cargado', `Ticket cargado correctamente:\n${ticket.codigo || ticket.uuid}`, () => dni.focus());
      dni.focus();

      await cargarTickets();
    } catch (error) {
      await mostrarAlerta('No se pudo guardar', error.message || 'No se pudo guardar el ticket', () => dni.focus());
    } finally {
      btnGuardar.disabled = false;
    }
  });

  // ================= TICKETS =================
  async function cargarTickets() {
    listaTickets.innerHTML = '';

    const [tickets, estados] = await Promise.all([
      window.api.listarTickets(),
      obtenerEstadosTicket()
    ]);
    ticketsActuales = tickets;
    estadosActuales = estados;

    const textoBusqueda = buscadorTickets?.value?.toLowerCase() || '';
    const estadoFiltro = filtroEstado?.value || '';

    const ticketsFiltrados = tickets.filter(t => {
      if (['ENTREGADO', 'DEVUELTO_SIN_REPARAR', 'RETIRADO_SIN_REPARAR'].includes(t.estado_codigo)) {
        return false;
      }

      const textoCompleto = `
        ${t.uuid}
        ${t.codigo || ''}
        ${fechaCorta(t.fecha_ingreso)}
        ${t.nombre} ${t.apellido}
        ${t.tipo} ${t.marca} ${t.modelo}
      `.toLowerCase();

      const coincideBusqueda = textoCompleto.includes(textoBusqueda);
      const coincideEstado =
        !estadoFiltro || Number(t.estado_id) === Number(estadoFiltro);

      return coincideBusqueda && coincideEstado;
    });

    ticketsFiltrados.forEach(t => {

      const tr = document.createElement('tr');
      if (ticketSeleccionado?.uuid === t.uuid) {
        tr.classList.add('selected-row');
      }

      tr.innerHTML = `
        <td>${fechaCorta(t.fecha_ingreso)}</td>
        <td>${ticketCodigo(t)}</td>
        <td>${t.nombre} ${t.apellido}</td>
        <td>${t.celular || ''}</td>
        <td>${descripcionEquipo(t)}</td>
        <td>
          <select class="combo-estado">
            ${estados.map(e =>
              `<option value="${e.id}" ${
                Number(e.id) === Number(t.estado_id) ? 'selected' : ''
              }>${e.descripcion}</option>`
            ).join('')}
          </select>
        </td>
      `;

      tr.addEventListener('click', event => {
        if (event.target?.classList?.contains('combo-estado')) return;
        seleccionarTicket(t);
      });

      const comboEstado = tr.querySelector('.combo-estado');

      comboEstado.addEventListener('change', async (e) => {

        const nuevoEstadoId = parseInt(e.target.value);
        const nuevoEstado = estados.find(estado => Number(estado.id) === nuevoEstadoId);
        const estadoAnteriorId = t.estado_id;

        if (!nuevoEstado) {
          e.target.value = estadoAnteriorId;
          await mostrarAlerta('Estado no encontrado', 'Estado no encontrado');
          return;
        }

        const confirmado = await confirmar(
          'Actualizar estado',
          `Se actualiza el ticket de "${t.nombre} ${t.apellido}"\n` +
          `para el equipo "${t.tipo} - ${t.marca} - ${t.modelo}".\n\nEstas seguro?`,
          'Actualizar'
        );

        if (!confirmado) {
          e.target.value = estadoAnteriorId;
          return;
        }

        await cambiarEstadoTicket(t, nuevoEstado);
      });

      listaTickets.appendChild(tr);
    });

    if (ticketSeleccionado) {
      ticketSeleccionado = ticketsFiltrados.find(t => t.uuid === ticketSeleccionado.uuid) || null;
    }
    actualizarPanelAlertas(tickets);
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

    if (!tieneTicket) {
      ticketSeleccionadoInfo.textContent = 'Seleccione un ticket para operar.';
      return;
    }

    ticketSeleccionadoInfo.textContent =
      `${ticketCodigo(ticketSeleccionado)} - ${ticketSeleccionado.nombre} ${ticketSeleccionado.apellido} - ${descripcionEquipo(ticketSeleccionado)}`;
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
    } catch (error) {
      await mostrarAlerta('No se pudo enviar', error.message || 'No se pudo enviar el presupuesto');
    }
  }

  // ================= MODAL ENTREGA =================
  function abrirModalEntrega(uuid) {
    ticketEntregaActual = uuid;
    inputTrabajo.value = '';
    inputGarantia.value = '';
    modalEntrega.classList.remove('hidden');
  }

  btnConfirmarEntrega.addEventListener('click', async () => {
    await window.api.entregarTicket({
      uuid: ticketEntregaActual,
      trabajo: inputTrabajo.value.trim(),
      garantia: parseInt(inputGarantia.value, 10)
    });

    await mostrarAlerta('Ticket enviado a Caja', 'El ticket paso a Entregado y se envio a Caja para cobrar.');
    modalEntrega.classList.add('hidden');
    cargarTickets();
  });

  btnCancelarEntrega.addEventListener('click', () => {
    modalEntrega.classList.add('hidden');
  });

  // ================= COMBOS =================
  async function inicializarCombos() {
    await cargarTipos();
    limpiarMarcas();
    limpiarModelos();
  }

  async function inicializarPantalla() {
    await Promise.all([
      cargarConfiguracionSistema().then(() => medirPaso('configuracion')),
      inicializarCombos().then(() => medirPaso('combos')),
      cargarFiltroEstados().then(() => medirPaso('filtro-estados')),
      cargarTickets().then(() => medirPaso('tickets')),
      cargarSucursalLocal().then(() => medirPaso('sucursal'))
    ]);
    pantallaInicializada = true;
    medirPaso('pantalla-lista');
    console.info('[startup]', tiemposInicio);
    setTimeout(() => {
      window.licenseUI?.init();
    }, 250);
  }

  function estadoLegible(ticket) {
    return ticket?.estado || ticket?.estado_codigo || 'Sin estado';
  }

  async function avisarAccionNoDisponible(titulo, mensaje) {
    await mostrarAlerta(titulo, mensaje);
  }

  function alertasDeTickets(tickets) {
    const reglas = [
      {
        codigo: 'PENDIENTE',
        titulo: 'Pendiente sin avanzar',
        limite: alertasConfigActual.pendiente
      },
      {
        codigo: 'EN_REPARACION',
        titulo: 'Reparacion demorada',
        limite: alertasConfigActual.reparacion
      },
      {
        codigo: 'PRESUPUESTO_ENVIADO',
        titulo: 'Presupuesto sin respuesta',
        limite: alertasConfigActual.presupuesto
      },
      {
        codigo: 'LISTO',
        titulo: 'Listo sin retirar',
        limite: alertasConfigActual.listo
      }
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
          titulo: regla.titulo,
          limite: regla.limite,
          dias: diasEnterosDesde(fecha)
        }];
      })
      .sort((a, b) => b.dias - a.dias);
  }

  function actualizarPanelAlertas(tickets) {
    if (!alertasResumen) return;

    const alertas = alertasDeTickets(tickets);

    if (alertas.length === 0) {
      alertasResumen.textContent = 'Sin alertas';
      alertasResumen.classList.remove('alertas-resumen');
      return;
    }

    alertasResumen.textContent = `Hay ${alertas.length} alerta${alertas.length === 1 ? '' : 's'}`;
    alertasResumen.classList.add('alertas-resumen');
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

  async function cargarFiltroEstados() {
    if (!filtroEstado) return;

    const valorSeleccionado = filtroEstado.value;
    const estados = await obtenerEstadosTicket();

    filtroEstado.innerHTML = '';
    filtroEstado.appendChild(new Option('Todos los estados', ''));

    estados.forEach(estado => {
      filtroEstado.appendChild(new Option(estado.descripcion, estado.id));
    });

    filtroEstado.value = valorSeleccionado;
  }

  async function cargarTipos() {
    tipoEquipo.innerHTML = '';
    tipoEquipo.appendChild(new Option('Tipo de equipo', ''));

    const tipos = await obtenerTiposEquipo();

    tipos.filter(t => !t.is_deleted).forEach(t => {
      tipoEquipo.appendChild(
        new Option(`${t.codigo} - ${t.descripcion}`, t.id)
      );
    });
  }

  async function cargarMarcas() {
    limpiarMarcas();
    limpiarModelos();

    const marcas = await window.api.listarMarcas();
    marcas.filter(m => !m.is_deleted).forEach(m => {
      marca.appendChild(new Option(m.nombre, m.id));
    });
  }

  async function cargarModelos() {
    limpiarModelos();
    if (!marca.value) return;

    const modelos = await window.api.listarModelosPorMarca(marca.value);
    modelos.filter(m => !m.is_deleted).forEach(m => {
      modelo.appendChild(new Option(m.modelo || m.nombre, m.id));
    });
  }

  function limpiarMarcas() {
    marca.innerHTML = '';
    marca.appendChild(new Option('Marca', ''));
  }

  function limpiarModelos() {
    modelo.innerHTML = '';
    modelo.appendChild(new Option('Modelo', ''));
  }

  tipoEquipo.addEventListener('change', cargarMarcas);
  marca.addEventListener('change', cargarModelos);

  // ================= MENÚ =================
  btnMenuDatos.addEventListener('click', e => {
    e.stopPropagation();
    menuDatos.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    menuDatos.classList.add('hidden');
  });

  menuTipos.addEventListener('click', () => window.api.abrirTiposEquipo());
  menuMarcas.addEventListener('click', () => window.api.abrirMarcas());
  menuModelos.addEventListener('click', () => window.api.abrirModelos());
  menuClientes.addEventListener('click', () => window.api.abrirClientes());
  menuSucursales.addEventListener('click', () => window.api.abrirSucursales());

  buscadorTickets.addEventListener('input', cargarTickets);
  filtroEstado.addEventListener('change', cargarTickets);
  btnVerAlertasTickets?.addEventListener('click', () => window.api.abrirAlertasTickets());
  btnConfiguracion?.addEventListener('click', () => window.api.abrirConfiguracion());
  btnVerTodosTickets.addEventListener('click', () => window.api.abrirTickets());
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

  async function cargarSucursalLocal() {
    try {
      const sucursal = await window.api.obtenerSucursalLocal();

      if (sucursal && sucursal.nombre) {
        sucursalActual.textContent = 'SUCURSAL: ' + sucursal.nombre;
      } else {
        sucursalActual.textContent = 'SUCURSAL: No configurada';
      }

    } catch (error) {
      console.error('Error cargando sucursal local:', error);
      sucursalActual.textContent = 'SUCURSAL: Error';
    }
  }
  function abrirModalPresupuesto(ticket) {
    ticketPresupuestoActual = ticket;

    valorPresupuesto.value = ticket.valor_reparacion || 0;
    senaPresupuesto.value = ticket.sena || 0;
    reparacionPresupuesto.value = ticket.reparacion_presupuestada || '';
    presupuestoTicketInfo.innerHTML = `
      <div><strong>Ticket:</strong> ${ticketCodigo(ticket)}</div>
      <div><strong>Cliente:</strong> ${ticket.nombre} ${ticket.apellido}</div>
      <div><strong>Equipo:</strong> ${ticket.tipo} - ${ticket.marca} - ${ticket.modelo}</div>
      <div><strong>Falla:</strong> ${ticket.descripcion_falla || 'Sin detalle en listado'}</div>
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
    } catch (error) {
      await mostrarAlerta('No se pudo enviar', error.message || 'No se pudo enviar el presupuesto');
    }
  });

  btnCancelarPresupuesto.addEventListener('click', () => {
    modalPresupuesto.classList.add('hidden');
  });

  window.eventos.onRefrescarCombos(() => {
    if (!pantallaInicializada) {
      return;
    }

    clearTimeout(refrescoCombosTimer);
    refrescoCombosTimer = setTimeout(() => {
      tiposActuales = [];
      estadosActuales = [];
      tiposPromise = null;
      estadosPromise = null;
      inicializarCombos();
      cargarFiltroEstados();
    }, 180);
  });

  window.eventos.onConfiguracionActualizada((config) => {
    dateFormatActual = config.dateFormat || 'system';
    currencyCodeActual = config.currencyCode || 'ARS';
    currencyFormatActual = config.currencyFormat || 'system';
    aplicarConfigAlertas({
      pendiente: config.alertPendingDays,
      reparacion: config.alertRepairDays,
      presupuesto: config.alertBudgetDays,
      listo: config.alertReadyDays
    });
  });

  setTimeout(() => dni.focus(), 0);
});
