const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const root = path.resolve(__dirname, '..', '..');
const markdownPath = path.join(root, 'docs', 'manual-usuario-farodesk.md');
const outputPath = path.join(root, 'docs', 'manual-usuario-farodesk.pdf');

const page = {
  margin: 54,
  width: 595.28,
  height: 841.89
};

const styles = {
  h1: { size: 24, color: '#0b3a75', gapBefore: 0, gapAfter: 14 },
  h2: { size: 18, color: '#0b3a75', gapBefore: 18, gapAfter: 8 },
  h3: { size: 14, color: '#123f73', gapBefore: 14, gapAfter: 6 },
  body: { size: 10.5, color: '#1d2b3a', lineGap: 3 },
  muted: { size: 9, color: '#5a6d82' }
};

function ensureSpace(doc, height) {
  if (doc.y + height > page.height - page.margin) {
    doc.addPage();
  }
}

function writeParagraph(doc, text, options = {}) {
  const normalized = text.trim();
  if (!normalized) return;

  const size = options.size || styles.body.size;
  const width = page.width - (page.margin * 2) - (options.indent || 0);
  const height = doc.heightOfString(normalized, {
    width,
    lineGap: styles.body.lineGap
  });

  ensureSpace(doc, height + 8);
  doc
    .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(size)
    .fillColor(options.color || styles.body.color)
    .text(normalized, page.margin + (options.indent || 0), doc.y, {
      width,
      lineGap: styles.body.lineGap,
      continued: false
    });
  doc.moveDown(options.moveDown || 0.55);
}

function writeHeading(doc, text, level) {
  const style = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
  ensureSpace(doc, style.size + style.gapBefore + style.gapAfter + 12);
  if (style.gapBefore) doc.moveDown(style.gapBefore / 12);
  doc
    .font('Helvetica-Bold')
    .fontSize(style.size)
    .fillColor(style.color)
    .text(text.trim(), page.margin, doc.y, {
      width: page.width - (page.margin * 2)
    });
  doc.moveDown(style.gapAfter / 12);
}

function writeImage(doc, imageRelPath, altText) {
  const imagePath = path.join(path.dirname(markdownPath), imageRelPath);
  if (!fs.existsSync(imagePath)) {
    writeParagraph(doc, `[Imagen no encontrada: ${imageRelPath}]`, {
      color: '#8a1f1f',
      bold: true
    });
    return;
  }

  const maxWidth = page.width - (page.margin * 2);
  const maxHeight = 265;
  ensureSpace(doc, maxHeight + 42);

  doc
    .font('Helvetica-Bold')
    .fontSize(styles.muted.size)
    .fillColor(styles.muted.color)
    .text(altText, page.margin, doc.y, { width: maxWidth });
  doc.moveDown(0.35);

  doc.image(imagePath, page.margin, doc.y, {
    fit: [maxWidth, maxHeight],
    align: 'center'
  });

  doc.y += maxHeight + 12;
}

function renderMarkdown(doc, markdown) {
  const lines = markdown.split(/\r?\n/);
  let paragraph = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    writeParagraph(doc, paragraph.join(' '));
    paragraph = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    const imageMatch = line.match(/^!\[(.*)]\((.*)\)$/);
    if (imageMatch) {
      flushParagraph();
      writeImage(doc, imageMatch[2], imageMatch[1]);
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      writeHeading(doc, headingMatch[2], headingMatch[1].length);
      continue;
    }

    const bulletMatch = line.match(/^-\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      writeParagraph(doc, `• ${bulletMatch[1]}`, { indent: 14 });
      continue;
    }

    const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      flushParagraph();
      writeParagraph(doc, `${numberedMatch[1]}. ${numberedMatch[2]}`, { indent: 14 });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
}

function addFooter(doc) {
  const total = doc.bufferedPageRange().count;

  for (let i = 0; i < total; i += 1) {
    doc.switchToPage(i);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#6b7c8f')
      .text(
        `FaroDesk - Manual de usuario | Pagina ${i + 1} de ${total}`,
        page.margin,
        page.height - 36,
        { width: page.width - (page.margin * 2), align: 'center' }
      );
  }
}

const markdown = fs.readFileSync(markdownPath, 'utf8');
const doc = new PDFDocument({
  size: 'A4',
  margins: {
    top: page.margin,
    right: page.margin,
    bottom: page.margin,
    left: page.margin
  },
  bufferPages: true,
  info: {
    Title: 'Manual de usuario - FaroDesk',
    Author: 'FaroDesk'
  }
});

doc.pipe(fs.createWriteStream(outputPath));
renderMarkdown(doc, markdown);
addFooter(doc);
doc.end();

doc.on('end', () => {
  console.log(outputPath);
});
