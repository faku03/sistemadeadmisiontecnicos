const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

module.exports = (ticket) => {
  const filePath = path.join(
    __dirname,
    `../pdfs/ingreso_${ticket.uuid}.pdf`
  );

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  doc.text(`Cliente: ${ticket.cliente_nombre} ${ticket.cliente_apellido}`);
  doc.text(`Equipo: ${ticket.tipo_equipo}`);
  doc.text(`Modelo: ${ticket.marca} ${ticket.modelo}`);
  doc.text(`Falla: ${ticket.descripcion_falla}`);

  doc.end();

  return filePath; // 🔥 ESTO ES CLAVE
};
