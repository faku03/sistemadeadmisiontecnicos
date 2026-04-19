# Servidor API con PostgreSQL

Este servidor es la base para dejar de compartir el archivo SQLite por red.

Arquitectura objetivo:

```text
Tickets EXE  --->  API SistemaTickets  --->  PostgreSQL
Caja EXE     --->  API SistemaTickets  --->  PostgreSQL
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
GET    /tickets
POST   /tickets
PATCH  /tickets/:uuid/estado
PATCH  /tickets/:uuid/presupuesto
POST   /tickets/:uuid/presupuesto-enviar
POST   /tickets/:uuid/entrega
POST   /tickets/:uuid/derivaciones
GET    /caja/pendientes
POST   /caja/:uuid/cobrar
```

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
