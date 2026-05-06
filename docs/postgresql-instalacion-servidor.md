# PostgreSQL para instalador servidor

Este documento deja guardadas las decisiones tomadas para la instalacion del motor en el sistema.

## Decision principal

Usar una instancia propia, aislada y controlada de PostgreSQL.

- Version fija del sistema: PostgreSQL 15.17
- No depender de un PostgreSQL ya instalado por otra aplicacion
- No habilitar actualizaciones automaticas del motor

## Configuracion definida

```text
Motor: PostgreSQL 15.17
Carpeta de instalacion: C:\mardeltech\postgresql
Carpeta de datos: C:\mardeltech\postgresql\data
Puerto: 3585
Tarea de inicio automatico: MardelTech PostgreSQL
```

## Criterio elegido

- PostgreSQL 15.17 es la opcion mas razonable entre estabilidad, soporte y compatibilidad.
- PostgreSQL 14.22 queda demasiado cerca del fin de soporte.
- PostgreSQL 16.13 no aporta una ventaja real para este sistema.
- El peso del motor no cambia demasiado entre 14, 15 y 16 para este uso.
- Para este proyecto importa mas la configuracion y no instalar extras que la diferencia de version mayor.

## Estrategia de instalacion

Hacer un instalador unico de servidor.

Ese instalador debe incluir:

- runtime preextraido de PostgreSQL 15.17
- Gateway
- Scripts de configuracion

Flujo esperado:

1. Copiar runtime de PostgreSQL 15.17.
2. Inicializar cluster con `initdb`.
3. Registrar tarea programada de inicio automatico.
4. Crear la base de datos del sistema.
5. Crear el usuario de la app.
6. Ejecutar `schema.sql`.
7. Dejar el Gateway apuntando a `127.0.0.1:3585`.

## Arquitectura de instaladores

Queda separada en dos instaladores:

### 1. Instalador de servidor

Archivo de build:

- [electron-builder.instalador.json](C:/developerfaku/sistemadeticket/electron-builder.instalador.json)

Comportamiento:

- siempre instala PostgreSQL y gateway
- permite elegir si ademas se instala el sistema en la misma PC
- copia el instalador de terminal a:
  - `C:\mardeltech\sistemadetickets\terminal`
- si el usuario marca la opcion correspondiente, ejecuta el instalador de terminal al finalizar la preparacion del servidor

### 2. Instalador de terminal

Archivo de build:

- [electron-builder.terminal.json](C:/developerfaku/sistemadeticket/electron-builder.terminal.json)

Comportamiento:

- instala los ejecutables de Tickets y/o Caja
- no instala PostgreSQL
- solicita nombre o IP del servidor
- genera `app.config.json` con `apiUrl` y `licenseServerUrl`
- sirve tanto para la PC servidor si se quiere usar como terminal, como para cualquier otra terminal de la red

Importante:

- la terminal no se conecta directo a PostgreSQL
- la terminal se conecta al gateway del servidor
- por eso el dato que se pide en instalacion es la maquina servidor y no la base de datos

### Carpeta de insumos esperados

- runtime preextraido de PostgreSQL:
  - `installer\postgresql\runtime\...`
- setup ya compilado del instalador de terminal:
  - `installer\terminal\*.exe`

## Estado actual de implementacion

Ya quedaron preparados estos archivos para el instalador servidor:

- [install-postgresql-unattended.ps1](C:/developerfaku/sistemadeticket/server/install-postgresql-unattended.ps1)
- [configure-postgresql-instance.ps1](C:/developerfaku/sistemadeticket/server/configure-postgresql-instance.ps1)
- [server-installer.nsh](C:/developerfaku/sistemadeticket/installer/server-installer.nsh)
- [terminal-installer.nsh](C:/developerfaku/sistemadeticket/installer/terminal-installer.nsh)
- [electron-builder.instalador.json](C:/developerfaku/sistemadeticket/electron-builder.instalador.json)
- [electron-builder.terminal.json](C:/developerfaku/sistemadeticket/electron-builder.terminal.json)

Flujo implementado:

1. El instalador servidor copia el runtime de PostgreSQL desde `installer/postgresql/runtime`.
2. NSIS ejecuta `install-postgresql-unattended.ps1`.
3. Ese script copia los binarios a `C:\mardeltech\postgresql`.
4. Luego llama a `configure-postgresql-instance.ps1`.
5. El script de configuracion ejecuta `initdb`, arranca PostgreSQL en forma local, crea usuario, base, aplica `schema.sql`, deja tuning basico para hardware modesto y genera `server.config.json`.
6. NSIS registra la tarea `MardelTech PostgreSQL` para iniciar el motor al arrancar Windows.
7. NSIS registra la tarea del gateway.
8. El instalador servidor copia el instalador de terminal a `C:\mardeltech\sistemadetickets\terminal`.
9. Si el usuario lo pide, ejecuta ahi mismo el instalador de terminal.

## Runtime esperado

La carpeta que debe existir antes de compilar el instalador es:

```text
installer\postgresql\runtime
```

Con estos binarios minimos:

- `bin\initdb.exe`
- `bin\pg_ctl.exe`
- `bin\psql.exe`
- `bin\pg_isready.exe`

Como ayuda operativa, el repo ahora incluye:

- [prepare-postgresql-runtime.ps1](C:/developerfaku/sistemadeticket/scripts/prepare-postgresql-runtime.ps1)

Ese script permite armar `installer\postgresql\runtime` a partir de una instalacion existente de PostgreSQL en otra carpeta.

## Base y usuarios definidos

Quedaron definidos asi para esta primera etapa:

```text
Base de datos: sistema_tickets
Usuario app: mardeltech_app
Password app: mardeltech_app
Superusuario DB: postgres
Password superusuario: postgres
Inicio automatico del motor: tarea programada ejecutada como SYSTEM
```

## Tuning inicial para hardware modesto

El script ya aplica este perfil base:

- `max_connections = 40`
- `shared_buffers = 128MB`
- `work_mem = 4MB`
- `maintenance_work_mem = 64MB`
- `effective_cache_size = 512MB`
- `wal_buffers = 16MB`
- `random_page_cost = 1.5`
- `checkpoint_completion_target = 0.9`
- `autovacuum = on`
- `log_min_messages = warning`
- `log_min_duration_statement = -1`

La idea es bajar requerimiento de hardware sin sacrificar funcionamiento normal del sistema.

## Nota importante

Por ahora no se elimina PostgreSQL durante la desinstalacion del sistema.

Eso es intencional:

- evita borrar una base por error
- permite reinstalar la app sin perder datos
- deja la desinstalacion del motor como una tarea separada y controlada

## Comandos de build

- Servidor:
  - `npm run build:servidor`
- Terminal:
  - `npm run build:terminal`

## Objetivo operativo

Que el usuario final pueda instalar todo con un solo instalador:

- Sin conflictos con otras apps
- Con version controlada
- Con estructura estable para soporte
- Con una base previsible para futuras migraciones

## Proximo tema a retomar

Pendientes para la siguiente etapa:

- Armar o conseguir el runtime limpio de PostgreSQL 15.17
- Probar el instalador real con ese runtime incluido
- Ajustar credenciales finales para produccion
- Confirmar definitivamente la tarea de arranque del motor en una instalacion limpia
- Preparar script aparte de backup y restauracion inicial
