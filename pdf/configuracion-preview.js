const PDFDocument = require('pdfkit');
const fs = require('fs');
const { outputDir, uniquePath, drawHeader, drawDocumentTitle, sectionTitle, infoLine, signatureLine } = require('./common');

function generarPreviewConfiguracion(config = {}) {
  const dir = outputDir('pdfs');
  const ruta = uniquePath(dir, 'Configuracion PDF Preview');

  fs.mkdirSync(dir, { recursive: true });

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(fs.createWriteStream(ruta));

  const data = {
    sucursal_nombre: config.sucursalNombre,
    sucursal_direccion: config.pdfBusinessAddress,
    sucursal_telefono: config.pdfBusinessPhone,
    sucursal_email: config.pdfBusinessEmail
  };

  drawHeader(doc, data, config);
  drawDocumentTitle(doc, 'VISTA PREVIA DE PDF');

  sectionTitle(doc, 'Datos visibles');
  infoLine(doc, 'Negocio', config.pdfBusinessName || config.sucursalNombre || 'Sin nombre');
  infoLine(doc, 'Sucursal', config.sucursalId || 'Sin codigo');
  infoLine(doc, 'Direccion', config.pdfBusinessAddress || 'Sin direccion');
  infoLine(doc, 'Telefono', config.pdfBusinessPhone || 'Sin telefono');
  infoLine(doc, 'Email', config.pdfBusinessEmail || 'Sin email');

  sectionTitle(doc, 'Observacion');
  doc.text('Esta vista previa usa los datos actuales de la configuracion para validar el encabezado y el formato general del PDF.');
  doc.moveDown(3);

  signatureLine(doc, 'Firma del cliente');

  doc.end();
  return ruta;
}

module.exports = generarPreviewConfiguracion;
