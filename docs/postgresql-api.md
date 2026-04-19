# Servidor API con PostgreSQL

Este servidor es la base para dejar de compartir el archivo SQLite por red.

Arquitectura objetivo:

```text
Tickets EXE  --->  API SistemaTickets  --->  PostgreSQL
Caja EXE     --->  API SistemaTickets  --->  PostgreSQL
Licencias   --->  API SistemaTickets  --->  PostgreSQL
```

## Requisitos

- PostgreSQL instalado en la PC servidor.
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
```

Tambien se puede usar `DATABASE_URL`:

```powershell
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/sistema_tickets"
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

## Ejecutar API

```powershell
npm.cmd run server:start
```

Health check:

```text
http://localhost:3000/health
```

## Rutas iniciales

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
GET    /licenses
GET    /admin/license-groups
POST   /admin/license-groups
GET    /admin/license-units
POST   /admin/license-units
GET    /admin/licenses
POST   /admin/licenses
GET    /admin/license-validations
```

La documentacion especifica de licencias esta en `docs/licensing-server.md`.

## Derivacion de tickets

Cada ticket tiene:

- `sucursal_origen_id`
- `sucursal_actual_id`

Cada derivacion queda en:

- `derivaciones_ticket`

Esto permite consultar donde se origino un equipo, donde esta ahora y el historial de envios.

## Siguiente etapa

Las apps Electron todavia usan SQLite directo. El proximo paso es cambiar `main.js` y `main-caja.js` para consumir la API usando `api/client.js`.

Conviene hacerlo con una opcion configurable:

```text
modo local SQLite
modo servidor API
```

asi se puede migrar sin cortar el uso actual.

## Modo API en los EXE

Por defecto las apps siguen usando SQLite local:

```text
dataMode: 'local'
```

Para que Tickets y Caja consuman el servidor API:

```powershell
$env:SISTEMA_TICKETS_DATA_MODE="api"
$env:SISTEMA_TICKETS_API_URL="http://SERVIDOR:3000"
npm.cmd start
```

Para Caja:

```powershell
$env:SISTEMA_TICKETS_DATA_MODE="api"
$env:SISTEMA_TICKETS_API_URL="http://SERVIDOR:3000"
npm.cmd run start:caja
```

Tambien puede configurarse en `config/app.config.js`:

```js
module.exports = {
  dataMode: 'api',
  apiUrl: 'http://SERVIDOR:3000',
  apiSucursalId: 1
};
```
