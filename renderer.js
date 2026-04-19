// ================= ESTADO GLOBAL =================
let clienteActual = null;
let ticketEntregaActual = null;

document.addEventListener('DOMContentLoaded', () => {

  // ================= ELEMENTOS =================
  const dni = document.getElementById('dni');
  const nombre = document.getElementById('nombre');
  const apellido = document.getElementById('apellido');
  const celular = document.getElementById('celular');
  const email = document.getElementById('email');

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
  const menuSucursales = document.getElementById('menuSucursales');
  const sucursalActual = document.getElementById('sucursalActual');
  const filtroEstado = document.getElementById('filtroEstado');
  const buscadorTickets = document.getElementById('buscadorTickets');

  let ticketPresupuestoActual = null;

  const modalPresupuesto = document.getElementById('modalPresupuesto');
  const valorPresupuesto = document.getElementById('valorPresupuesto');
  const senaPresupuesto = document.getElementById('senaPresupuesto');
  const btnGuardarPresupuesto = document.getElementById('btnGuardarPresupuesto');
  const btnEnviarPresupuesto = document.getElementById('btnEnviarPresupuesto');
  const btnCancelarPresupuesto = document.getElementById('btnCancelarPresupuesto');

  if (!dni || !btnGuardar || !btnMenuDatos) {
    console.error('Faltan elementos críticos del DOM');
    return;
  }

  modalEntrega.classList.add('hidden');
  modalPresupuesto.classList.add('hidden');
  inicializarPantalla();

  // ================= CAMBIO DE ESTADO =================
  async function cambiarEstadoTicket(ticket, nuevoEstadoId) {

    try {
      await window.api.actualizarEstadoTicket({
        uuid: ticket.uuid,
        estado_id: nuevoEstadoId
      });
    } catch (error) {
      alert(error.message || 'No se pudo actualizar el estado');
    }

    await cargarTickets();
  }

  // ================= CLIENTE =================
  dni.addEventListener('blur', async () => {
    const valor = dni.value.trim();
    if (!valor) return;

    const cliente = await window.api.buscarClientePorDni(valor);

    if (cliente) {
      clienteActual = cliente;
      nombre.value = cliente.nombre;
      apellido.value = cliente.apellido;
      celular.value = cliente.celular || '';
      email.value = cliente.email || '';

      nombre.disabled =
      apellido.disabled =
      celular.disabled =
      email.disabled = true;
    } else {
      clienteActual = null;
      nombre.value = apellido.value = celular.value = email.value = '';
      nombre.disabled =
      apellido.disabled =
      celular.disabled =
      email.disabled = false;
    }
  });

  // ================= GUARDAR TICKET =================
  btnGuardar.addEventListener('click', async () => {

    if (!clienteActual) {
      if (!dni.value || !nombre.value || !apellido.value) {
        alert('Completá los datos del cliente');
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
      alert('Faltan datos del equipo');
      return;
    }

    await window.api.crearTicket({
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

    nombre.disabled = false;
    apellido.disabled = false;
    celular.disabled = false;
    email.disabled = false;

    tipoEquipo.value = '';
    limpiarMarcas();
    limpiarModelos();
    falla.value = '';

    dni.focus();

    await cargarTickets();
  });

  // ================= TICKETS =================
  async function cargarTickets() {
    listaTickets.innerHTML = '';

    const tickets = await window.api.listarTickets();
    const estados = await window.api.listarEstadosTicket();

    const textoBusqueda = buscadorTickets?.value?.toLowerCase() || '';
    const estadoFiltro = filtroEstado?.value || '';

    const ticketsFiltrados = tickets.filter(t => {

      const textoCompleto = `
        ${t.uuid}
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

      tr.innerHTML = `
        <td>${t.nombre} ${t.apellido}</td>
        <td>${t.celular || ''}</td>
        <td>${t.tipo} - ${t.marca} - ${t.modelo}</td>
        <td>
          <select class="combo-estado">
            ${estados.map(e =>
              `<option value="${e.id}" ${
                Number(e.id) === Number(t.estado_id) ? 'selected' : ''
              }>${e.descripcion}</option>`
            ).join('')}
          </select>
        </td>
        <td>
          <button class="btn-pdf">PDF</button>
        </td>
        <td>
          <button class="btn-presupuesto">Presupuesto</button>
        </td>
      <td>
          ${
            !['ENTREGADO', 'DEVUELTO_SIN_REPARAR'].includes(t.estado_codigo)
              ? '<button class="btn-entregar">Entregar</button>'
              : ''
          }
        </td>
      `;

      tr.querySelector('.btn-pdf').onclick =
        () => window.api.generarPDFIngreso(t.uuid);

      const btnEntregar = tr.querySelector('.btn-entregar');
      if (btnEntregar) {
        btnEntregar.onclick = () => abrirModalEntrega(t.uuid);
      }

      tr.querySelector('.btn-presupuesto').onclick =
        () => abrirModalPresupuesto(t);

      const comboEstado = tr.querySelector('.combo-estado');

      comboEstado.addEventListener('change', async (e) => {

        const nuevoEstadoId = parseInt(e.target.value);
        const estadoAnteriorId = t.estado_id;

        const confirmar = confirm(
          `Se actualiza el ticket de "${t.nombre} ${t.apellido}"\n` +
          `para el equipo "${t.tipo} - ${t.marca} - ${t.modelo}".\n\n¿Estás seguro?`
        );

        if (!confirmar) {
          e.target.value = estadoAnteriorId;
          return;
        }

        await cambiarEstadoTicket(t, nuevoEstadoId);
      });

      listaTickets.appendChild(tr);
    });
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
    await inicializarCombos();
    await cargarFiltroEstados();
    await cargarTickets();
  }

  async function cargarFiltroEstados() {
    if (!filtroEstado) return;

    const valorSeleccionado = filtroEstado.value;
    const estados = await window.api.listarEstadosTicket();

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

    const tipos = await window.api.listarTipos();

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
      modelo.appendChild(new Option(m.nombre, m.id));
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
  menuSucursales.addEventListener('click', () => window.api.abrirSucursales());

  buscadorTickets.addEventListener('input', cargarTickets);
  filtroEstado.addEventListener('change', cargarTickets);

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

    modalPresupuesto.classList.remove('hidden');
  }

  function leerPresupuesto() {
    const valor = Number(valorPresupuesto.value || 0);
    const sena = Number(senaPresupuesto.value || 0);

    if (!Number.isFinite(valor) || valor < 0) {
      alert('El valor de reparacion no es valido');
      return null;
    }

    if (!Number.isFinite(sena) || sena < 0) {
      alert('La sena no es valida');
      return null;
    }

    if (sena > valor) {
      alert('La sena no puede ser mayor al valor de reparacion');
      return null;
    }

    return {
      uuid: ticketPresupuestoActual.uuid,
      valor_reparacion: valor,
      sena
    };
  }

  btnGuardarPresupuesto.addEventListener('click', async () => {
    const presupuesto = leerPresupuesto();
    if (!presupuesto) return;

    try {
      await window.api.actualizarPresupuesto(presupuesto);
      modalPresupuesto.classList.add('hidden');
      await cargarTickets();
    } catch (error) {
      alert(error.message || 'No se pudo guardar el presupuesto');
    }
  });

  btnEnviarPresupuesto.addEventListener('click', async () => {
    const presupuesto = leerPresupuesto();
    if (!presupuesto) return;

    try {
      await window.api.enviarPresupuesto(presupuesto);
      modalPresupuesto.classList.add('hidden');
      await cargarFiltroEstados();
      await cargarTickets();
    } catch (error) {
      alert(error.message || 'No se pudo enviar el presupuesto');
    }
  });

  btnCancelarPresupuesto.addEventListener('click', () => {
    modalPresupuesto.classList.add('hidden');
  });

  window.eventos.onRefrescarCombos(() => {
    inicializarCombos();
    cargarFiltroEstados();
  });

  cargarSucursalLocal();
});
