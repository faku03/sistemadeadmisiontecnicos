const estados = [
  { id: 1, codigo: 'PENDIENTE', descripcion: 'Pendiente' },
  { id: 2, codigo: 'PRESUPUESTO_ENVIADO', descripcion: 'Presupuesto enviado' },
  { id: 3, codigo: 'EN_REPARACION', descripcion: 'En reparacion' },
  { id: 4, codigo: 'LISTO', descripcion: 'Listo para entregar' },
  { id: 5, codigo: 'ENTREGADO', descripcion: 'Entregado' },
  { id: 6, codigo: 'PRESUPUESTO_RECHAZADO', descripcion: 'Presupuesto rechazado' },
  { id: 7, codigo: 'RETIRADO_SIN_REPARAR', descripcion: 'Retirado sin reparar' }
];

const tickets = [
  {
    uuid: 'uuid-001',
    codigo: 'T-000124',
    fecha_ingreso: '2026-07-01T10:20:00',
    updated_at: '2026-07-04T12:15:00',
    nombre: 'Ana',
    apellido: 'Gomez',
    dni: '30111222',
    celular: '2235550101',
    email: 'ana.gomez@email.com',
    tipo: 'Notebook',
    marca: 'Lenovo',
    modelo: 'IdeaPad 3',
    codigo_equipo: 'SN-LNV-8831',
    descripcion_falla: 'No enciende y no carga bateria.',
    estado_id: 2,
    estado_codigo: 'PRESUPUESTO_ENVIADO',
    estado: 'Presupuesto enviado',
    valor_reparacion: 48500,
    sena: 10000,
    reparacion_presupuestada: 'Cambio de jack de carga y limpieza interna.',
    presupuesto_enviado: true
  },
  {
    uuid: 'uuid-002',
    codigo: 'T-000125',
    fecha_ingreso: '2026-07-02T16:30:00',
    updated_at: '2026-07-05T09:00:00',
    nombre: 'Carlos',
    apellido: 'Perez',
    dni: '28999888',
    celular: '2235550202',
    email: 'carlos.perez@email.com',
    tipo: 'Celular',
    marca: 'Samsung',
    modelo: 'A32',
    codigo_equipo: 'IMEI-35209988',
    descripcion_falla: 'Pantalla rota.',
    estado_id: 4,
    estado_codigo: 'LISTO',
    estado: 'Listo para entregar',
    valor_reparacion: 72000,
    sena: 20000,
    reparacion_presupuestada: 'Cambio de modulo completo.',
    presupuesto_enviado: true
  },
  {
    uuid: 'uuid-003',
    codigo: 'T-000126',
    fecha_ingreso: '2026-07-03T11:10:00',
    updated_at: '2026-07-03T11:10:00',
    nombre: 'Lucia',
    apellido: 'Martinez',
    dni: '33777444',
    celular: '2235550303',
    email: 'lucia.martinez@email.com',
    tipo: 'Tablet',
    marca: 'Apple',
    modelo: 'iPad 9',
    codigo_equipo: 'IPAD-1902',
    descripcion_falla: 'No conecta a WiFi.',
    estado_id: 1,
    estado_codigo: 'PENDIENTE',
    estado: 'Pendiente',
    valor_reparacion: 0,
    sena: 0,
    reparacion_presupuestada: ''
  },
  {
    uuid: 'uuid-004',
    codigo: 'T-000127',
    fecha_ingreso: '2026-06-28T09:00:00',
    updated_at: '2026-07-02T10:00:00',
    nombre: 'Mario',
    apellido: 'Lopez',
    dni: '25123123',
    celular: '2235550404',
    email: 'mario.lopez@email.com',
    tipo: 'PC Escritorio',
    marca: 'Genérica',
    modelo: 'Ryzen 5',
    codigo_equipo: 'PC-R5-022',
    descripcion_falla: 'Se apaga al iniciar juegos.',
    estado_id: 6,
    estado_codigo: 'PRESUPUESTO_RECHAZADO',
    estado: 'Presupuesto rechazado',
    valor_reparacion: 96000,
    sena: 0,
    reparacion_presupuestada: 'Cambio de fuente y prueba de placa de video.'
  }
];

const clientes = [
  { id: 1, dni: '30111222', nombre: 'Ana', apellido: 'Gomez', celular: '2235550101', email: 'ana.gomez@email.com', is_deleted: false },
  { id: 2, dni: '28999888', nombre: 'Carlos', apellido: 'Perez', celular: '2235550202', email: 'carlos.perez@email.com', is_deleted: false },
  { id: 3, dni: '33777444', nombre: 'Lucia', apellido: 'Martinez', celular: '2235550303', email: 'lucia.martinez@email.com', is_deleted: false }
];

