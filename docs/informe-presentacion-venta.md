# Informe para presentacion y venta de FaroDesk

## Resumen del producto

FaroDesk es un sistema de escritorio para locales de servicio tecnico, reparacion de equipos y negocios que necesitan ordenar ingresos, presupuestos, entregas y caja. Esta pensado para funcionar en una PC servidor, en red local o con terminales conectadas a un gateway/API, permitiendo que el negocio opere con datos centralizados y modulos separados para atencion tecnica, caja y administracion.

El sistema combina gestion de tickets, clientes, equipos, presupuestos, comprobantes, caja diaria, usuarios, alertas, reportes PDF y control comercial por licencias. Su objetivo es reemplazar planillas, talonarios manuales y mensajes desordenados por un flujo unico: recibir equipo, registrar cliente, presupuestar, reparar, entregar, cobrar y consultar el historial.

## Nombre comercial

FaroDesk

## Tipo de cliente ideal

- Servicios tecnicos de celulares, computadoras, notebooks, consolas, electrodomesticos o electronica.
- Locales con una o varias sucursales.
- Talleres con tecnicos que reciben, derivan y entregan equipos.
- Negocios que necesitan separar recepcion tecnica de caja.
- Emprendimientos que quieren profesionalizar la atencion al cliente con comprobantes y seguimiento.

## Problema que resuelve

Muchos servicios tecnicos trabajan con cuadernos, Excel, WhatsApp y comprobantes manuales. Eso provoca perdida de informacion, dudas sobre el estado de cada equipo, presupuestos mal registrados, cobros sin control, equipos olvidados, dificultad para saber que hizo cada tecnico y poca imagen profesional frente al cliente.

FaroDesk centraliza toda la operacion del servicio tecnico: cada equipo entra con un ticket, queda asociado a un cliente, modelo, falla, estado, presupuesto, historial, entrega, garantia y movimiento de caja.

## Propuesta de valor

FaroDesk permite administrar un servicio tecnico completo desde una aplicacion simple y profesional. El negocio puede saber en todo momento que equipos ingresaron, en que estado estan, cuanto se presupuesto, que falta cobrar, que tickets estan demorados y que comprobantes fueron emitidos.

La venta principal es orden, control y profesionalismo para locales de reparacion.

## Modulos principales

### 1. Sistema de Tickets / Servicio Tecnico

Modulo principal para registrar y operar equipos ingresados.

Funciones:

- Alta de tickets de reparacion.
- Busqueda o creacion de clientes por DNI.
- Registro de nombre, apellido, celular y email del cliente.
- Seleccion de tipo de equipo, marca y modelo.
- Descripcion de la falla informada por el cliente.
- Generacion de codigo de ticket unico por tecnico/sucursal.
- Listado de tickets con fecha, cliente, celular, equipo y estado.
- Busqueda por cliente, equipo o codigo de ticket.
- Filtro por estado.
- Vista de todos los tickets.
- Acciones sobre ticket seleccionado.
- Generacion de PDF de ingreso.
- Registro de presupuesto.
- Envio de presupuesto.
- Aceptacion o rechazo de presupuesto.
- Marca de equipo retirado sin reparar.
- Entrega de equipo con trabajo realizado y dias de garantia.
- Creacion automatica de movimiento de caja al entregar.

Estados incluidos:

- Pendiente.
- Presupuesto enviado.
- Presupuesto rechazado.
- En reparacion.
- Listo para entregar.
- Entregado.
- Devuelto sin reparar.
- Retirado sin reparar.

### 2. Presupuestos

El sistema permite cargar informacion comercial y tecnica del presupuesto.

Funciones:

- Valor total de reparacion.
- Sena recibida.
- Saldo pendiente.
- Reparacion presupuestada.
- Guardar presupuesto sin enviarlo.
- Guardar y enviar presupuesto.
- Cambiar estado a presupuesto enviado.
- Aceptar o rechazar presupuesto.
- Registrar el movimiento en el historial del ticket.

### 3. Entrega y garantia

Cuando el equipo se entrega, el sistema registra:

- Trabajo realizado.
- Dias de garantia.
- Fecha de entrega.
- Cambio de estado a entregado.
- Generacion del movimiento pendiente de cobro.
- Datos disponibles para comprobantes y PDFs.

