const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generarPDFEntrega(ticket) {
  const doc = new PDFDocument({ margin: 40 });

  const nombreArchivo = `entrega_${ticket.uuid}.pdf`;
  const ruta = path.join(__dirname, '..', 'pdfs', nombreArchivo);

  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  doc.pipe(fs.createWriteStream(ruta));

  doc.fontSize(18).text('COMPROBANTE DE ENTREGA', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Ticket N°: ${ticket.uuid}`);
  doc.text(`Fecha de entrega: ${ticket.fecha_entrega}`);
  doc.moveDown();

  doc.text('TRABAJO REALIZADO', { underline: true });
  doc.text(ticket.trabajo_realizado || '---');
  doc.moveDown();

  doc.text('GARANTÍA', { underline: true });
  doc.text(`Días de garantía: ${ticket.garantia_dias || 0}`);

  if (ticket.fecha_entrega && ticket.garantia_dias) {
    const f = new Date(ticket.fecha_entrega);
    f.setDate(f.getDate() + ticket.garantia_dias);
    doc.text(`Vence el: ${f.toISOString().split('T')[0]}`);
  }

  doc.moveDown(3);
  doc.text('Firma del cliente: __________________________');

  doc.end();
  return ruta;
}

module.exports = generarPDFEntrega;
