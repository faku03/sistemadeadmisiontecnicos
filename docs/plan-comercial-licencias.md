# Plan comercial de licencias

Este documento define el plan lanzamiento para Argentina y el flujo operativo de alta, activacion y renovacion de licencias del Sistema de Tickets MardelTech.

## Plan lanzamiento Argentina

Precios:

- Alta, instalacion y configuracion inicial: $75.000.
- Licencia mensual por local o sucursal: $30.000.
- Terminal adicional o caja adicional: $10.000.
- Pago anual: $300.000 por local o sucursal.

Condiciones comerciales:

- 7 dias de prueba.
- Alta bonificada si paga anual.
- Sin permanencia mensual.
- Soporte incluido por WhatsApp en horario comercial.
- Instalacion remota incluida en el alta.

## Cobro recomendado

Para la salida inmediata, usar transferencia bancaria manual con comprobante adjunto en la solicitud de licencia.

Cuando el flujo este estable y haya volumen de clientes, usar Mercado Pago de esta forma para reducir trabajo manual:

- Alta inicial: Link de pago por $75.000.
- Renovacion mensual: plan de suscripcion por $30.000 mensuales.
- Terminal adicional: link o suscripcion adicional por $10.000 mensuales.
- Pago anual: link de pago por $300.000, con alta bonificada.

La transferencia bancaria queda como flujo inicial controlado. Mercado Pago queda como siguiente mejora para automatizar altas y renovaciones.

## Flujo de alta

1. El cliente instala el sistema o solicita una demo.
2. El sistema abre con 7 dias de prueba controlados contra la hora del servidor.
3. Desde el sistema toca "Solicitar licencia".
4. El sistema pide:
   - nombre completo o razon social;
   - CUIT/CUIL;
   - direccion;
   - email;
   - celular;
   - detalle del comprobante de pago o numero de operacion.
5. Al aceptar, el sistema muestra una vista previa tipo texto con la solicitud completa.
6. La vista previa incluye identificadores claros:
   - Machine ID;
   - CUIT/CUIL;
   - email;
   - celular.
7. Desde la vista previa, el usuario puede:
   - enviar online para registrar la solicitud en el servidor de licencias;
   - solicitar por WhatsApp;
   - solicitar por email;
   - copiar el texto;
   - guardar y abrir un TXT.
8. Si la PC no tiene cliente de email configurado, el TXT queda guardado para copiar y pegar manualmente en un correo.
9. Se responde al cliente con:
   - link de alta;
   - link de suscripcion mensual.
10. Cuando paga el alta, se ingresa al panel administrador de licencias.
11. Se crea el grupo.
12. Se crea la sucursal o tecnico.
13. Se crea una licencia por 30 dias.
14. Se carga el estado de pago:
   - `TRIAL` si solo esta en demo;
   - `PENDING` si falta cobrar;
   - `ACTIVE` si ya pago la suscripcion;
   - `MANUAL` si se controla por transferencia o cobro externo.
15. Se copia la clave o el mensaje completo desde el panel.
16. El cliente activa la licencia en su sistema.

## Circuito implementado en la app

- La URL real del servidor de licencias queda por defecto en `https://sistematickets.licences.mardeltech.com`.
- La app valida licencias contra `/licenses/validate` y activa contra `/licenses/activate`.
- Si no hay licencia, la primera ejecucion crea un periodo inicial de 7 dias usando la hora del servidor, no la fecha de la PC.
- En periodo inicial o bloqueo aparece una barra superior con `Solicitar licencia` y `Activar licencia`.
- `Solicitar licencia` abre un formulario y luego una vista previa con el texto final.
- La vista previa permite enviar la solicitud online al servidor de licencias.
- El servidor guarda la solicitud con estado `PENDING`; el panel administrador la muestra en la bandeja de solicitudes.
- Al aprobarla, el servidor crea la licencia y la app del cliente la toma automaticamente en la proxima validacion online.
- La solicitud se puede enviar por WhatsApp o email, copiar al portapapeles, o guardar en TXT.
- Si no hay cliente de email configurado, el TXT queda como respaldo para copiar y pegar.
- `Activar licencia` guarda cache local cuando el servidor confirma que la licencia queda activa.

## Flujo de renovacion

Si el cliente esta adherido a suscripcion:

- Al ver el cobro aprobado, se usa el boton `Pago +30` del panel.
- El panel registra el pago, deja la suscripcion activa, actualiza el proximo vencimiento y extiende la licencia.

Si el cliente no esta adherido:

- Se envia link de renovacion.
- Al ver el pago aprobado, se usa `Pago +30` o se modifica manualmente la fecha de vencimiento.

## Circuito operativo recomendado

1. Publicar o enviar el instalador demo.
2. El cliente prueba 7 dias.
3. El cliente solicita licencia desde el sistema.
4. Se cobra alta y se envia link de suscripcion mensual.
5. En el panel admin se crea grupo, sucursal/tecnico y licencia.
6. Se copia el mensaje de licencia y se envia al cliente.
7. El cliente pega la clave en "Activar licencia".
8. Cada mes se controla el pago:
   - si el cobro esta aprobado, `Pago +30`;
   - si el cobro esta pendiente o rechazado, queda visible como vencimiento cercano;
   - si no paga, al vencer la licencia el sistema bloquea acciones de escritura.
9. Si cambia de PC, se usa `Liberar PC` y vuelve a activar con la misma clave.

## Automatizacion futura

Cuando haya volumen de clientes, integrar webhooks de Mercado Pago para:

- registrar pagos aprobados;
- asociar pagos a licencia por referencia externa;
- renovar vencimientos automaticamente;
- registrar pagos rechazados o pendientes;
- avisar al cliente antes del vencimiento.
