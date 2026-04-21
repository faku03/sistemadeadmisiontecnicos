const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { appBaseDir, sanitizeFilePart, uniquePath, drawHeader, drawDocumentTitle, sectionTitle, infoLine, money, signatureLine } = require('./common');

function generarPDFPresupuesto(ticket) {
  const baseDir = appBaseDir();
  const outputDir = path.join(baseDir, 'pdf_presupuesto');
  const cliente = sanitizeFilePart(`${ticket.cliente_nombre} ${ticket.cliente_apellido}`) || 'Cliente';
  const equipo = sanitizeFilePart(`${ticket.tipo_equipo} ${ticket.marca} ${ticket.modelo}`) || 'Equipo';
  const ruta = uniquePath(outputDir, sanitizeFilePart(`${cliente} ${equipo} Presupuesto`) || `Presupuesto ${ticket.codigo || ticket.uuid}`);

  fs.mkdirSync(path.dirname(ruta), { recursive: true });

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(fs.createWriteStream(ruta));

  const valor = Number(ticket.valor_reparacion || 0);
  const sena = Number(ticket.sena || 0);
  const saldo = valor - sena;

  drawHeader(doc, ticket);
  drawDocumentTitle(doc, 'PRESUPUESTO DE REPARACION');

  sectionTitle(doc, 'Datos del ticket');
  infoLine(doc, 'Ticket', ticket.codigo || ticket.uuid);
  infoLine(doc, 'Cliente', `${ticket.cliente_nombre} ${ticket.cliente_apellido}`);
  infoLine(doc, 'Celular', ticket.celular);

  sectionTitle(doc, 'Equipo');
  infoLine(doc, 'Equipo', `${ticket.tipo_equipo} - ${ticket.marca} ${ticket.modelo}`);
  infoLine(doc, 'Falla', ticket.descripcion_falla);

  sectionTitle(doc, 'Reparacion a realizar');
  doc.text(ticket.reparacion_presupuestada || '---');
  doc.moveDown();

  sectionTitle(doc, 'Importes');
  infoLine(doc, 'Valor reparacion', money(valor));
  infoLine(doc, 'Sena', money(sena));
  infoLine(doc, 'Saldo', money(saldo));
  doc.moveDown(3);

  signatureLine(doc);

  doc.end();
  return ruta;
}

module.exports = generarPDFPresupuesto;
