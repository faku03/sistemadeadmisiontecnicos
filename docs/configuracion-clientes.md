# Configuracion de clientes Tickets y Caja

Los EXE de Tickets y Caja leen la configuracion desde un archivo externo `app.config.json`.

Orden de busqueda:

1. Ruta indicada por `SISTEMA_TICKETS_CONFIG`.
2. `app.config.json` en la carpeta desde donde se ejecuta.
3. `app.config.json` al lado del EXE instalado.
4. `%APPDATA%\SistemaTickets\app.config.json`.
5. `config/app.config.json` dentro del proyecto, solo para desarrollo.

Las variables de entorno tienen prioridad sobre el archivo.

## Archivo recomendado para instalacion

Copiar `app.config.example.json` como `app.config.json` y ajustar:

```json
{
  "dataMode": "api",
  "apiUrl": "http://SERVIDOR-GATEWAY:3000",
  "sucursalId": "CODIGO-SUCURSAL-O-TECNICO",
  "sucursalNombre": "Nombre visible de la sucursal o tecnico",
  "licenseMode": "server",
  "licenseServerUrl": "http://SERVIDOR-GATEWAY:3000",
  "licenseGraceDays": 7
}
```

## Campos

`dataMode`

- `api`: usa el gateway y PostgreSQL.
- `local`: usa SQLite local. Queda solo para desarrollo o emergencia.

`apiUrl`

URL del gateway del sistema.

`sucursalId`

Codigo estable de la sucursal o tecnico. Debe coincidir con el codigo cargado en el panel administrativo.

`licenseMode`

- `server`: valida licencias contra el gateway.
- `mock`: solo desarrollo.

`licenseServerUrl`

URL del gateway que expone `/licenses/activate` y `/licenses/validate`.

`licenseGraceDays`

Dias de gracia offline. Valor esperado: `7`.

## Ejemplo local

```json
{
  "dataMode": "api",
  "apiUrl": "http://localhost:3000",
  "sucursalId": "DEV-UNIT",
  "sucursalNombre": "Sucursal desarrollo",
  "licenseMode": "server",
  "licenseServerUrl": "http://localhost:3000",
  "licenseGraceDays": 7
}
```

## Variables equivalentes

```powershell
$env:SISTEMA_TICKETS_DATA_MODE="api"
$env:SISTEMA_TICKETS_API_URL="http://SERVIDOR-GATEWAY:3000"
$env:SISTEMA_TICKETS_SUCURSAL_ID="CODIGO-SUCURSAL-O-TECNICO"
$env:SISTEMA_TICKETS_LICENSE_MODE="server"
$env:SISTEMA_TICKETS_LICENSE_SERVER_URL="http://SERVIDOR-GATEWAY:3000"
```

## Nota para instaladores

El instalador no debe incluir credenciales de PostgreSQL ni tokens administrativos. Los clientes solo necesitan:

- URL del gateway.
- Codigo estable de sucursal o tecnico.
- Clave de licencia ingresada desde la pantalla de activacion.

La base de datos queda protegida detras del gateway.
