const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..', '..');
const outRoot = path.join(root, '.tmp-manual-pages');
const preloadUrl = pathToFileURL(path.join(root, 'docs', 'manual-assets', 'screenshot-preload.js')).href;

const pages = [
  ['login.html', 'login.html'],
  ['index.html', 'index.html'],
  ['configuracion.html', 'configuracion.html'],
  ['abm/clientes.html', 'abm/clientes.html'],
  ['tickets.html', 'tickets.html'],
  ['index-caja.html', 'index-caja.html']
];

function absolutize(html, sourceRel) {
  const dir = path.dirname(path.join(root, sourceRel));

  return html
    .replace(/href="\.\/styles\.css"/g, `href="${pathToFileURL(path.join(root, 'styles.css')).href}"`)
    .replace(/href="\.\.\/styles\.css"/g, `href="${pathToFileURL(path.join(root, 'styles.css')).href}"`)
    .replace(/src="([^":]+\.js)"/g, (_match, rel) => {
      const resolved = path.resolve(dir, rel);
      return `src="${pathToFileURL(resolved).href}"`;
    });
}

fs.mkdirSync(path.join(outRoot, 'abm'), { recursive: true });

for (const [sourceRel, outputRel] of pages) {
  const sourcePath = path.join(root, sourceRel);
  const outputPath = path.join(outRoot, outputRel);
  let html = fs.readFileSync(sourcePath, 'utf8');

  html = absolutize(html, sourceRel);
  html = html.replace('</head>', `  <script src="${preloadUrl}"></script>\n</head>`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, 'utf8');
}
