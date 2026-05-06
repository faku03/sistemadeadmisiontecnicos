Colocar en esta carpeta el instalador de terminal ya compilado.

Nombre esperado sugerido:

- `SistemaTerminal-Setup.exe`

Si se prefiere conservar la version en el nombre, tambien funciona cualquier `*.exe`
porque el instalador servidor busca el primer ejecutable dentro de esta carpeta.

Flujo pensado:

1. Compilar el instalador de terminal.
2. Copiar el `.exe` resultante en esta carpeta.
3. Compilar el instalador servidor.
4. El instalador servidor copiara ese `.exe` a:
   - `C:\mardeltech\sistemadetickets\terminal`
5. Si el usuario marca la opcion de instalar tambien el sistema, el instalador servidor ejecuta ese instalador de terminal.

Durante la instalacion de terminal se solicita:

- nombre o IP de la maquina servidor

Ese dato se guarda en `app.config.json` para completar:

- `apiUrl`
- `licenseServerUrl`

La terminal no se conecta directo a PostgreSQL. Se conecta al gateway del servidor.

Al finalizar la instalacion:

- si esta instalado Tickets, se abre `Sistema de Tickets` como modulo principal
- si no esta Tickets pero si Caja, se abre `Sistema de Caja`
