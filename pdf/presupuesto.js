const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function appBaseDir() {
  if (
    fs.existsSync(path.join(process.cwd(), 'package.json')) &&
    fs.existsSync(path.join(process.cwd(), 'main.js'))
  ) {
    return process.cwd();
  }

  const execDir = process.execPath ? path.dirname(process.execPath) : process.cwd();
  const normalizedExecDir = execDir.toLowerCase();

  if (process.defaultApp || normalizedExecDir.includes(`${path.sep}node_modules${path.sep}`)) {
    return process.cwd();
  }

  return execDir;
}

function sanitizeFilePart(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function uniquePath(dir, baseName) {
  let candidate = path.join(dir, `${baseName}.pdf`);
  let counter = 2;

  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${baseName} ${counter}.pdf`);
    counter += 1;
  }

  return candidate;
}

function generarPDFPresupuesto(ticket) {
  const baseDir = appBaseDir();
  const outputDir = path.join(baseDir, 'pdf_presupuesto');
  const logoPath = path.join(baseDir, 'images', 'logopdf.png');
  const cliente = sanitizeFilePart(`${ticket.cliente_nombre} ${ticket.cliente_apellido}`) || 'Cliente';
  const equipo = sanitizeFilePart(`${ticket.tipo_equipo} ${ticket.marca} ${ticket.modelo}`) || 'Equipo';
  const ruta = uniquePath(outputDir, sanitizeFilePart(`${cliente} ${equipo} Presupuesto`) || `Presupuesto ${ticket.codigo || ticket.uuid}`);

  fs.mkdirSync(path.dirname(ruta), { recursive: true });

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(fs.createWriteStream(ruta));

  const valor = Number(ticket.valor_reparacion || 0);
  const sena = Number(ticket.sena || 0);
  const saldo = valor - sena;

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 28, { fit: [130, 60] });
    doc.moveDown(3);
  }

  doc.fontSize(18).text('PRESUPUESTO DE REPARACION', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Ticket: ${ticket.codigo || ticket.uuid}`);
  doc.text(`Cliente: ${ticket.cliente_nombre} ${ticket.cliente_apellido}`);
  doc.text(`Celular: ${ticket.celular || '---'}`);
  doc.moveDown();

  doc.text('EQUIPO', { underline: true });
  doc.text(`${ticket.tipo_equipo} - ${ticket.marca} ${ticket.modelo}`);
  doc.text(`Falla: ${ticket.descripcion_falla}`);
  doc.moveDown();

  doc.text('REPARACION A REALIZAR', { underline: true });
  doc.text(ticket.reparacion_presupuestada || '---');
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