const config = {
  sucursalId: 'CENTRAL',
  sucursalNombre: 'Casa Central',
  pdfBusinessStreet: 'Av. Colon 1234',
  pdfBusinessLocality: 'Mar del Plata',
  pdfBusinessProvince: 'Buenos Aires',
  pdfBusinessPhone: '223 555-0000',
  pdfBusinessEmail: 'servicio@farodesk.local',
  businessTaxId: '30-12345678-9',
  businessContactName: 'Mesa de ayuda',
  businessMobile: '2235550000',
  dateFormat: 'dd/MM/yyyy',
  currencyCode: 'ARS',
  currencyFormat: 'es-AR',
  pdfBusinessName: 'FaroDesk Servicio Tecnico',
  pdfLogoPath: 'C:\\mardeltech\\sistemadetickets\\images\\logopdf.png',
  outputPath: 'pdfs',
  alertPendingDays: 2,
  alertRepairDays: 5,
  alertBudgetDays: 3,
  alertReadyDays: 7,
  apiUrl: 'http://SERVIDOR:3000',
  licenseMode: 'server',
  licenseServerUrl: 'https://sistematickets.licences.mardeltech.com',
  licenseSupportWhatsApp: '5492235550000',
  licenseSupportEmail: 'soporte@farodesk.local',
  licenseKey: 'FDK-XXXX-XXXX-XXXX',
  licenseGroupId: 'LOCAL-CENTRO',
  licenseUnitId: 'CENTRAL',
  licenseUnitType: 'SUCURSAL'
};

const usuarios = [
  { id: 1, username: 'admin', display_name: 'Administrador', role: 'ADMIN', is_active: true, last_login_at: '2026-07-06T09:20:00' },
  { id: 2, username: 'operador', display_name: 'Operador taller', role: 'OPERADOR', is_active: true, last_login_at: '2026-07-05T17:45:00' },
  { id: 3, username: 'caja', display_name: 'Usuario caja', role: 'OPERADOR', is_active: true, last_login_at: '2026-07-06T11:05:00' }
];

const pendientesCaja = [
  {
    ticket_uuid: 'uuid-002',
    ticket_codigo: 'T-000125',
    nombre: 'Carlos',
    apellido: 'Perez',
    celular: '2235550202',
    tipo: 'Celular',
    marca: 'Samsung',
    modelo: 'A32',
    importe_total: 72000,
    sena: 20000,
    saldo: 52000
  },
  {
    ticket_uuid: 'uuid-005',
    ticket_codigo: 'T-000128',
    nombre: 'Paula',
    apellido: 'Diaz',
    celular: '2235550505',
    tipo: 'Notebook',
    marca: 'HP',
    modelo: 'Pavilion',
    importe_total: 38000,
    sena: 8000,
    saldo: 30000
  }
];

