const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { drawHeader, drawDocumentTitle, outputDir, uniquePath, money } = require('./common');
const { formatDateTime, formatRange } = require('../date-format');

function generarReporteCaja(payload = {}) {
  const negocio = payload.negocio || {};
  const filtros = payload.filtros || {};
  const resultado = payload.resultado || { items: [], totales: {} };
  const items = Array.isArray(resultado.items) ? resultado.items : [];
  const totales = resultado.totales || {};
  const dateFormat = payload.dateFormat || 'system';

  const dir = outputDir(path.join('pdfs', 'reportes_caja'));
  const filePath = uniquePath(dir, `reporte_caja_${new Date().toISOString().slice(0, 10)}`);
  const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
  doc.pipe(fs.createWriteStream(filePath));

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const baseX = doc.page.margins.left;
  const usableBottom = doc.page.height - doc.page.margins.bottom - 42;
  const periodText = formatRange(filtros.desde, filtros.hasta, dateFormat);

  function datosHeader() {
    return {
      sucursal_nombre: negocio.nombre,
      sucursal_direccion: negocio.direccion,
      sucursal_telefono: negocio.telefono,
      sucursal_email: negocio.email
    };
  }

  function text(value) {
    return String(value || '').trim() || '-';
  }

  function equipo(item) {
    return [item.tipo_equipo, item.marca, item.modelo].filter(Boolean).join(' - ') || '-';
  }

  function tipo(item) {
    return item.tipo === 'COBRO' ? 'Cobro' : 'Devolucion';
  }

  const columns = [
    { key: 'fecha', label: 'Fecha', width: 82, align: 'left' },
    { key: 'tipo', label: 'Tipo', width: 52, align: 'left' },
    { key: 'cliente', label: 'Cliente', width: 86, align: 'left' },
    { key: 'equipo', label: 'Equipo', width: 116, align: 'left' },
    { key: 'ticket', label: 'Ticket', width: 102, align: 'left' },
    { key: 'cobrado', label: 'Cobrado', width: 58, align: 'right' },
    { key: 'devuelto', label: 'Devuelto', width: 58, align: 'right' },
    { key: 'motivo', label: 'Motivo', width: pageWidth - 82 - 52 - 86 - 116 - 102 - 58 - 58, align: 'left' }
  ];

  function drawTableHeader() {
    let x = baseX;
    const y = doc.y;
    doc.save();
    doc.fillColor('#0f4c81').font('Helvetica-Bold').fontSize(10);
    columns.forEach(column => {
      doc.text(column.label, x + 4, y, {
        width: column.width - 8,
        align: column.align,
        lineBreak: false
      });
      x += column.width;
    });
    doc.restore();
    doc.y = y + 14;
    doc.moveTo(baseX, doc.y).lineTo(baseX + pageWidth, doc.y).lineWidth(1).stroke('#d6e0ec');
    doc.moveDown(0.35);
  }

  function ensureSpace(required = 40, repeatHeader = true) {
    if (doc.y + required <= usableBottom) {
      return;
    }

    doc.addPage();
    drawHeader(doc, datosHeader());
    drawDocumentTitle(doc, 'REPORTE DE CAJA');
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#2d4766').text(periodText, {
      align: 'center'
    });
    doc.moveDown(0.8);
    if (repeatHeader) {
      drawTableHeader();
    }
  }

  function drawRow(values) {
    const cellHeights = values.map((value, index) => {
      const column = columns[index];
      return doc.heightOfString(value, {
        width: column.width - 8,
        align: column.align
      });
    });

    const rowHeight = Math.max(...cellHeights, 16) + 8;
    ensureSpace(rowHeight + 8);

    let x = baseX;
    const y = doc.y;
    doc.font('Helvetica').fontSize(9.5).fillColor('#000000');
    values.forEach((value, index) => {
      const column = columns[index];
      doc.text(value, x + 4, y + 4, {
        width: column.width - 8,
        align: column.align
      });
      x += column.width;
    });

    doc.y = y + rowHeight;
    doc.moveTo(baseX, doc.y).lineTo(baseX + pageWidth, doc.y).lineWidth(0.8).stroke('#d6e0ec');
    doc.moveDown(0.15);
  }

  drawHeader(doc, datosHeader());
  drawDocumentTitle(doc, 'REPORTE DE CAJA');
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#2d4766').text(periodText, {
    align: 'center'
  });
  doc.moveDown(0.8);
  drawTableHeader();

  if (!items.length) {
    doc.font('Helvetica').fontSize(10).fillColor('#5d7892').text('No hay movimientos para este periodo.', {
      align: 'center'
    });
    doc.moveDown(1);
  } else {
    items.forEach(item => {
      drawRow([
        text(formatDateTime(item.fecha, dateFormat)),
        tipo(item),
        text(`${item.nombre || ''} ${item.apellido || ''}`),
        text(equipo(item)),
        text(item.ticket_codigo || item.ticket_uuid),
        item.tipo === 'COBRO' ? money(item.importe_cobrado) : '-',
        item.tipo === 'DEVOLUCION' ? money(item.importe_devuelto) : '-',
        text(item.motivo)
      ]);
    });
  }

  ensureSpace(80, false);
  doc.moveDown(0.6);
  doc.moveTo(baseX, doc.y).lineTo(baseX + pageWidth, doc.y).lineWidth(1).stroke('#d6e0ec');
  doc.moveDown(0.7);

  const totals = [
    ['Cobrado', money(totales.cobrado)],
    ['Devuelto', money(totales.devuelto)],
    ['Neto', money(totales.neto)],
    ['Movimientos', String(totales.movimientos || 0)]
  ];

  const cardWidth = (pageWidth - 18) / 4;
  const cardY = doc.y;
  totals.forEach(([label, value], index) => {
    const x = baseX + (index * (cardWidth + 6));
    doc.roundedRect(x, cardY, cardWidth, 46, 6).lineWidth(1).stroke(index === 2 ? '#b8cdf8' : '#d6e0ec');
    doc.font('Helvetica').fontSize(10).fillColor('#5d7892').text(label, x + 10, cardY + 8, { width: cardWidth - 20 });
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f4c81').text(value, x + 10, cardY + 23, {
      width: cardWidth - 20,
      align: index === 3 ? 'left' : 'left'
    });
  });
  doc.y = cardY + 56;

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const footerY = doc.page.height - doc.page.margins.bottom + 6;
    doc.font('Helvetica').fontSize(9).fillColor('#5a6775');
    doc.text(periodText, doc.page.margins.left, footerY, {
      width: 260,
      align: 'left'
    });
    doc.text(`Pagina ${i + 1} de ${range.count}`, doc.page.margins.left, footerY, {
      width: pageWidth,
      align: 'right'
    });
    doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).lineWidth(0.8).stroke('#9aa8b8');
  }

  doc.end();
  return filePath;
}

module.exports = generarReporteCaja;
