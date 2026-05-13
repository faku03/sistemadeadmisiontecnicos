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

Para reducir trabajo manual, usar Mercado Pago de esta forma:

- Alta inicial: Link de pago por $75.000.
- Renovacion mensual: plan de suscripcion por $30.000 mensuales.
- Terminal adicional: link o suscripcion adicional por $10.000 mensuales.
- Pago anual: link de pago por $300.000, con alta bonificada.

La transferencia bancaria queda como opcion excepcional, no como flujo principal.

## Flujo de alta

1. El cliente instala el sistema o solicita una demo.
2. Desde el sistema toca "Solicitar licencia".
3. El sistema arma un email con datos comerciales y tecnicos minimos.
4. Se responde al cliente con:
   - link de alta;
   - link de suscripcion mensual.
5. Cuando paga el alta, se ingresa al panel administrador de licencias.
6. Se crea el grupo.
7. Se crea la sucursal o tecnico.
8. Se crea una licencia por 30 dias.
9. Se copia la clave de licencia.
10. El cliente activa la licencia en su sistema.

## Flujo de renovacion

Si el cliente esta adherido a suscripcion:

- Al ver el cobro aprobado, se extiende la licencia 30 dias desde el panel administrador.

Si el cliente no esta adherido:

- Se envia link de renovacion.
- Al ver el pago aprobado, se extiende la licencia 30 dias desde el panel administrador.

## Automatizacion futura

Cuando haya volumen de clientes, integrar webhooks de Mercado Pago para:

- registrar pagos aprobados;
- asociar pagos a licencia por referencia externa;
- renovar vencimientos automaticamente;
- registrar pagos rechazados o pendientes;
- avisar al cliente antes del vencimiento.

