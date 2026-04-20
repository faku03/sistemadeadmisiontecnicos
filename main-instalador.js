const path = require('path');

if (process.argv.map(arg => String(arg).toLowerCase()).includes('--gateway')) {
  require('./server/index');
  return;
}

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
