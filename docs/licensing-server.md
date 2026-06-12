# Servidor de licencias

Este modulo deja preparada la arquitectura para separar:

```text
PostgreSQL               Base central de datos
Gateway API              Entrada unica para sistemas y clientes
Tickets EXE              Cliente de admision y reparacion
Caja EXE                 Cliente de cobro, devoluciones e informes
Backend administracion   Alta/baja de grupos, sucursales y licencias
Web clientes             Consulta o acciones futuras para clientes finales
```

Por ahora todo puede correr local en la misma PC, pero queda armado para moverlo a un servidor final cambiando variables de entorno.

## Componentes

- `server/index.js`: gateway HTTP.
- `server/schema.sql`: datos operativos del sistema.
- `server/schema-licenses.sql`: datos de licencias.
- `server/licenses.js`: reglas de activacion y validacion.
- `server/seed-licenses.js`: alta rapida de una licencia de desarrollo.
- `license/license-service.js`: cliente local usado por Tickets y Caja.

## Modelo de licencias

```text
license_groups
  Grupo comercial o empresa.
  Guarda datos comerciales y de contacto del cliente.

license_units
  Sucursal o tecnico individual dentro de un grupo.

licenses
  Licencia individual asignada a una unidad.
  Puede quedar vinculada a una maquina con machine_id.

license_validations
  Auditoria de activaciones y validaciones.
```

Regla actual:

- Cada sucursal/tecnico tiene licencia individual.
- Varias sucursales/tecnicos pueden compartir informacion si pertenecen al mismo grupo.
- La licencia se valida online contra el gateway.
- Si el gateway no responde, el cliente usa cache local firmada.
- La gracia offline queda en 7 dias.
- Al vencer la gracia se bloquean acciones de escritura.

## Variables de entorno

Base de datos:

```powershell
$env:PGHOST="localhost"
$env:PGPORT="5432"
$env:PGDATABASE="sistema_tickets"
$env:PGUSER="postgres"
$env:PGPASSWORD="postgres"
```

Gateway:

```powershell
$env:SISTEMA_TICKETS_API_PORT="3000"
$env:SISTEMA_TICKETS_ADMIN_TOKEN="cambiar-este-token"
```

El token administrativo es obligatorio para usar `/admin/*` y el panel web. Solo en desarrollo se puede desproteger con:

```powershell
$env:SISTEMA_TICKETS_ALLOW_UNPROTECTED_ADMIN="true"
```

No usar esa opcion en produccion.

Clientes Tickets/Caja:

```powershell
$env:SISTEMA_TICKETS_LICENSE_MODE="server"
$env:SISTEMA_TICKETS_LICENSE_SERVER_URL="https://sistematickets.licences.mardeltech.com"
```

Para instaladores conviene usar `app.config.json`. La guia de clientes esta en `docs/configuracion-clientes.md`.

En desarrollo local:

```powershell
$env:SISTEMA_TICKETS_LICENSE_SERVER_URL="http://localhost:3000"
```

## Instalacion local rapida

1. Crear o confirmar la base PostgreSQL `sistema_tickets`.

2. Migrar tablas operativas y de licencias:

```powershell
npm.cmd run server:migrate
```

3. Crear licencia inicial de desarrollo:

```powershell
npm.cmd run server:seed-licenses
```

La clave creada por defecto es:

```text
ABCD-1234-EFGH
```

Este seed es solo para desarrollo: si la clave ya existia, la vuelve a activar y libera el `machine_id` para poder probar en otra PC.

Para crear otra clave dev:

```powershell
$env:SISTEMA_TICKETS_DEV_LICENSE_KEY="MIKEY-1234-LOCAL"
npm.cmd run server:seed-licenses
```

4. Levantar gateway:

```powershell
npm.cmd run server:start
```

5. Ejecutar Tickets o Caja apuntando al servidor:

```powershell
$env:SISTEMA_TICKETS_LICENSE_MODE="server"
$env:SISTEMA_TICKETS_LICENSE_SERVER_URL="https://sistematickets.licences.mardeltech.com"
npm.cmd start
```

Para Caja:

```powershell
$env:SISTEMA_TICKETS_LICENSE_MODE="server"
$env:SISTEMA_TICKETS_LICENSE_SERVER_URL="https://sistematickets.licences.mardeltech.com"
npm.cmd run start:caja
```

## Endpoints del gateway

```text
GET  https://sistematickets.licences.mardeltech.com/health
GET  https://sistematickets.licences.mardeltech.com/admin-panel
GET  https://sistematickets.licences.mardeltech.com/licenses
POST https://sistematickets.licences.mardeltech.com/licenses/activate
POST https://sistematickets.licences.mardeltech.com/licenses/validate
```

`GET /licenses` es administrativo. Si `SISTEMA_TICKETS_ADMIN_TOKEN` esta configurado, requiere:

```text
Authorization: Bearer cambiar-este-token
```

## Backend administrativo

El backend administrativo queda dentro del mismo gateway, separado por rutas `/admin/*` y protegido por `SISTEMA_TICKETS_ADMIN_TOKEN`.

La interfaz web se sirve desde el mismo gateway:

```text
https://sistematickets.licences.mardeltech.com/admin-panel
```

En desarrollo local:

```text
http://localhost:3000/admin-panel
```