const cobradosCaja = [
  {
    ticket_uuid: 'uuid-006',
    ticket_codigo: 'T-000121',
    fecha_cobro: '2026-07-06T10:30:00',
    nombre: 'Sofia',
    apellido: 'Ramos',
    celular: '2235550606',
    tipo: 'Notebook',
    marca: 'Dell',
    modelo: 'Inspiron',
    saldo: 64000,
    devoluciones: 0
  },
  {
    ticket_uuid: 'uuid-007',
    ticket_codigo: 'T-000120',
    fecha_cobro: '2026-07-05T18:15:00',
    nombre: 'Hector',
    apellido: 'Silva',
    celular: '2235550707',
    tipo: 'Tablet',
    marca: 'Samsung',
    modelo: 'Tab A',
    saldo: 26000,
    devoluciones: 3000
  }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

window.appDialog = {
  alert: async () => true,
  confirm: async () => true
};

window.licenseUI = {
  init: () => {}
};

window.eventos = {
  onRefrescarCombos: () => {},
  onConfiguracionActualizada: () => {}
};

window.api = {
  asegurarGateway: async () => ({ ok: true, started: false, apiUrl: config.apiUrl }),
  obtenerContextoAdmin: async () => ({
    username: 'admin',
    licenseKey: config.licenseKey,
    licenseUnitId: config.licenseUnitId,
    sucursalId: config.sucursalId,
    businessTaxId: config.businessTaxId
  }),
  bootstrapAdmin: async () => ({ ok: true }),
  restablecerClaveAdmin: async () => ({ username: 'admin', password: 'admin123' }),
  login: async () => ({ username: 'admin', role: 'ADMIN' }),
  obtenerUsuarioActual: async () => ({ username: 'admin', role: 'ADMIN' }),
  obtenerConfiguracion: async () => clone(config),
  guardarConfiguracion: async data => data,
  seleccionarLogoPdf: async () => config.pdfLogoPath,
  probarPdfConfiguracion: async () => 'C:\\mardeltech\\sistemadetickets\\pdfs\\configuracion-preview.pdf',
  listarUsuarios: async () => clone(usuarios),
  listarAuditoriaUsuarios: async () => [
    { created_at: '2026-07-06T10:00:00', username: 'admin', action: 'LOGIN', result: 'OK' },
    { created_at: '2026-07-06T10:10:00', username: 'admin', action: 'CREATE_TICKET', result: 'OK' }
  ],
  verificarClaveAdmin: async () => true,
  crearUsuario: async () => true,
  actualizarUsuario: async () => true,
  actualizarEstadoUsuario: async () => true,
  restablecerClaveUsuario: async () => true,
  obtenerSucursalLocal: async () => ({ id: 'CENTRAL', nombre: 'Casa Central' }),
  buscarClientePorDni: async dni => clone(clientes.find(item => item.dni === String(dni)) || null),
  crearCliente: async () => 99,
  listarTipos: async () => [
    { id: 1, codigo: 'NOTE', descripcion: 'Notebook', is_deleted: false },
    { id: 2, codigo: 'CEL', descripcion: 'Celular', is_deleted: false },
    { id: 3, codigo: 'TAB', descripcion: 'Tablet', is_deleted: false }
  ],
  listarMarcas: async () => [
    { id: 1, nombre: 'Lenovo', is_deleted: false },
    { id: 2, nombre: 'Samsung', is_deleted: false },
    { id: 3, nombre: 'Apple', is_deleted: false }
  ],
  listarModelosPorMarca: async () => [
    { id: 1, modelo: 'IdeaPad 3', is_deleted: false },
    { id: 2, modelo: 'A32', is_deleted: false },
    { id: 3, modelo: 'iPad 9', is_deleted: false }
  ],
  listarEstadosTicket: async () => clone(estados),
  listarTickets: async () => clone(tickets),
  actualizarEstadoTicket: async () => true,
  actualizarPresupuesto: async () => true,
  enviarPresupuesto: async () => 'C:\\mardeltech\\sistemadetickets\\pdfs\\presupuesto-T-000124.pdf',
  enviarWhatsAppPresupuesto: async () => true,
  generarPDFIngreso: async () => 'C:\\mardeltech\\sistemadetickets\\pdfs\\ingreso-T-000124.pdf',
  entregarTicket: async () => 'C:\\mardeltech\\sistemadetickets\\pdfs\\entrega-T-000125.pdf',
  obtenerHistorialTicket: async () => [
    { fecha: '2026-07-01T10:20:00', estado_destino: 'Pendiente' },
    { fecha: '2026-07-04T12:15:00', estado_destino: 'Presupuesto enviado' }
  ],
  abrirTiposEquipo: async () => true,
  abrirMarcas: async () => true,
  abrirModelos: async () => true,
  abrirClientes: async () => true,
  abrirSucursales: async () => true,
  abrirTickets: async () => true,
  abrirAlertasTickets: async () => true,
  abrirConfiguracion: async () => true,
  abrirHistorialTicket: async () => true,
  cerrarSesion: async () => true
};

window.apiClientes = {
  listar: async includeDeleted => clone(includeDeleted ? clientes : clientes.filter(item => !item.is_deleted)),
  crear: async () => true,
  actualizar: async () => true,
  eliminar: async () => true,
  reactivar: async () => true
};

window.apiCaja = {
  asegurarGateway: async () => ({ ok: true, started: false, apiUrl: config.apiUrl }),
  obtenerConfiguracion: async () => clone(config),
  listarPendientes: async () => clone(pendientesCaja),
  listarCobrados: async () => clone(cobradosCaja),
  informe: async () => ({ cobros: { total: 116000 }, devoluciones: { total: 3000 }, neto: 113000 }),
  rutaDB: async () => 'http://SERVIDOR:3000',
  cobrar: async () => true,
  comprobanteX: async () => ({ numero: 42, pdf_path: 'C:\\mardeltech\\sistemadetickets\\pdfs\\comprobante-X-00000042.pdf' }),
  abrirPDF: async () => true,
  whatsapp: async () => true,
  abrirDevoluciones: async () => true,
  abrirListado: async () => true
};