### 4. Caja

Modulo separado para el area de caja. Permite cobrar reparaciones entregadas y controlar movimientos del dia.

Funciones:

- Vista de caja del dia.
- Total cobrado.
- Total de devoluciones.
- Neto del dia.
- Listado de pendientes de cobro.
- Busqueda por cliente, equipo o ticket.
- Cobro de ticket pendiente.
- Listado de ultimos cobrados.
- Emision de comprobante X en PDF.
- Envio de comprobante por WhatsApp.
- Registro de devoluciones.
- Listado filtrable de caja.
- Reporte de caja.

Datos visibles en caja:

- Cliente.
- Celular.
- Equipo.
- Ticket.
- Total.
- Sena.
- Saldo.
- Cobrado.
- Devuelto.

### 5. Devoluciones

El sistema permite registrar devoluciones asociadas a movimientos de caja ya cobrados.

Funciones:

- Seleccionar un movimiento cobrado.
- Cargar importe de devolucion.
- Cargar motivo.
- Evitar devoluciones superiores al saldo cobrado.
- Reflejar devoluciones en totales y reportes.

### 6. Historial del ticket

Cada ticket puede conservar una trazabilidad de eventos.

Eventos registrados:

- Creacion del ticket.
- Cambios de estado.
- Presupuesto guardado.
- Presupuesto enviado.
- Entrega.
- Derivaciones entre sucursales.
- Otros movimientos relevantes.

Esto permite reconstruir que paso con cada equipo y reducir discusiones internas o con clientes.

### 7. Alertas de tickets

Modulo para detectar tickets demorados o que requieren atencion.

Funciones:

- Vista de alertas de tickets.
- Resumen de alertas.
- Filtro por estado.
- Detalle del ticket seleccionado.
- Acciones directas desde la alerta.
- Configuracion de dias para cada estado.

Alertas configurables:

- Tickets pendientes despues de cierta cantidad de dias.
- Tickets en reparacion demorados.
- Presupuestos enviados sin respuesta.
- Equipos listos para entregar que siguen en el local.

### 8. Datos maestros

El sistema permite cargar y mantener la informacion base del negocio.

Administracion de:

- Sucursales.
- Clientes.
- Tipos de equipo.
- Marcas.
- Modelos.

Cada modulo permite crear, editar, eliminar logicamente y reactivar registros. Esto evita perder informacion historica.

### 9. Sucursales y derivaciones

FaroDesk soporta uso por sucursal o tecnico.

Funciones:

- Codigo estable de sucursal o tecnico.
- Sucursal local configurada.
- Ticket con sucursal de origen y sucursal actual.
- Derivacion de tickets entre sucursales.
- Historial de derivaciones.
- Ideal para negocios con deposito, recepcion, taller o varias bocas de atencion.

### 10. Configuracion del negocio

Pantalla de configuracion integrada.

Permite editar:

- Codigo de sucursal.
- Nombre visible del negocio.
- Direccion.
- Localidad.
- Provincia.
- Telefono.
- Email.
- CUIT/CUIL.
- Contacto responsable.
- Celular de contacto.
- Formato de fecha.
- Moneda.
- Formato de moneda.
- Datos para encabezado de PDFs.
- Logo para PDFs.
- Carpeta de salida de PDFs.
- Dias de alertas.
- URL del gateway/API.
- Servidor de licencias.
- WhatsApp y email de soporte.
- Clave de licencia.
- Codigo de grupo y unidad.

### 11. PDFs y comprobantes

El sistema genera documentacion profesional.

Tipos de PDF:

- Comprobante de ingreso.
- Presupuesto.
- Entrega.
- Comprobante X.
- Reporte de caja.
- Vista de prueba de configuracion PDF.

Los PDFs pueden incluir datos del negocio, logo, cliente, equipo, falla, trabajo realizado, importes, sena, saldo y garantia.

### 12. Usuarios, roles y auditoria

FaroDesk incluye autenticacion y administracion de usuarios.

Funciones:

