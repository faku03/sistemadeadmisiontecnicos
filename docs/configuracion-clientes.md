# Configuracion de clientes Tickets y Caja

Los EXE de Tickets y Caja trabajan siempre contra el Gateway/API. No usan base local.

El Gateway puede estar:

- En la misma PC donde se usa el sistema.
- En otra PC servidor dentro de la red local.
- En un servidor remoto o cloud.

Los clientes leen la configuracion desde `app.config.json`.

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
  "apiUrl": "http://SERVIDOR-GATEWAY:3000",
  "sucursalId": "CODIGO-SUCURSAL-O-TECNICO",
  "sucursalNombre": "Nombre visible de la sucursal o tecnico",
  "licenseMode": "server",
  "licenseServerUrl": "http://SERVIDOR-GATEWAY:3000",
  "licenseGraceDays": 7
}
```

## Misma PC

Si PostgreSQL, Gateway, Tickets y Caja estan en la misma PC:

```json
{
  "apiUrl": "http://localhost:3000",
  "sucursalId": "CENTRAL",
  "sucursalNombre": "Casa Central",
  "licenseMode": "server",
  "licenseServerUrl": "http://localhost:3000",
  "licenseGraceDays": 7
}
```

## Red local

Si PostgreSQL y Gateway estan en una PC servidor de la red:

```json
{
  "apiUrl": "http://192.168.1.50:3000",
  "sucursalId": "CENTRAL",
  "sucursalNombre": "Casa Central",
  "licenseMode": "server",
  "licenseServerUrl": "http://192.168.1.50:3000",
  "licenseGraceDays": 7
}
```

## Campos

`apiUrl`

URL del Gateway/API del sistema.

`sucursalId`

Codigo estable de la sucursal o tecnico. Debe coincidir con el codigo cargado en el panel administrativo.

`licenseMode`

- `server`: valida licencias contra el gateway.
- `mock`: solo desarrollo.

`licenseServerUrl`

URL del gateway que expone `/licenses/activate` y `/licenses/validate`.

`licenseGraceDays`

Dias de gracia offline. Valor esperado: `7`.

## Variables equivalentes

```powershell
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
