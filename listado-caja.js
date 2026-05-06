document.addEventListener('DOMContentLoaded', () => {
  const listadoDesde = document.getElementById('listadoDesde');
  const listadoHasta = document.getElementById('listadoHasta');
  const btnPeriodoCompletoListado = document.getElementById('btnPeriodoCompletoListado');
  const btnMesActualListado = document.getElementById('btnMesActualListado');
  const btnMesAnteriorListado = document.getElementById('btnMesAnteriorListado');
  const btnLimpiarListado = document.getElementById('btnLimpiarListado');
  const btnActualizarListado = document.getElementById('btnActualizarListado');
  const btnImprimirListado = document.getElementById('btnImprimirListado');
  const btnExportarCsv = document.getElementById('btnExportarCsv');
  const btnExportarPdf = document.getElementById('btnExportarPdf');
  const listadoTotalCobrado = document.getElementById('listadoTotalCobrado');
  const listadoTotalDevuelto = document.getElementById('listadoTotalDevuelto');
  const listadoTotalNeto = document.getElementById('listadoTotalNeto');
  const listadoCantidad = document.getElementById('listadoCantidad');
  const tablaListadoCaja = document.getElementById('tablaListadoCaja');
  let ultimoResultado = { items: [], totales: { cobrado: 0, devuelto: 0, neto: 0, movimientos: 0 } };
  let dateFormat = 'system';
  let currencyCode = 'ARS';
  let currencyFormat = 'system';

  function hoyIso() {
    const ahora = new Date();
    const offsetMs = ahora.getTimezoneOffset() * 60000;
    return new Date(ahora.getTime() - offsetMs).toISOString().slice(0, 10);
  }

  function aplicarPeriodoHoy() {
    const hoy = hoyIso();
    listadoDesde.value = hoy;
    listadoHasta.value = hoy;
  }

  function aIsoLocal(fecha) {
    const offsetMs = fecha.getTimezoneOffset() * 60000;
    return new Date(fecha.getTime() - offsetMs).toISOString().slice(0, 10);
  }

  function aplicarMesActual() {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
    listadoDesde.value = aIsoLocal(inicio);
    listadoHasta.value = aIsoLocal(fin);
  }

  function aplicarMesAnterior() {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
    listadoDesde.value = aIsoLocal(inicio);
    listadoHasta.value = aIsoLocal(fin);
  }

  function aplicarPeriodoCompleto() {
    listadoDesde.value = '2020-01-01';
    listadoHasta.value = hoyIso();
  }

  function dinero(valor) {
    return window.dateFormatUtils.formatCurrency(valor, currencyCode, currencyFormat);
  }

  function mostrarAlerta(title, message) {
    return window.appDialog?.alert({ title, message }) || Promise.resolve(alert(message));
  }

  function filtros() {
    return {
      desde: listadoDesde.value,
      hasta: listadoHasta.value
    };
  }

  function validarFechas() {
    const { desde, hasta } = filtros();

    if (!desde || !hasta) {
      throw new Error('Debe completar ambas fechas: desde y hasta.');
    }

    if (desde > hasta) {
      throw new Error('La fecha desde no puede ser mayor que la fecha hasta.');
    }
  }

  function fechaHora(valor) {
    return window.dateFormatUtils.formatDateTime(valor, dateFormat);
  }

  function descripcionEquipo(item) {
    return [item.tipo_equipo, item.marca, item.modelo].filter(Boolean).join(' - ');
  }

  function renderTabla(items) {
    tablaListadoCaja.innerHTML = '';

    if (!items.length) {
      tablaListadoCaja.innerHTML = '<tr><td colspan="8" class="table-empty">No hay movimientos para los filtros seleccionados.</td></tr>';
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fechaHora(item.fecha)}</td>
        <td>${item.tipo === 'COBRO' ? 'Cobro' : 'Devolucion'}</td>
        <td>${item.nombre} ${item.apellido}</td>
        <td>${descripcionEquipo(item)}</td>
        <td>${item.ticket_codigo || item.ticket_uuid}</td>
        <td>${item.tipo === 'COBRO' ? dinero(item.importe_cobrado) : '-'}</td>
        <td>${item.tipo === 'DEVOLUCION' ? dinero(item.importe_devuelto) : '-'}</td>
        <td>${item.motivo || '-'}</td>
      `;
      tablaListadoCaja.appendChild(tr);
    });
  }

  function escapeCsv(value) {
    const text = String(value ?? '');
    return `"${text.replaceAll('"', '""')}"`;
  }

  async function exportarCsv() {
    if (!ultimoResultado.items.length) {
      await mostrarAlerta('Sin datos', 'No hay movimientos para exportar.');
      return;
    }

    const lineas = [
      ['Fecha', 'Tipo', 'Cliente', 'Equipo', 'Ticket', 'Cobrado', 'Devuelto', 'Motivo'].map(escapeCsv).join(',')
    ];

    ultimoResultado.items.forEach(item => {
      lineas.push([
        fechaHora(item.fecha),
        item.tipo === 'COBRO' ? 'Cobro' : 'Devolucion',
        `${item.nombre} ${item.apellido}`,
        descripcionEquipo(item),
        item.ticket_codigo || item.ticket_uuid,
        item.tipo === 'COBRO' ? dinero(item.importe_cobrado) : '',
        item.tipo === 'DEVOLUCION' ? dinero(item.importe_devuelto) : '',
        item.motivo || ''
      ].map(escapeCsv).join(','));
    });

    const csv = lineas.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `listado_caja_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportarPdf() {
    if (!ultimoResultado.items.length) {
      await mostrarAlerta('Sin datos', 'No hay movimientos para exportar.');
      return;
    }

    const config = await window.apiCaja.obtenerConfiguracion();
    currencyCode = config?.currencyCode || 'ARS';
    currencyFormat = config?.currencyFormat || 'system';
    const ruta = await window.apiCaja.generarReporteListadoPdf({
      negocio: null,
      filtros: filtros(),
      resultado: ultimoResultado,
      dateFormat: config?.dateFormat || 'system'
    });
    await window.apiCaja.abrirPDF(ruta);
    await mostrarAlerta('PDF generado', `El reporte se genero en:\n${ruta}`);
  }

  async function abrirReporteImpresion() {
    if (!ultimoResultado.items.length) {
      await mostrarAlerta('Sin datos', 'No hay movimientos para imprimir.');
      return;
    }

    await window.apiCaja.abrirReporteListado({
      filtros: filtros(),
      resultado: ultimoResultado
    });
  }

  async function cargar() {
    const config = await window.apiCaja.obtenerConfiguracion();
    dateFormat = config?.dateFormat || 'system';
    currencyCode = config?.currencyCode || 'ARS';
    currencyFormat = config?.currencyFormat || 'system';
    validarFechas();
    const data = await window.apiCaja.listado(filtros());
    ultimoResultado = data;
    listadoTotalCobrado.textContent = dinero(data.totales.cobrado);
    listadoTotalDevuelto.textContent = dinero(data.totales.devuelto);
    listadoTotalNeto.textContent = dinero(data.totales.neto);
    listadoCantidad.textContent = String(data.totales.movimientos || 0);
    renderTabla(data.items);
  }

  btnActualizarListado.addEventListener('click', () => {
    cargar().catch(error => mostrarAlerta('No se pudo cargar el listado', error.message || 'No se pudo cargar el listado.'));
  });

  btnMesActualListado.addEventListener('click', () => {
    aplicarMesActual();
    cargar().catch(error => mostrarAlerta('No se pudo cargar el listado', error.message || 'No se pudo cargar el listado.'));
  });

  btnPeriodoCompletoListado.addEventListener('click', () => {
    aplicarPeriodoCompleto();
    cargar().catch(error => mostrarAlerta('No se pudo cargar el listado', error.message || 'No se pudo cargar el listado.'));
  });

  btnMesAnteriorListado.addEventListener('click', () => {
    aplicarMesAnterior();
    cargar().catch(error => mostrarAlerta('No se pudo cargar el listado', error.message || 'No se pudo cargar el listado.'));
  });

  btnLimpiarListado.addEventListener('click', () => {
    aplicarPeriodoHoy();
    cargar().catch(error => mostrarAlerta('No se pudo cargar el listado', error.message || 'No se pudo cargar el listado.'));
  });

  [listadoDesde, listadoHasta].forEach(input => {
    input.addEventListener('change', () => {
      cargar().catch(error => mostrarAlerta('No se pudo cargar el listado', error.message || 'No se pudo cargar el listado.'));
    });
  });

  btnImprimirListado.addEventListener('click', () => {
    abrirReporteImpresion().catch(error => mostrarAlerta('No se pudo abrir el reporte', error.message || 'No se pudo abrir la vista previa.'));
  });
  btnExportarCsv.addEventListener('click', () => {
    exportarCsv().catch(error => mostrarAlerta('No se pudo exportar', error.message || 'No se pudo exportar el CSV.'));
  });
  btnExportarPdf.addEventListener('click', () => {
    exportarPdf().catch(error => mostrarAlerta('No se pudo exportar', error.message || 'No se pudo exportar el PDF.'));
  });

  aplicarPeriodoHoy();

  cargar().catch(error => {
    mostrarAlerta('No se pudo cargar el listado', error.message || 'No se pudo cargar el listado.');
  });
});
