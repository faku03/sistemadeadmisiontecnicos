const fs = require('fs');
const path = require('path');
const appConfig = require('../config/app.config');

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

function outputDir(folderName = 'pdfs') {
  const configured = String(appConfig.outputPath || '').trim();
  const base = configured
    ? (path.isAbsolute(configured) ? configured : path.join(appBaseDir(), configured))
    : path.join(appBaseDir(), folderName);

  fs.mkdirSync(base, { recursive: true });
  return base;
}

function effectiveConfig(overrideConfig = {}) {
  return {
    ...appConfig,
    ...Object.fromEntries(
      Object.entries(overrideConfig || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
    )
  };
}

function logoPath(overrideConfig = {}) {
  const config = effectiveConfig(overrideConfig);
  const configured = String(config.pdfLogoPath || '').trim();
  if (configured) {
    const resolved = path.isAbsolute(configured)
      ? configured
      : path.join(appBaseDir(), configured);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  const baseDir = appBaseDir();
  const candidates = [
    path.join(baseDir, 'images', 'logopdf.png'),
    path.join(baseDir, 'images', 'logo.png')
  ];

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

function composeBusinessAddress(data = {}, overrideConfig = {}) {
  const config = effectiveConfig(overrideConfig);
  const configuredStreet = String(config.pdfBusinessStreet || '').trim();
  const configuredLocality = String(config.pdfBusinessLocality || '').trim();
  const configuredProvince = String(config.pdfBusinessProvince || '').trim();

  const configuredParts = [
    configuredStreet,
    [configuredLocality, configuredProvince].filter(Boolean).join(', ')
  ].filter(Boolean);

  if (configuredParts.length) {
    return configuredParts.join(' - ');
  }

  return config.pdfBusinessAddress || data.sucursal_direccion || '';
}

function businessInfo(data = {}, overrideConfig = {}) {
  const config = effectiveConfig(overrideConfig);
  return {
    nombre: config.pdfBusinessName || config.sucursalNombre || data.sucursal_nombre || 'Sistema de Tickets',
    direccion: composeBusinessAddress(data, overrideConfig),
    telefono: config.pdfBusinessPhone || data.sucursal_telefono || '',
    email: config.pdfBusinessEmail || data.sucursal_email || ''
  };
}

function drawHeader(doc, data = {}, overrideConfig = {}) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const top = doc.page.margins.top;
  const logoBoxWidth = 92;
  const logoBoxHeight = 56;
  const infoWidth = 280;
  const infoLeft = right - infoWidth;
  const logo = logoPath(overrideConfig);
  const info = businessInfo(data, overrideConfig);

  doc.save();
  doc.rect(left, top + 4, logoBoxWidth, logoBoxHeight).lineWidth(1).stroke('#93adcb');

  if (logo) {
    doc.image(logo, left + 8, top + 10, {
      fit: [logoBoxWidth - 16, logoBoxHeight - 20],
      align: 'center',
      valign: 'center'
    });
  } else {
    doc.fontSize(15).font('Helvetica-Bold').fillColor('#2d4766').text('LOGO', left, top + 24, {
      width: logoBoxWidth,
      align: 'center'
    });
  }

  doc.fillColor('#2d4766').fontSize(17).font('Helvetica-Bold');
  doc.text(info.nombre, infoLeft, top + 4, { width: infoWidth, align: 'right' });
  doc.fillColor('#5a6775').fontSize(9.5).font('Helvetica');

  const lines = [
    info.direccion,
    info.telefono ? `Telefono ${info.telefono}` : '',
    info.email ? `Email: ${info.email}` : ''
  ].filter(Boolean);

  lines.forEach((line, index) => {
    doc.text(line, infoLeft, top + 26 + (index * 14), {
      width: infoWidth,
      align: 'right'
    });
  });

  doc.restore();
  doc.moveTo(left, top + logoBoxHeight + 26).lineTo(right, top + logoBoxHeight + 26).lineWidth(1).stroke('#d7dce3');
  doc.y = top + logoBoxHeight + 44;
}

function drawDocumentTitle(doc, text) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const width = right - left;

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#2d4766');
  doc.text(text, left, doc.y, {
    width,
    align: 'center',
    lineBreak: false
  });
  doc.moveDown(0.45);
  doc.moveTo(left, doc.y).lineTo(right, doc.y).lineWidth(1).stroke('#d7dce3');
  doc.moveDown(1.15);
}

function sectionTitle(doc, text) {
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const startY = doc.y + 4;

  doc.moveDown(0.95);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f4c81');
  doc.text(text, left, startY, {
    width: 220,
    align: 'left'
  });

  doc.strokeColor('#c9daec')
    .lineWidth(1.1)
    .moveTo(left, startY + 18)
    .lineTo(right, startY + 18)
    .stroke();

  doc.y = startY + 28;
  doc.font('Helvetica').fontSize(11).fillColor('#000000');
}

function infoLine(doc, label, value) {
  doc.font('Helvetica-Bold').fillColor('#000000').text(`${label}: `, { continued: true });
  doc.font('Helvetica').fillColor('#000000').text(String(value || '---'));
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function signatureLine(doc, label = 'Firma del cliente') {
  const right = doc.page.width - doc.page.margins.right;
  const lineWidth = 170;
  const startX = right - lineWidth;
  const y = doc.y + 8;

  doc.strokeColor('#c6ced8')
    .lineWidth(1)
    .moveTo(startX, y)
    .lineTo(right, y)
    .stroke();

  doc.font('Helvetica')
    .fontSize(10)
    .fillColor('#303841')
    .text(label, startX, y + 8, {
      width: lineWidth,
      align: 'center'
    });

  doc.y = y + 28;
}

module.exports = {
  appBaseDir,
  sanitizeFilePart,
  uniquePath,
  outputDir,
  drawHeader,
  drawDocumentTitle,
  sectionTitle,
  infoLine,
  money,
  signatureLine
};
