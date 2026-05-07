# Servidor API con PostgreSQL

Este servidor es el gateway unico para Tickets, Caja, licencias, administracion y futuras webs.

Arquitectura:

```text
Tickets EXE  --->  Gateway/API  --->  PostgreSQL
Caja EXE     --->  Gateway/API  --->  PostgreSQL
Licencias   --->  Gateway/API  --->  PostgreSQL
Admin web   --->  Gateway/API  --->  PostgreSQL
```

Puede correr todo en la misma PC:

```text
PC unica
  PostgreSQL
  Gateway/API
  Tickets
  Caja
```

O en red local:

```text
PC servidor
  PostgreSQL
  Gateway/API

PCs cliente
  Tickets
  Caja
```

## Requisitos

- PostgreSQL instalado.
- Base creada, por ejemplo `sistema_tickets`.
- Variables de entorno configuradas.

Ejemplo:

```powershell
$env:PGHOST="localhost"
$env:PGPORT="5432"
$env:PGDATABASE="sistema_tickets"
$env:PGUSER="postgres"
$env:PGPASSWORD="postgres"
$env:SISTEMA_TICKETS_API_PORT="3000"
$env:SISTEMA_TICKETS_ADMIN_TOKEN="cambiar-este-token"
```

Tambien se puede usar `DATABASE_URL`:

```powershell
$env:DATABASE_URL="postgres://usuario:password@localhost:5432/sistema_tickets"
```

## Inicializar esquema

```powershell
npm.cmd run server:migrate
```

Esto crea:

- clientes
- sucursales
- tipos, marcas, modelos
- tickets
- estados
- derivaciones entre sucursales
- movimientos de caja
- devoluciones
- comprobantes X
- grupos, unidades y licencias

## Ejecutar API

```powershell
npm.cmd run server:start
```

Health check:

```text
http://localhost:3000/health
```

## Rutas principales

```text
GET    /health
GET    /estados-ticket
GET    /sucursales
POST   /sucursales
PUT    /sucursales/:id
DELETE /sucursales/:id
POST   /sucursales/:id/reactivar
GET    /clientes/buscar?dni=
POST   /clientes
GET    /tipos-equipo
POST   /tipos-equipo
PUT    /tipos-equipo/:id
DELETE /tipos-equipo/:id
POST   /tipos-equipo/:id/reactivar
GET    /marcas
POST   /marcas
PUT    /marcas/:id
DELETE /marcas/:id
POST   /marcas/:id/reactivar
GET    /modelos
POST   /modelos
PUT    /modelos/:id
DELETE /modelos/:id
POST   /modelos/:id/reactivar
GET    /tickets
POST   /tickets
PATCH  /tickets/:uuid/estado
PATCH  /tickets/:uuid/presupuesto
POST   /tickets/:uuid/presupuesto-enviar
POST   /tickets/:uuid/entrega
POST   /tickets/:uuid/derivaciones
GET    /caja/pendientes
GET    /caja/cobrados
GET    /caja/informe
POST   /caja/:uuid/cobrar
POST   /caja/:uuid/devoluciones
POST   /caja/:uuid/comprobante-x
POST   /licenses/activate
POST   /licenses/validate
GET    /admin/license-groups
POST   /admin/license-groups
GET    /admin/license-units
POST   /admin/license-units
GET    /admin/licenses
POST   /admin/licenses
GET    /admin/license-validations
```

La documentacion especifica de licencias esta en `docs/licensing-server.md`.

La interfaz administrativa se abre desde:

```text
https://sistematickets.licences.mardeltech.com/admin-panel
```

## Derivacion de tickets

Cada ticket tiene:

- `sucursal_origen_id`
- `sucursal_actual_id`

Cada derivacion queda en:

- `derivaciones_ticket`

Esto permite consultar donde se origino un equipo, donde esta ahora y el historial de envios.

## Configuracion de clientes

Tickets y Caja deben apuntar al Gateway/API con `app.config.json`.

Misma PC:

```json
{
  "apiUrl": "http://localhost:3000",
  "sucursalId": "CENTRAL",
  "licenseMode": "server",
  "licenseServerUrl": "https://sistematickets.licences.mardeltech.com",
  "licenseGraceDays": 7
}
```

Servidor de red local:

```json
{
  "apiUrl": "http://192.168.1.50:3000",
  "sucursalId": "CENTRAL",
  "licenseMode": "server",
  "licenseServerUrl": "https://sistematickets.licences.mardeltech.com",
  "licenseGraceDays": 7
}
```
