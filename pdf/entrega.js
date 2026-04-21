const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { outputDir, drawHeader, drawDocumentTitle, sectionTitle, infoLine, signatureLine } = require('./common');

function generarPDFEntrega(ticket) {
  const doc = new PDFDocument({ margin: 40 });
  const nombreArchivo = `entrega_${ticket.uuid}.pdf`;
  const ruta = path.join(outputDir('pdfs'), nombreArchivo);

  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  doc.pipe(fs.createWriteStream(ruta));

  drawHeader(doc, ticket);
  drawDocumentTitle(doc, 'COMPROBANTE DE ENTREGA');

  sectionTitle(doc, 'Datos de entrega');
  infoLine(doc, 'Ticket', ticket.codigo || ticket.uuid);
  infoLine(doc, 'Fecha de entrega', ticket.fecha_entrega);
  infoLine(doc, 'Cliente', `${ticket.cliente_nombre} ${ticket.cliente_apellido}`);
  infoLine(doc, 'Equipo', `${ticket.tipo_equipo} - ${ticket.marca} ${ticket.modelo}`);

  sectionTitle(doc, 'Trabajo realizado');
  doc.text(ticket.trabajo_realizado || '---');
  doc.moveDown();

  sectionTitle(doc, 'Garantia');
  infoLine(doc, 'Dias de garantia', ticket.garantia_dias || 0);

  if (ticket.fecha_entrega && ticket.garantia_dias) {
    const f = new Date(ticket.fecha_entrega);
    f.setDate(f.getDate() + ticket.garantia_dias);
    infoLine(doc, 'Vence el', f.toLocaleDateString('es-AR'));
  }

  doc.moveDown(3);
  signatureLine(doc);

  doc.end();
  return ruta;
}

module.exports = generarPDFEntrega;
