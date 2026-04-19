const db = require('../db/dbservice');

const estados = db.listarEstadosTicket();
const tickets = db.listarTickets();

if (!estados.some(e => e.codigo === 'PENDIENTE')) {
  throw new Error('No se encontro el estado PENDIENTE');
}

if (!estados.some(e => e.codigo === 'EN_REPARACION')) {
  throw new Error('No se encontro el estado EN_REPARACION');
}

console.log(`DB OK - estados: ${estados.length}, tickets: ${tickets.length}`);
process.exit(0);
