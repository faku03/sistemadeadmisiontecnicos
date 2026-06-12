# Modulo reutilizable de login

Este modulo esta pensado para reutilizarse en el panel de licencias, Sistema de Tickets, Caja u otros proyectos Node/PostgreSQL.

No depende de Express ni de Electron. Recibe funciones `query` y `withTransaction`, por lo que puede trabajar con cualquier adaptador PostgreSQL compatible.

## Archivos

- `auth/index.js`: logica de usuarios, contrasenas, sesiones, cookies y rutas HTTP opcionales.
- `auth/schema.sql`: tablas necesarias para usuarios, sesiones y auditoria.

## Tablas

```text
auth_users
auth_sessions
auth_audit_log
```

## Uso basico

```js
const { createAuth } = require('./auth');
const { query, withTransaction } = require('./server/db');

const auth = createAuth({
  query,
  withTransaction,
  routePrefix: '/admin/auth',
  cookieName: 'sistema_admin',
  sessionHours: 12,
  secureCookies: true
});
```

## Montaje de rutas

En un gateway HTTP propio:

```js
if (await auth.handleAuthRoute({ method, path, req, res, sendJson, readJson })) {
  return;
}
```

Endpoints que expone:

```text
POST /admin/auth/login
POST /admin/auth/logout
GET  /admin/auth/me
```

## Login

Request:

```json
{
  "username": "admin",
  "password": "clave-segura"
}
```

Respuesta:

```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "displayName": "Administrador",
    "role": "ADMIN",
    "isActive": true
  },
  "token": "...",
  "expiresAt": "2026-05-29T15:00:00.000Z"
}
```

Tambien setea una cookie `HttpOnly`. El token se devuelve para clientes que prefieran enviarlo como:

```text
Authorization: Bearer TOKEN
```

## Proteger rutas

```js
const session = await auth.requireAuth(req, ['ADMIN', 'OPERADOR']);
```

Si no hay sesion valida lanza error con `statusCode = 401`.
Si el rol no alcanza lanza error con `statusCode = 403`.

## Crear usuario

```js
await auth.createUser({
  username: 'admin',
  password: 'clave-segura',
  displayName: 'Administrador',
  role: 'ADMIN'
});
```

## Auditoria

```js
await auth.audit('LICENSE_RENEWED', {
  user: session.user,
  entityType: 'license',
  entityId: '123',
  details: {
    expiresAt: '2026-06-29'
  }
});
```

## Integracion recomendada en este proyecto

1. Agregar `auth/schema.sql` al proceso de migracion.
2. Crear un script de seed para el primer usuario admin.
3. Montar rutas con `routePrefix: '/admin/auth'`.
4. Reemplazar el token fijo del panel por login.
5. Usar `requireAuth(req, ['ADMIN', 'OPERADOR'])` en rutas `/admin/*`.
6. Mantener `SISTEMA_TICKETS_ADMIN_TOKEN` solo como acceso tecnico de emergencia si hace falta.
