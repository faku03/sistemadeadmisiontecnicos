const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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

  doc.fontSize(26).text('X', { align: 'center' });
  doc.fontSize(14).text('DOCUMENTO NO VALIDO COMO FACTURA', { align: 'center' });
  doc.moveDown();

  doc.fontSize(18).text('COMPROBANTE DE COBRO', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Comprobante X Nro: ${numero}`);
  doc.text(`Fecha: ${datos.fecha_cobro || new Date().toLocaleString('es-AR')}`);
  doc.text(`Ticket: ${ticketCodigo}`);
  doc.moveDown();

  doc.text('CLIENTE', { underline: true });
  doc.text(`Nombre: ${cliente}`);
  doc.text(`DNI: ${datos.dni || '---'}`);
  doc.text(`Celular: ${datos.celular || '---'}`);
  doc.moveDown();

  doc.text('EQUIPO', { underline: true });
  doc.text(equipo);
  doc.text(`Falla: ${datos.descripcion_falla || '---'}`);
  doc.text(`Trabajo realizado: ${datos.trabajo_realizado || '---'}`);
  doc.moveDown();

  doc.text('IMPORTE', { underline: true });
  doc.text(`Total presupuesto: $${Number(datos.importe_total || 0).toFixed(2)}`);
  doc.text(`Sena: $${Number(datos.sena || 0).toFixed(2)}`);
  doc.fontSize(15).text(`Saldo cobrado: $${total.toFixed(2)}`);
  doc.moveDown(2);

  doc.fontSize(10).text(
    'Este comprobante respalda un cobro interno y no reemplaza la factura electronica fiscal correspondiente.',
    { align: 'center' }
  );

  doc.end();
  return ruta;
}

module.exports = generarComprobanteX;
