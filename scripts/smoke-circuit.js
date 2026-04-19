const fs = require('fs');
const os = require('os');
const path = require('path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sistema-tickets-circuit-'));
const dbPath = path.join(tempDir, 'tickets-test.db');

process.env.SISTEMA_TICKETS_DB_PATH = dbPath;
process.env.SISTEMA_TICKETS_OUTPUT_PATH = path.join(tempDir, 'pdfs');

const db = require('../db/dbservice');
const pdfIngreso = require('../pdf/ingreso');
const pdfEntrega = require('../pdf/entrega');
const pdfPresupuesto = require('../pdf/presupuesto');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function findBy(rows, key, value) {
  return rows.find(row => String(row[key]) === String(value));
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForFile(filePath, message) {
  for (let i = 0; i < 20; i += 1) {
    if (fs.existsSync(filePath)) {
      return;
    }

    await wait(100);
  }

  throw new Error(message);
}

async function main() {
  db.crearSucursal({
    codigo: 'TEST',
    nombre: 'Sucursal Test',
    direccion: 'Local',
    telefono: '000',
    sucursal_local: true
  });

  const sucursal = db.obtenerSucursalLocal();
  assert(sucursal?.id, 'No se creo sucursal local');

  db.crearTipoEquipo({
    codigo: 'CEL',
    descripcion: 'Celular'
  });

  const tipo = findBy(db.listarTipos(), 'codigo', 'CEL');
  assert(tipo?.id, 'No se creo tipo de equipo');

  db.crearMarca({ nombre: 'Marca Test' });
  const marca = findBy(db.listarMarcas(), 'nombre', 'Marca Test');
  assert(marca?.id, 'No se creo marca');

  db.crearModelo({
    tipo_equipo_id: tipo.id,
    marca_id: marca.id,
    nombre: 'Modelo Test'
  });

  const modelo = findBy(db.listarModelosPorMarca(marca.id), 'nombre', 'Modelo Test');
  assert(modelo?.id, 'No se creo modelo');

  const clienteId = db.crearCliente({
    dni: '99999999',
    nombre: 'Cliente',
    apellido: 'Prueba',
    celular: '5491111111111',
    email: 'cliente@test.local'
  });
  assert(clienteId, 'No se creo cliente');

  const ticket = db.crearTicket({
    sucursal_id: sucursal.id,
    cliente_id: clienteId,
    tipo_equipo_id: tipo.id,
    modelo_id: modelo.id,
    descripcion_falla: 'No enciende'
  });
  assert(ticket?.uuid, 'No se creo ticket');

  const ingreso = db.obtenerTicketParaPDF(ticket.uuid);
  const ingresoPdf = pdfIngreso(ingreso);
  await waitForFile(ingresoPdf, 'No se genero PDF de ingreso');

  db.actualizarPresupuesto(ticket.uuid, 12000, 2000);
  let listado = db.listarTickets();
  let row = findBy(listado, 'uuid', ticket.uuid);
  assert(Number(row.valor_reparacion) === 12000, 'No se guardo valor de presupuesto');
  assert(Number(row.sena) === 2000, 'No se guardo sena');

  db.enviarPresupuesto(ticket.uuid, 12000, 2000);
  const presupuestoPdf = pdfPresupuesto(db.obtenerTicketParaPDF(ticket.uuid));
  await waitForFile(presupuestoPdf, 'No se genero PDF de presupuesto');

  listado = db.listarTickets();
  row = findBy(listado, 'uuid', ticket.uuid);
  assert(row.estado_codigo === 'PRESUPUESTO_ENVIADO', 'No paso a presupuesto enviado');

  const estados = db.listarEstadosTicket();
  const enReparacion = findBy(estados, 'codigo', 'EN_REPARACION');
  const listo = findBy(estados, 'codigo', 'LISTO');
  assert(enReparacion?.id && listo?.id, 'Faltan estados de reparacion/listo');

  db.actualizarEstadoTicket(ticket.uuid, enReparacion.id);
  row = findBy(db.listarTickets(), 'uuid', ticket.uuid);
  assert(row.estado_codigo === 'EN_REPARACION', 'No paso a en reparacion');
  assert(db.listarCajaPendiente().length === 0, 'Caja no debe generarse al pasar a reparacion');

  db.actualizarEstadoTicket(ticket.uuid, listo.id);
  row = findBy(db.listarTickets(), 'uuid', ticket.uuid);
  assert(row.estado_codigo === 'LISTO', 'No paso a listo');

  db.entregarTicket(ticket.uuid, 'Cambio de modulo', 30);
  row = findBy(db.listarTickets(), 'uuid', ticket.uuid);
  assert(row.estado_codigo === 'ENTREGADO', 'No paso a entregado');

  const entregaPdf = pdfEntrega(db.obtenerTicketParaPDF(ticket.uuid));
  await waitForFile(entregaPdf, 'No se genero PDF de entrega');

  const pendientes = db.listarCajaPendiente();
  const movimiento = findBy(pendientes, 'ticket_uuid', ticket.uuid);
  assert(movimiento, 'No se genero movimiento pendiente en caja al entregar');
  assert(Number(movimiento.saldo) === 10000, 'Saldo de caja incorrecto');

  const cobro = db.cobrarCaja(ticket.uuid);
  assert(cobro?.comprobante?.pdf_path, 'El cobro no genero comprobante X');
  await waitForFile(cobro.comprobante.pdf_path, 'No existe el PDF del comprobante X');

  const cobrados = db.listarCajaCobrada(10);
  const cobrado = findBy(cobrados, 'ticket_uuid', ticket.uuid);
  assert(cobrado, 'No aparece en caja cobrada');

  db.registrarDevolucionCaja({
    ticket_uuid: ticket.uuid,
    importe: 1000,
    motivo: 'Prueba de devolucion parcial'
  });

  const informe = db.obtenerInformeCaja();
  assert(Number(informe.cobros.total) === 10000, 'Total cobrado incorrecto');
  assert(Number(informe.devoluciones.total) === 1000, 'Total devuelto incorrecto');
  assert(Number(informe.neto) === 9000, 'Neto de caja incorrecto');

  console.log('CIRCUITO OK');
  console.log(`Ticket: ${ticket.uuid}`);
  console.log(`DB temporal: ${dbPath}`);
  console.log(`PDFs temporales: ${process.env.SISTEMA_TICKETS_OUTPUT_PATH}`);
  process.exit(0);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
