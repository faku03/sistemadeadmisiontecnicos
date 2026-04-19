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

Clientes Tickets/Caja:

```powershell
$env:SISTEMA_TICKETS_LICENSE_MODE="server"
$env:SISTEMA_TICKETS_LICENSE_SERVER_URL="http://SERVIDOR:3000"
```

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
$env:SISTEMA_TICKETS_LICENSE_SERVER_URL="http://localhost:3000"
npm.cmd start
```

Para Caja:

```powershell
$env:SISTEMA_TICKETS_LICENSE_MODE="server"
$env:SISTEMA_TICKETS_LICENSE_SERVER_URL="http://localhost:3000"
npm.cmd run start:caja
```

## Endpoints del gateway

```text
POST /licenses/activate
POST /licenses/validate
GET  /licenses
```

`GET /licenses` es administrativo. Si `SISTEMA_TICKETS_ADMIN_TOKEN` esta configurado, requiere:

```text
Authorization: Bearer cambiar-este-token
```

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
