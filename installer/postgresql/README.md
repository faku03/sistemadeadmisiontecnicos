Colocar en esta carpeta el runtime preextraido de PostgreSQL 15.17.

Estructura esperada:

```text
installer\postgresql\runtime\
installer\postgresql\runtime\bin\initdb.exe
installer\postgresql\runtime\bin\pg_ctl.exe
installer\postgresql\runtime\bin\psql.exe
installer\postgresql\runtime\bin\pg_isready.exe
```

El instalador servidor copia esta carpeta a:

- `C:\mardeltech\postgresql`

Y luego ejecuta el flujo manual:

1. `initdb`
2. registro del servicio `MardelTechPostgreSQL`
3. inicio del servicio
4. creacion de base y usuario
5. ejecucion de `schema.sql`
6. tuning inicial para hardware modesto

Ya no se usa el `.exe` interactivo de EDB como paso de instalacion.
