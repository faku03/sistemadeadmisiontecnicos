const path = require('path');

function selectedModule() {
  const args = process.argv.map(arg => String(arg).toLowerCase());
  const exeName = path.basename(process.execPath || '').toLowerCase();

  if (args.includes('--modulo=caja') || exeName.includes('caja')) {
    return 'caja';
  }

  return 'tickets';
}

if (selectedModule() === 'caja') {
  require('./main-caja');
} else {
  require('./main');
}
