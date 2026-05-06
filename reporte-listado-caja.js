document.addEventListener('DOMContentLoaded', () => {
  const reporteNegocioNombre = document.getElementById('reporteNegocioNombre');
  const reporteNegocioDireccion = document.getElementById('reporteNegocioDireccion');
  const reporteNegocioTelefono = document.getElementById('reporteNegocioTelefono');
  const reporteNegocioEmail = document.getElementById('reporteNegocioEmail');
  const reporteLogoImagen = document.getElementById('reporteLogoImagen');
  const reporteLogoTexto = document.getElementById('reporteLogoTexto');
  const reportePeriodo = document.getElementById('reportePeriodo');
  const reporteFooterPeriodo = document.getElementById('reporteFooterPeriodo');
  const reporteTotalCobrado = document.getElementById('reporteTotalCobrado');
  const reporteTotalDevuelto = document.getElementById('reporteTotalDevuelto');
  const reporteTotalNeto = document.getElementById('reporteTotalNeto');
  const reporteCantidad = document.getElementById('reporteCantidad');
  const reporteTablaMovimientos = document.getElementById('reporteTablaMovimientos');
  const btnImprimirReporte = document.getElementById('btnImprimirReporte');
  const btnCerrarReporte = document.getElementById('btnCerrarReporte');
  let dateFormat = 'system';
  let currencyCode = 'ARS';
  let currencyFormat = 'system';

  function dinero(valor) {
    return window.dateFormatUtils.formatCurrency(valor, currencyCode, currencyFormat);
  }

  function fechaHora(valor) {
    return window.dateFormatUtils.formatDateTime(valor, dateFormat);
  }

  function fechaCorta(valor) {
    return window.dateFormatUtils.formatDate(valor, dateFormat);
  }

  function descripcionEquipo(item) {
    return [item.tipo_equipo, item.marca, item.modelo].filter(Boolean).join(' - ');
  }

  function armarPeriodo(filtros = {}) {
    const desde = fechaCorta(filtros.desde);
    const hasta = fechaCorta(filtros.hasta);

    if (desde && hasta) return `Periodo desde ${desde} hasta ${hasta}`;
    return 'Periodo no valido';
  }

  function renderNegocio(negocio = {}) {
    reporteNegocioNombre.textContent = negocio.nombre || 'Sistema de Caja';
    reporteNegocioDireccion.textContent = negocio.direccion || '';
    reporteNegocioTelefono.textContent = negocio.telefono ? `Telefono: ${negocio.telefono}` : '';
    reporteNegocioEmail.textContent = negocio.email ? `Email: ${negocio.email}` : '';
    const logoUrl = String(negocio.logoUrl || '').trim();

    if (logoUrl) {
      reporteLogoImagen.src = logoUrl;
      reporteLogoImagen.classList.remove('hidden');
      reporteLogoTexto.classList.add('hidden');
    } else {
      reporteLogoImagen.removeAttribute('src');
      reporteLogoImagen.classList.add('hidden');
      reporteLogoTexto.classList.remove('hidden');
    }

    [reporteNegocioDireccion, reporteNegocioTelefono, reporteNegocioEmail].forEach(node => {
      node.style.display = node.textContent ? 'block' : 'none';
    });
  }

  function renderTabla(items = []) {
    reporteTablaMovimientos.innerHTML = '';

    if (!items.length) {
      reporteTablaMovimientos.innerHTML = '<tr><td colspan="8" class="table-empty">No hay movimientos para este periodo.</td></tr>';
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fechaHora(item.fecha)}</td>
        <td>${item.tipo === 'COBRO' ? 'Cobro' : 'Devolucion'}</td>
        <td>${item.nombre || ''} ${item.apellido || ''}</td>
        <td>${descripcionEquipo(item)}</td>
        <td>${item.ticket_codigo || item.ticket_uuid || ''}</td>
        <td class="is-number">${item.tipo === 'COBRO' ? dinero(item.importe_cobrado) : '-'}</td>
        <td class="is-number">${item.tipo === 'DEVOLUCION' ? dinero(item.importe_devuelto) : '-'}</td>
        <td>${item.motivo || '-'}</td>
      `;
      reporteTablaMovimientos.appendChild(tr);
    });
  }

  async function cargar() {
    const payload = await window.apiCaja.obtenerReporteListado();
    const negocio = payload.negocio || {};
    const filtros = payload.filtros || {};
    const resultado = payload.resultado || { items: [], totales: {} };
    const totales = resultado.totales || {};
    dateFormat = payload.dateFormat || 'system';
    currencyCode = payload.currencyCode || 'ARS';
    currencyFormat = payload.currencyFormat || 'system';

    renderNegocio(negocio);
    const periodo = armarPeriodo(filtros);
    reportePeriodo.textContent = periodo;
    reporteFooterPeriodo.textContent = periodo;
    reporteTotalCobrado.textContent = dinero(totales.cobrado);
    reporteTotalDevuelto.textContent = dinero(totales.devuelto);
    reporteTotalNeto.textContent = dinero(totales.neto);
    reporteCantidad.textContent = String(totales.movimientos || 0);
    renderTabla(resultado.items || []);
  }

  btnImprimirReporte.addEventListener('click', () => window.print());
  btnCerrarReporte.addEventListener('click', () => window.close());

  cargar().catch(async error => {
    if (window.appDialog?.alert) {
      await window.appDialog.alert({
        title: 'No se pudo cargar el reporte',
        message: error.message || 'No se pudo preparar el reporte de caja.'
      });
    }
  });
});
