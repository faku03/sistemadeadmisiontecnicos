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
Servicio Windows: MardelTechPostgreSQL
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

- PostgreSQL 15.17 offline
- Gateway
- Scripts de configuracion

Flujo esperado:

1. Instalar PostgreSQL 15.17 en modo silencioso o unattended.
2. Crear la base de datos del sistema.
3. Crear el usuario de la app.
4. Ejecutar `schema.sql`.
5. Dejar el Gateway apuntando a `127.0.0.1:3585`.

## Objetivo operativo

Que el usuario final pueda instalar todo con un solo instalador:

- Sin conflictos con otras apps
- Con version controlada
- Con estructura estable para soporte
- Con una base previsible para futuras migraciones

## Proximo tema a retomar

Pendientes para la siguiente etapa:

- Definir el comando unattended exacto de PostgreSQL
- Definir la base de datos y los usuarios a crear
- Preparar el script PowerShell de post-instalacion para dejar todo operativo
