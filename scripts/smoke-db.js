const db = require('../db/dbservice');

const estados = db.listarEstadosTicket();
const tickets = db.listarTickets();
const cajaPendiente = db.listarCajaPendiente();
const cajaCobrada = db.listarCajaCobrada(5);
const informe = db.obtenerInformeCaja();

if (!estados.some(e => e.codigo === 'PENDIENTE')) {
  throw new Error('No se encontro el estado PENDIENTE');
}

if (!estados.some(e => e.codigo === 'EN_REPARACION')) {
  throw new Error('No se encontro el estado EN_REPARACION');
}

console.log(
  `DB OK - estados: ${estados.length}, tickets: ${tickets.length}, ` +
  `caja pendiente: ${cajaPendiente.length}, caja cobrada: ${cajaCobrada.length}, ` +
  `neto: ${informe.neto}`
);
process.exit(0);
