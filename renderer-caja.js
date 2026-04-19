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
  const buscarPendientes = document.getElementById('buscarPendientes');
  const btnDevolver = document.getElementById('btnDevolver');
  const devolucionTicket = document.getElementById('devolucionTicket');
  const devolucionImporte = document.getElementById('devolucionImporte');
  const devolucionMotivo = document.getElementById('devolucionMotivo');
  const informeDesde = document.getElementById('informeDesde');
  const informeHasta = document.getElementById('informeHasta');
  const btnInforme = document.getElementById('btnInforme');
  const totalCobrado = document.getElementById('totalCobrado');
  const totalDevuelto = document.getElementById('totalDevuelto');
  const totalNeto = document.getElementById('totalNeto');

  let pendientes = [];

  function dinero(valor) {
    return formatoMoneda.format(Number(valor || 0));
  }

  function textoMovimiento(item) {
    return `
      ${item.ticket_uuid}
      ${item.nombre} ${item.apellido}
      ${item.celular || ''}
      ${item.tipo} ${item.marca} ${item.modelo}
    `.toLowerCase();
  }

  function renderPendientes() {
    const filtro = buscarPendientes.value.trim().toLowerCase();
    tablaPendientes.innerHTML = '';

    pendientes
      .filter(item => textoMovimiento(item).includes(filtro))
      .forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${item.nombre} ${item.apellido}</td>
          <td>${item.celular || ''}</td>
          <td>${item.tipo} - ${item.marca} - ${item.modelo}</td>
          <td>${item.ticket_uuid}</td>
          <td>${dinero(item.importe_total)}</td>
          <td>${dinero(item.sena)}</td>
          <td>${dinero(item.saldo)}</td>
          <td><button class="btn-cobrar">Cobrar</button></td>
        `;

        tr.querySelector('.btn-cobrar').onclick = async () => {
          if (!confirm(`Confirmar cobro de ${dinero(item.saldo)}?`)) return;

          try {
            await window.apiCaja.cobrar(item.ticket_uuid);
            await cargarTodo();
          } catch (error) {
            alert(error.message || 'No se pudo registrar el cobro');
          }
        };

        tablaPendientes.appendChild(tr);
      });
  }

  function renderCobrados(cobrados) {
    tablaCobrados.innerHTML = '';

    cobrados.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.nombre} ${item.apellido}</td>
        <td>${item.tipo} - ${item.marca} - ${item.modelo}</td>
        <td>${item.ticket_uuid}</td>
        <td>${dinero(item.saldo)}</td>
        <td>${dinero(item.devoluciones)}</td>
        <td>${item.fecha_cobro || ''}</td>
        <td>
          <button class="btn-pdf-x">PDF</button>
          <button class="btn-wa-x">WhatsApp</button>
        </td>
      `;

      tr.querySelector('.btn-pdf-x').onclick = async () => {
        try {
          const comprobante = await window.apiCaja.comprobanteX(item.ticket_uuid);
          await window.apiCaja.abrirPDF(comprobante.pdf_path);
        } catch (error) {
          alert(error.message || 'No se pudo abrir el comprobante');
        }
      };

      tr.querySelector('.btn-wa-x').onclick = async () => {
        try {
          const comprobante = await window.apiCaja.comprobanteX(item.ticket_uuid);
          const numero = String(comprobante.numero).padStart(8, '0');
          const texto =
            `Hola ${item.nombre}, te enviamos el comprobante X ${numero} ` +
            `por la reparacion de ${item.tipo} ${item.marca} ${item.modelo}. ` +
            `Importe cobrado: ${dinero(item.saldo)}. ` +
            `Documento no valido como factura.`;

          await window.apiCaja.whatsapp({
            telefono: item.celular,
            texto
          });
        } catch (error) {
          alert(error.message || 'No se pudo abrir WhatsApp');
        }
      };

      tablaCobrados.appendChild(tr);
    });
  }

  async function cargarInforme() {
    const informe = await window.apiCaja.informe({
      desde: informeDesde.value,
      hasta: informeHasta.value
    });

    totalCobrado.textContent = dinero(informe.cobros.total);
    totalDevuelto.textContent = dinero(informe.devoluciones.total);
    totalNeto.textContent = dinero(informe.neto);
  }

  async function cargarTodo() {
    pendientes = await window.apiCaja.listarPendientes();
    const cobrados = await window.apiCaja.listarCobrados(100);

    renderPendientes();
    renderCobrados(cobrados);
    await cargarInforme();
  }

  btnDevolver.onclick = async () => {
    if (!devolucionTicket.value.trim()) {
      alert('Ingresa el ticket');
      return;
    }

    try {
      await window.apiCaja.devolver({
        ticket_uuid: devolucionTicket.value.trim(),
        importe: Number(devolucionImporte.value || 0),
        motivo: devolucionMotivo.value.trim()
      });

      devolucionTicket.value = '';
      devolucionImporte.value = '';
      devolucionMotivo.value = '';
      await cargarTodo();
    } catch (error) {
      alert(error.message || 'No se pudo registrar la devolucion');
    }
  };

  btnRefrescar.onclick = cargarTodo;
  btnInforme.onclick = cargarInforme;
  buscarPendientes.oninput = renderPendientes;

  window.apiCaja.rutaDB().then(ruta => {
    rutaDB.textContent = `DB: ${ruta}`;
  });

  cargarTodo();
});
