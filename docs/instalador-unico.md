# Instalador servidor Tickets, Caja y Gateway

Este instalador esta pensado para la PC servidor del local.

Instala siempre:

- Gateway/API.
- Panel administrativo web.
- Scripts de arranque automatico del Gateway.

Permite elegir ademas:

- Sistema de Tickets / Servicio Tecnico.
- Sistema de Caja.
- Ambos modulos en la misma PC.

El Gateway se registra para iniciar con Windows mediante una tarea programada ejecutada como `SYSTEM`.

## Generar instalador

```powershell
npm.cmd run build:instalador
```

El instalador queda en:

```text
dist-instalador/SistemaTecnicoCaja-Setup-1.0.0.exe
```

La carpeta sugerida por defecto es:

```text
C:\mardeltech\sistemadetickets
```

El instalador se genera en modo por equipo, por lo que Windows puede pedir permisos de administrador.

## Seleccion de componentes

Durante la instalacion aparece una pantalla para elegir:

```text
[x] Sistema de Tickets / Servicio Tecnico
[x] Sistema de Caja
```

El Gateway/API no se pregunta: se instala siempre.

Debe quedar seleccionado al menos un modulo operativo.

El instalador crea accesos directos separados:

```text
Sistema de Tickets
Sistema de Caja
```

Tambien copia ejecutables separados dentro de la carpeta instalada:

```text
Sistema de Tickets.exe
Sistema de Caja.exe
```

El ejecutable base del paquete queda como `sistemadetickets.exe`. Ese nombre interno evita que el instalador cree una subcarpeta extra y permite instalar directamente en `C:\mardeltech\sistemadetickets`.

## Configuracion del Gateway

Despues de instalar, crear:

```text
C:\mardeltech\sistemadetickets\server.config.json
```

Usar como base:

```text
server.config.example.json
```

Ejemplo:

```json
{
  "PGHOST": "localhost",
  "PGPORT": "5432",
  "PGDATABASE": "sistema_tickets",
  "PGUSER": "postgres",
  "PGPASSWORD": "CAMBIAR_PASSWORD",
  "SISTEMA_TICKETS_API_PORT": "3000",
  "SISTEMA_TICKETS_ADMIN_TOKEN": "CAMBIAR_TOKEN_ADMIN"
}
```

Si PostgreSQL esta en la misma PC del servidor, usar `localhost`.

Si PostgreSQL esta en otra PC, usar su IP o nombre de red.

## Configuracion de Tickets/Caja en el servidor

Despues de instalar, colocar `app.config.json` al lado de los EXE o en:

```text
%APPDATA%\SistemaTickets\app.config.json
```

Usar como base:

```text
app.config.example.json
```

Ejemplo misma PC:

```json
{
  "apiUrl": "http://localhost:3000",
  "sucursalId": "CENTRAL",
  "sucursalNombre": "Casa Central",
  "licenseMode": "server",
  "licenseServerUrl": "https://sistematickets.licences.mardeltech.com",
  "licenseGraceDays": 7
}
```

La clave de licencia se ingresa desde la pantalla de activacion del sistema.

## Tarea programada

Nombre:

```text
MardelTech Sistema Tickets Gateway
```

El instalador la crea y la inicia automaticamente.

Para reiniciarla manualmente:

```powershell
Start-ScheduledTask -TaskName "MardelTech Sistema Tickets Gateway"
```

Para detener el proceso del Gateway:

```powershell
Get-Process | Where-Object { $_.Path -like "*sistemadetickets.exe" -or $_.Path -like "*Sistema de Tickets.exe" } | Stop-Process -Force
```

Para quitar la tarea:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\mardeltech\sistemadetickets\resources\server\uninstall-gateway-task.ps1"
```

## Panel administrativo de licencias

Servidor de licencias:

```text
https://sistematickets.licences.mardeltech.com/admin-panel
```

Health check del servidor de licencias:

```text
https://sistematickets.licences.mardeltech.com/health
```

## Logs

Los logs del Gateway quedan en:

```text
C:\ProgramData\MardelTech\SistemaTickets\logs
```

## Archivos de build

- `main-instalador.js`: decide si abrir Tickets, Caja o Gateway.
- `electron-builder.instalador.json`: configuracion del paquete servidor.
- `installer/installer-components.nsh`: pantalla NSIS de seleccion de modulos operativos y registro de Gateway.
- `server/start-gateway.ps1`: arranca el Gateway en modo oculto.
- `server/install-gateway-task.ps1`: registra la tarea programada.
- `server/uninstall-gateway-task.ps1`: elimina la tarea programada.
