# Instalador unico Tickets y Caja

El instalador combinado permite instalar:

- Sistema de Tickets / Servicio Tecnico.
- Sistema de Caja.
- Ambos modulos en la misma PC.

## Generar instalador

```powershell
npm.cmd run build:instalador
```

El instalador queda en:

```text
dist-instalador/SistemaTecnicoCaja-Setup-1.0.0.exe
```

## Seleccion de componentes

Durante la instalacion aparece una pantalla para elegir:

```text
[x] Sistema de Tickets / Servicio Tecnico
[x] Sistema de Caja
```

Debe quedar seleccionado al menos un modulo.

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

Ambos usan el mismo paquete interno, pero arrancan en modo distinto.

## Configuracion posterior

Despues de instalar, colocar `app.config.json` al lado de los EXE o en:

```text
%APPDATA%\SistemaTickets\app.config.json
```

Usar como base:

```text
app.config.example.json
```

Ejemplo:

```json
{
  "dataMode": "api",
  "apiUrl": "http://SERVIDOR-GATEWAY:3000",
  "sucursalId": "CODIGO-SUCURSAL-O-TECNICO",
  "sucursalNombre": "Nombre visible",
  "licenseMode": "server",
  "licenseServerUrl": "http://SERVIDOR-GATEWAY:3000",
  "licenseGraceDays": 7
}
```

La clave de licencia se ingresa desde la pantalla de activacion del sistema.

## Archivos de build

- `main-instalador.js`: decide si abrir Tickets o Caja.
- `electron-builder.instalador.json`: configuracion del paquete combinado.
- `installer/installer-components.nsh`: pantalla NSIS de seleccion de componentes y accesos.