- Login.
- Usuario administrador.
- Usuarios operadores.
- Alta de usuarios.
- Edicion de nombre visible y rol.
- Activacion y desactivacion de usuarios.
- Gestion de claves.
- Restablecimiento manual de clave.
- Generacion de clave temporal.
- Verificacion de clave de administrador antes de operar contrasenas.
- Auditoria de acciones de usuarios.
- Ultimo acceso registrado.

### 13. Servidor / Gateway

El sistema usa un gateway/API para centralizar datos y proteger la base.

Caracteristicas:

- API local o remota.
- Clientes de Tickets y Caja conectados al gateway.
- Base PostgreSQL detras del gateway.
- Configurable para misma PC, red local o servidor remoto.
- Health check del servidor.
- Inicio automatico con Windows mediante tarea programada.
- Logs del gateway.
- Separacion entre aplicacion cliente y base de datos.

### 14. Instaladores

El proyecto contempla instaladores para distintos escenarios.

Opciones:

- Instalador servidor con gateway/API.
- Sistema de Tickets / Servicio Tecnico.
- Sistema de Caja.
- Ambos modulos en la misma PC.
- Accesos directos separados para Tickets y Caja.
- Instalacion recomendada en carpeta fija del negocio.

Esto permite vender el sistema como solucion instalable, no solo como software tecnico.

### 15. Licencias comerciales

FaroDesk incluye sistema de licenciamiento para vender el producto por cliente, sucursal o tecnico.

Funciones:

- Prueba inicial de 7 dias.
- Validacion contra servidor de licencias.
- Activacion por clave.
- Cache local de licencia activa.
- Bloqueo de acciones de escritura si vence la licencia.
- Solicitud de licencia desde la app.
- Formulario de solicitud con datos comerciales.
- Envio online de solicitud al servidor de licencias, con WhatsApp, email, copia o TXT como respaldo.
- Identificacion de PC por Machine ID.
- Liberacion de PC desde panel admin.

### 16. Panel administrador de licencias

Panel web para administrar clientes y licencias.

Funciones:

- Vista de licencias.
- Grupos y sucursales/tecnicos.
- Vencimientos.
- Validaciones.
- Alta de cliente, unidad y licencia desde una sola ventana.
- Renovacion manual.
- Boton Pago +30.
- Copiar clave.
- Generar mensaje para cliente.
- Suspender o reactivar licencia.
- Liberar PC asociada.
- Ver licencias vencidas o por vencer.
- Auditoria de validaciones online.
- Registro de pagos.

Datos de licencia:

- Grupo.
- Sucursal o tecnico.
- Plan.
- Estado.
- Estado de pago.
- Periodo de facturacion.
- Fecha de vencimiento.
- Machine ID.
- Ultima validacion.
- Historial de pagos.

## Modelo comercial sugerido

El plan comercial documentado para Argentina propone:

- Alta, instalacion y configuracion inicial.
- Licencia mensual por local o sucursal.
- Terminal adicional o caja adicional.
- Pago anual con alta bonificada.
- 7 dias de prueba.
- Soporte por WhatsApp en horario comercial.
- Instalacion remota incluida.

El sistema puede venderse como una herramienta mensual para ordenar y profesionalizar servicios tecnicos.

## Beneficios para comunicar en la web

- Ordena todos los ingresos de equipos en un solo lugar.
- Evita perder informacion de clientes y reparaciones.
- Permite saber el estado de cada equipo al instante.
- Mejora la imagen del negocio con PDFs y comprobantes.
- Separa el trabajo tecnico del cobro en caja.
- Controla senas, saldos, cobros y devoluciones.
- Detecta tickets demorados con alertas.
- Permite trabajar con varias sucursales o tecnicos.
- Incluye usuarios, roles y auditoria.
- Funciona en red local con servidor propio.
- Tiene sistema de licencias para prueba, activacion y renovacion.
- Esta pensado para negocios reales de reparacion, no para administracion generica.

## Diferenciadores

- Flujo especifico para servicio tecnico.
- Modulo de caja separado.
- Tickets con codigo unico por tecnico/sucursal.
- Presupuestos, entregas, garantias y comprobantes en PDF.
- Alertas por demora de estado.
- Derivaciones entre sucursales.
- Panel propio de licencias.
- Instalador de servidor con gateway.
- Puede operar en red local sin depender de una web abierta todo el tiempo.

## Tono visual recomendado para la web

