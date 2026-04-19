const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generarPDFPresupuesto(ticket) {
  const nombreArchivo = `presupuesto_${ticket.uuid}.pdf`;
  const ruta = path.join(__dirname, '..', 'pdfs', nombreArchivo);

  fs.mkdirSync(path.dirname(ruta), { recursive: true });

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(fs.createWriteStream(ruta));

  const valor = Number(ticket.valor_reparacion || 0);
  const sena = Number(ticket.sena || 0);
  const saldo = valor - sena;

  doc.fontSize(18).text('PRESUPUESTO DE REPARACION', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Ticket: ${ticket.uuid}`);
  doc.text(`Cliente: ${ticket.cliente_nombre} ${ticket.cliente_apellido}`);
  doc.text(`Celular: ${ticket.celular || '---'}`);
  doc.moveDown();

  doc.text('EQUIPO', { underline: true });
  doc.text(`${ticket.tipo_equipo} - ${ticket.marca} ${ticket.modelo}`);
  doc.text(`Falla: ${ticket.descripcion_falla}`);
  doc.moveDown();

  doc.text('IMPORTES', { underline: true });
  doc.text(`Valor reparacion: $${valor.toFixed(2)}`);
  doc.text(`Sena: $${sena.toFixed(2)}`);
  doc.text(`Saldo: $${saldo.toFixed(2)}`);
  doc.moveDown(3);

  doc.text('Firma del cliente: __________________________');

  doc.end();
  return ruta;
}

module.exports = generarPDFPresupuesto;
