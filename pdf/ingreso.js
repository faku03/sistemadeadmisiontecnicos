const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { outputDir, drawHeader, drawDocumentTitle, sectionTitle, infoLine, signatureLine } = require('./common');
const appConfig = require('../config/app.config');
const { formatDateTime } = require('../date-format');

module.exports = ticket => {
  const filePath = path.join(outputDir('pdfs'), `ingreso_${ticket.uuid}.pdf`);
  const doc = new PDFDocument({ margin: 40 });

  doc.pipe(fs.createWriteStream(filePath));

  drawHeader(doc, ticket);
  drawDocumentTitle(doc, 'COMPROBANTE DE INGRESO');

  sectionTitle(doc, 'Datos del ticket');
  infoLine(doc, 'Ticket', ticket.codigo || ticket.uuid);
  infoLine(doc, 'Fecha de ingreso', formatDateTime(ticket.fecha_ingreso || new Date(), appConfig.dateFormat));

  sectionTitle(doc, 'Cliente');
  infoLine(doc, 'Nombre', `${ticket.cliente_nombre} ${ticket.cliente_apellido}`);
  infoLine(doc, 'Celular', ticket.celular);
  infoLine(doc, 'Email', ticket.email);

  sectionTitle(doc, 'Equipo');
  infoLine(doc, 'Tipo', ticket.tipo_equipo);
  infoLine(doc, 'Modelo', `${ticket.marca} ${ticket.modelo}`);
  infoLine(doc, 'Falla', ticket.descripcion_falla);

  doc.moveDown(2);
  doc.font('Helvetica').fontSize(10).fillColor('#000000')
    .text('Recibido para revision y/o reparacion. Sujeto a presupuesto previo.', { align: 'center' });

  doc.moveDown(3);
  signatureLine(doc);

  doc.end();
  return filePath;
};