El panel permite:

- Crear grupos.
- Crear sucursales o tecnicos con codigo estable.
- Crear licencias.
- Renovar licencias cambiando solo la fecha de vencimiento.
- Registrar pago mensual aprobado y renovar automaticamente 30 dias.
- Guardar referencia de suscripcion o cobro externo.
- Suspender/reactivar licencias.
- Liberar una licencia de una PC.
- Ver las ultimas validaciones.

Grupos:

```text
GET  /admin/license-groups
POST /admin/license-groups
PUT  /admin/license-groups/:id
POST /admin/license-groups/:id/deactivate
POST /admin/license-groups/:id/reactivate
```

Unidades, que pueden ser sucursales o tecnicos:

```text
GET  /admin/license-units
POST /admin/license-units
PUT  /admin/license-units/:id
POST /admin/license-units/:id/deactivate
POST /admin/license-units/:id/reactivate
```

Licencias:

```text
GET  /admin/licenses
POST /admin/licenses
PUT  /admin/licenses/:id
POST /admin/licenses/:id/suspend
POST /admin/licenses/:id/activate
POST /admin/licenses/:id/release-machine
POST /admin/licenses/:id/payment
```

`POST /admin/licenses/:id/payment` registra un cobro aprobado y actualiza la licencia. Cuerpo recomendado:

```json
{
  "amount": 30000,
  "currency": "ARS",
  "payment_method": "MERCADO_PAGO",
  "payment_reference": "preapproval-id-o-payment-id",
  "valid_days": 30,
  "subscription_status": "ACTIVE",
  "notes": "Pago mensual aprobado"
}
```

Auditoria:

```text
GET /admin/license-validations
GET /admin/license-validations?license_id=1
```

Crear grupo:

```json
{
  "codigo": "GRUPO-001",
  "nombre": "Service Centro",
  "tax_id": "20-12345678-9",
  "contact_name": "Juan Perez",
  "contact_email": "contacto@servicecentro.com",
  "contact_phone": "2230000000",
  "address": "Av. Independencia 1234",
  "locality": "Mar del Plata",
  "province": "Buenos Aires"
}
```

Crear unidad:

```json
{
  "group_id": 1,
  "codigo": "SUC-001",
  "nombre": "Sucursal Centro",
  "tipo": "SUCURSAL"
}
```

El `codigo` de la unidad es estable. Para una sucursal o tecnico existente no se cambia ese codigo cuando paga una nueva mensualidad.

Crear licencia:

```json
{
  "group_id": 1,
  "unit_id": 1,
  "plan": "STANDARD",
  "valid_days": 30,
  "grace_days": 7,
  "features": {
    "tickets": true,
    "caja": true,
    "derivaciones": true
  }
}
```

La respuesta de creacion devuelve la clave completa una sola vez en `license_key`. En la base queda guardado el hash y una etiqueta enmascarada, no la clave visible completa.

## Renovacion mensual

La renovacion no cambia el codigo de sucursal/tecnico ni la clave instalada en el cliente.

Flujo:

1. El cliente paga.
2. En el panel se busca la sucursal o tecnico por codigo.
3. Se actualiza `expires_at` a la nueva fecha de vencimiento.
4. Tickets/Caja validan online contra el gateway.
5. El gateway compara la fecha actual del servidor contra `licenses.expires_at`.
6. Si la fecha del servidor es menor o igual al vencimiento y el estado es `ACTIVE`, la licencia sigue funcionando.

Esto evita depender de la fecha de la PC del cliente.

Liberar una licencia de una PC:

```text
POST /admin/licenses/:id/release-machine
```

Esto borra `machine_id` y permite activar esa licencia en otra maquina.

Activacion:

```json
{
  "license_key": "ABCD-1234-EFGH",
  "machine_id": "ID-DE-LA-MAQUINA",
  "app_name": "sistema-tickets",
  "app_version": "1.0.0"
}
```

Respuesta:

```json
{
  "licenseKey": "ABCD-1234-EFGH",
  "status": "ACTIVE",
  "groupId": "DEV-GROUP",
  "unitId": "DEV-UNIT",
  "unitType": "SUCURSAL",
  "machineId": "ID-DE-LA-MAQUINA",
  "plan": "STANDARD",
  "expiresAt": "2026-05-19T00:00:00.000Z",
  "graceUntil": "2026-04-26T00:00:00.000Z",
  "graceDays": 7,
  "features": {
    "tickets": true,
    "caja": true,
    "derivaciones": true
  }
}
```

## Prueba rapida

Con PostgreSQL configurado:

```powershell
npm.cmd run server:migrate
npm.cmd run server:seed-licenses
npm.cmd run smoke:license-server
npm.cmd run smoke:license-admin
```

## Despliegue final recomendado

```text
Servidor Base de Datos
  PostgreSQL
  Backups automaticos
  Acceso solo desde Gateway

Servidor Gateway
  Node.js
  API HTTP/HTTPS
  Variables de conexion a PostgreSQL
  Firewall permitiendo solo puertos necesarios

Clientes
  Tickets EXE
  Caja EXE
  Configurados contra la URL del Gateway
```

En produccion el gateway debe exponerse con HTTPS, logs persistentes y credenciales de PostgreSQL no compartidas con los clientes.
