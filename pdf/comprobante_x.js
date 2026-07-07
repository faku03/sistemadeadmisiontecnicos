const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { drawHeader, drawDocumentTitle, sectionTitle, infoLine, money, signatureLine } = require('./common');
const appConfig = require('../config/app.config');
const { formatDateTime } = require('../date-format');

function generarComprobanteX(datos, outputDir) {
  const numero = String(datos.numero).padStart(8, '0');
  const ticketCodigo = datos.ticket_codigo || datos.ticket_uuid;
  const nombreArchivo = `comprobante_x_${numero}_${ticketCodigo}.pdf`;
  const ruta = path.join(outputDir, nombreArchivo);

  fs.mkdirSync(path.dirname(ruta), { recursive: true });

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(fs.createWriteStream(ruta));

  const total = Number(datos.saldo || 0);
  const cliente = `${datos.nombre} ${datos.apellido}`;
  const equipo = `${datos.tipo} - ${datos.marca} ${datos.modelo}`;

  drawHeader(doc, datos);
  doc.fontSize(26).font('Helvetica-Bold').fillColor('#0f4c81').text('X', { align: 'center' });
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#2d4766').text('DOCUMENTO NO VALIDO COMO FACTURA', { align: 'center' });
  doc.moveDown(0.4);
  drawDocumentTitle(doc, 'COMPROBANTE DE COBRO');

  sectionTitle(doc, 'Comprobante');
  infoLine(doc, 'Comprobante X Nro', numero);
  infoLine(doc, 'Fecha', formatDateTime(datos.fecha_cobro || new Date(), appConfig.dateFormat));
  infoLine(doc, 'Ticket', ticketCodigo);

  sectionTitle(doc, 'Cliente');
  infoLine(doc, 'Nombre', cliente);
  infoLine(doc, 'DNI', datos.dni);
  infoLine(doc, 'Celular', datos.celular);

  sectionTitle(doc, 'Equipo');
  infoLine(doc, 'Equipo', equipo);
  infoLine(doc, 'Fallas detectadas', datos.descripcion_falla);
  infoLine(doc, 'Trabajos realizados', datos.trabajo_realizado);
  if (datos.repuestos_detalle) {
    infoLine(doc, 'Repuestos', datos.repuestos_detalle);
  }

  sectionTitle(doc, 'Importe');
  infoLine(doc, 'Total presupuesto', money(datos.importe_total));
  infoLine(doc, 'Sena', money(datos.sena));
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#0f4c81').text(`Saldo cobrado: ${money(total)}`);
  doc.moveDown(2);

  doc.font('Helvetica').fontSize(10).fillColor('#000000').text(
    'Este comprobante respalda un cobro interno y no reemplaza la factura electronica fiscal correspondiente.',
    { align: 'center' }
  );

  doc.moveDown(3);
  signatureLine(doc, 'Firma / aclaracion');

  doc.end();
  return ruta;
}

module.exports = generarComprobanteX;
