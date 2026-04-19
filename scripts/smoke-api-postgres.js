const { ApiClient } = require('../api/client');

const api = new ApiClient(process.env.SISTEMA_TICKETS_API_URL || 'http://localhost:3000');
const runId = Date.now();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function findBy(rows, key, value) {
  return rows.find(row => String(row[key]) === String(value));
}

async function main() {
  const health = await api.health();
  assert(health.ok, 'API no responde health OK');

  const sucursal = await api.crearSucursal({
    codigo: `SMOKE_${runId}`,
    nombre: `Sucursal Smoke ${runId}`,
    direccion: 'Test',
    telefono: '000',
    sucursal_local: false
  });
  assert(sucursal.id, 'No se creo sucursal');

  const tipo = await api.crearTipoEquipo({
    codigo: `SMK${String(runId).slice(-6)}`,
    descripcion: `Tipo Smoke ${runId}`
  });
  assert(tipo.id, 'No se creo tipo');

  const marca = await api.crearMarca({
    nombre: `Marca Smoke ${runId}`
  });
  assert(marca.id, 'No se creo marca');

  const modelo = await api.crearModelo({
    tipo_equipo_id: tipo.id,
    marca_id: marca.id,
    nombre: `Modelo Smoke ${runId}`
  });
  assert(modelo.id, 'No se creo modelo');

  const cliente = await api.crearCliente({
    dni: `DNI${runId}`,
    nombre: 'Cliente',
    apellido: 'Smoke',
    celular: '5491111111111',
    email: 'smoke@test.local'
  });
  assert(cliente.id, 'No se creo cliente');

  const ticket = await api.crearTicket({
    sucursal_id: sucursal.id,
    cliente_id: cliente.id,
    tipo_equipo_id: tipo.id,
    modelo_id: modelo.id,
    descripcion_falla: 'No enciende'
  });
  assert(ticket.uuid, 'No se creo ticket');

  await api.guardarPresupuesto(ticket.uuid, {
    valor_reparacion: 12000,
    sena: 2000
  });

  await api.enviarPresupuesto(ticket.uuid, {
    valor_reparacion: 12000,
    sena: 2000
  });

  let tickets = await api.listarTickets(sucursal.id);
  let row = findBy(tickets, 'uuid', ticket.uuid);
  assert(row?.estado_codigo === 'PRESUPUESTO_ENVIADO', 'No paso a presupuesto enviado');

  await api.actualizarEstado(ticket.uuid, { estado_codigo: 'EN_REPARACION' });
  tickets = await api.listarTickets(sucursal.id);
  row = findBy(tickets, 'uuid', ticket.uuid);
  assert(row?.estado_codigo === 'EN_REPARACION', 'No paso a en reparacion');

  let pendientes = await api.listarCajaPendiente();
  assert(!findBy(pendientes, 'ticket_uuid', ticket.uuid), 'No debe generar caja en reparacion');

  await api.actualizarEstado(ticket.uuid, { estado_codigo: 'LISTO' });
  tickets = await api.listarTickets(sucursal.id);
  row = findBy(tickets, 'uuid', ticket.uuid);
  assert(row?.estado_codigo === 'LISTO', 'No paso a listo');

  await api.entregarTicket(ticket.uuid, {
    trabajo: 'Cambio de modulo',
    garantia: 30
  });

  pendientes = await api.listarCajaPendiente();
  const movimiento = findBy(pendientes, 'ticket_uuid', ticket.uuid);
  assert(movimiento, 'No se genero caja pendiente al entregar');
  assert(Number(movimiento.saldo) === 10000, 'Saldo pendiente incorrecto');

  await api.cobrarCaja(ticket.uuid);
  const cobrados = await api.listarCajaCobrada(50);
  const cobrado = findBy(cobrados, 'ticket_uuid', ticket.uuid);
  assert(cobrado, 'No aparece como cobrado');

  await api.registrarDevolucionCaja({
    ticket_uuid: ticket.uuid,
    importe: 1000,
    motivo: 'Smoke devolucion'
  });

  const informe = await api.obtenerInformeCaja({});
  assert(Number(informe.cobros.total) >= 10000, 'Informe no suma cobros');
  assert(Number(informe.devoluciones.total) >= 1000, 'Informe no suma devoluciones');

  console.log('API POSTGRES CIRCUITO OK');
  console.log(`Ticket: ${ticket.uuid}`);
  console.log(`Sucursal: ${sucursal.codigo}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