La web deberia verse moderna, confiable y operativa. No deberia parecer una landing generica de tecnologia abstracta. Conviene mostrar situaciones reales de un servicio tecnico:

- Mostrador con cliente dejando un celular o notebook.
- Tecnico revisando equipos.
- Pantalla con lista de tickets ordenada.
- Caja cobrando una reparacion.
- Comprobante PDF saliendo en pantalla.
- Varias sucursales conectadas.
- Panel con alertas y estados.

Estilo sugerido:

- Profesional y claro.
- Colores asociados a tecnologia, confianza y orden.
- Interfaces limpias, con tablas, estados y tarjetas de resumen.
- Fotografia realista de locales de reparacion.
- Screenshots/mockups de la aplicacion sobre monitores.
- Videos cortos mostrando flujo completo.

## Secciones sugeridas para la web

1. Hero principal
   - Mensaje: "El sistema para ordenar tu servicio tecnico de punta a punta".
   - Submensaje: "Tickets, presupuestos, caja, comprobantes, alertas y licencias en una sola herramienta".
   - Visual: mostrador de servicio tecnico con monitor mostrando FaroDesk.

2. Problema
   - Planillas, cuadernos, WhatsApp y tickets perdidos.
   - Visual: escritorio desordenado transformandose en dashboard ordenado.

3. Flujo completo
   - Ingreso del equipo.
   - Presupuesto.
   - Reparacion.
   - Entrega.
   - Cobro.
   - Comprobante.

4. Modulo Tickets
   - Visual de listado de tickets, estados y acciones.

5. Modulo Caja
   - Visual de cobros, devoluciones y neto del dia.

6. Alertas e historial
   - Visual de tickets demorados y trazabilidad.

7. Multi-sucursal y tecnicos
   - Visual de red local o varias sucursales conectadas.

8. Licenciamiento y soporte
   - Visual de activacion, prueba de 7 dias y soporte por WhatsApp.

9. Llamado a la accion
   - "Proba FaroDesk 7 dias".
   - "Solicita instalacion remota".

## Prompts para generar imagenes

### Imagen hero principal

Crear una imagen realista y profesional para la portada de una web de software llamado FaroDesk. Escena: mostrador de un local de servicio tecnico moderno en Argentina, un cliente entrega un celular y una notebook, un empleado registra el ingreso en una computadora de escritorio. En el monitor se ve una interfaz de gestion con tabla de tickets, estados de reparacion, cliente, equipo y botones de presupuesto/caja. Ambiente ordenado, confiable, iluminacion natural, estetica tecnologica, colores modernos, sin texto legible inventado, formato horizontal 16:9, alta calidad, estilo fotografia comercial.

### Imagen problema/solucion

Crear una imagen conceptual realista dividida visualmente en dos momentos: a la izquierda, un servicio tecnico desordenado con papeles, cuaderno, etiquetas y mensajes de WhatsApp dispersos; a la derecha, el mismo negocio ordenado con una pantalla mostrando un sistema de tickets, caja y alertas. Sensacion de transformacion de caos a control. Estilo profesional, sin caricatura, colores limpios, formato horizontal 16:9.

### Imagen flujo de reparacion

Crear una imagen tipo composicion comercial que muestre el flujo completo de un servicio tecnico: ingreso de equipo, diagnostico, presupuesto, reparacion, entrega y cobro. Debe verse como escenas reales conectadas sutilmente, con una computadora mostrando una app de tickets y caja. Estilo moderno, realista, para web SaaS/desktop software, formato 16:9.

### Imagen modulo caja

Crear una imagen realista de un sector de caja en un local de reparacion. Una persona cobra una reparacion, en el monitor se ve una pantalla con pendientes de cobro, total, sena, saldo, cobrados, devoluciones y neto del dia. Debe transmitir control financiero simple y profesional. Sin texto legible falso, formato horizontal 16:9.

### Imagen alertas

Crear una imagen para representar alertas de tickets demorados en un servicio tecnico. Un monitor muestra una lista ordenada con estados por color, prioridades y detalles de equipos pendientes. En el fondo se ven estantes con celulares, notebooks y equipos etiquetados. Estilo realista, profesional, moderno, formato horizontal 16:9.

### Imagen multi-sucursal

Crear una imagen comercial que represente varias sucursales de servicio tecnico conectadas por un sistema central. Mostrar tres locales pequeños o estaciones de trabajo conectadas visualmente a un servidor/gateway central, con pantallas de tickets sincronizados. Estilo realista con toque tecnologico sutil, sin graficos exagerados, formato 16:9.

### Imagen licencias y soporte

Crear una imagen profesional que represente activacion de software y soporte remoto. Una pantalla muestra una ventana de activacion de licencia y al lado un celular con chat de soporte. Debe transmitir prueba de 7 dias, instalacion remota y confianza comercial, sin texto legible inventado, estilo realista, formato 16:9.

## Prompts para generar videos cortos

### Video hero de 8 a 12 segundos

Crear un video publicitario corto para FaroDesk, software de gestion para servicios tecnicos. Mostrar un local de reparacion moderno: un cliente deja un equipo, el empleado carga el ticket en una computadora, aparece una vista de tickets ordenados, luego una escena rapida de caja cobrando y emitiendo comprobante. Movimiento de camara suave, estetica profesional, ritmo claro, sin texto en pantalla, formato horizontal 16:9.

### Video flujo completo

Crear un video de demostracion visual de 15 segundos para una web. Secuencia: ingreso de equipo en mostrador, ticket creado en pantalla, tecnico revisando notebook, presupuesto enviado, equipo listo para entregar, caja cobrando saldo, comprobante generado. Estilo realista, comercial, moderno, con transiciones limpias y sensacion de orden operativo. Sin logos inventados ni textos ilegibles.

### Video antes y despues

Crear un video de 10 segundos con transformacion de un servicio tecnico desordenado a uno profesional. Inicio: papeles, cuaderno y equipos sin identificar. Transicion: la pantalla de FaroDesk organiza tickets, estados, alertas y caja. Final: local ordenado, cliente atendido y empleado con informacion clara. Estilo realista, no caricaturesco, formato 16:9.

### Video caja

Crear un video corto para mostrar el modulo de caja de FaroDesk. Escena: un cliente retira un equipo reparado, el cajero selecciona el ticket pendiente, cobra el saldo, se actualiza el neto del dia y aparece un comprobante PDF en pantalla. Estilo profesional, realista, ideal para landing page de software de gestion.

## Copy sugerido para la web

### Titular principal

FaroDesk: el sistema para ordenar tu servicio tecnico de punta a punta.

### Subtitulo

Gestiona tickets, clientes, presupuestos, entregas, caja, comprobantes y alertas desde una aplicacion simple, profesional y preparada para trabajar en red.

### Beneficio corto

Menos planillas. Menos papeles. Mas control sobre cada reparacion.

### Llamado a la accion

Proba FaroDesk 7 dias y organiza tu taller desde el primer ingreso.

### Frases destacadas

- Cada equipo con su ticket, estado e historial.
- Presupuesta, entrega y cobra sin perder informacion.
- Caja separada para controlar senas, saldos y devoluciones.
- Alertas para que ningun equipo quede olvidado.
- Instalacion remota y soporte para empezar rapido.

## Ideas de imagenes de interfaz para mockups

Para que los mockups de la web se vean fieles al producto, las pantallas deberian mostrar:

- Tabla de tickets con columnas: fecha, ticket, cliente, celular, equipo y estado.
- Botones de acciones: PDF ingreso, presupuesto, enviar presupuesto, aceptar, rechazar, entregar.
- Formulario de cliente con DNI, nombre, apellido, celular y email.
- Formulario de equipo con tipo, marca, modelo y descripcion de falla.
- Caja del dia con cobrado, devoluciones y neto.
- Tabla de pendientes de cobro con total, sena y saldo.
- Panel de alertas con tickets demorados.
- Panel de licencias con grupos, sucursales, vencimientos y activaciones.

## Mensaje comercial final

FaroDesk es una solucion practica para servicios tecnicos que necesitan dejar atras el desorden operativo. Permite registrar cada equipo, seguir su reparacion, presupuestar, entregar, cobrar y emitir comprobantes, todo con trazabilidad y control. Es ideal para negocios que quieren atender mejor, perder menos informacion y proyectar una imagen mas profesional frente a sus clientes.
