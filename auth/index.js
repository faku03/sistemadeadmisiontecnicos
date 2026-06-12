const {
  createHash,
  randomBytes,
  scrypt: scryptCallback,
  timingSafeEqual
} = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(scryptCallback);

const DEFAULT_SESSION_HOURS = 12;
const DEFAULT_COOKIE_NAME = 'mt_auth';
const DEFAULT_PASSWORD_PARAMS = {
  keyLength: 64,
  cost: 16384,
  blockSize: 8,
  parallelization: 1
};

function required(value, fieldName) {
  const text = String(value || '').trim();

  if (!text) {
    throw new Error(`${fieldName} es obligatorio`);
  }

  return text;
}

function normalizeUsername(value) {
  return required(value, 'usuario').toLowerCase();
}

function normalizeRole(value) {
  return String(value || 'ADMIN').trim().toUpperCase();
}

function publicUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active
  };
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function addHours(date, hours) {
  return new Date(date.getTime() + (Number(hours || DEFAULT_SESSION_HOURS) * 60 * 60 * 1000));
}

function parseCookies(header) {
  return String(header || '')
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const index = part.indexOf('=');

      if (index === -1) return cookies;

      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function bearerToken(req) {
  const auth = String(req?.headers?.authorization || '');
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

function requestIp(req) {
  return String(
    req?.headers?.['x-forwarded-for'] ||
    req?.socket?.remoteAddress ||
    ''
  ).split(',')[0].trim();
}

function requestUserAgent(req) {
  return String(req?.headers?.['user-agent'] || '');
}

function cookieHeader(name, value, { expiresAt, secure = false } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];

  if (expiresAt) {
    parts.push(`Expires=${new Date(expiresAt).toUTCString()}`);
  }

  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function clearCookieHeader(name) {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

async function hashPassword(password, options = {}) {
  const text = required(password, 'contrasena');
  const params = {
    ...DEFAULT_PASSWORD_PARAMS,
    ...(options.passwordParams || {})
  };
  const salt = randomBytes(16).toString('base64url');
  const key = await scrypt(text, salt, params.keyLength, {
    N: params.cost,
    r: params.blockSize,
    p: params.parallelization
  });

  return [
    'scrypt',
    params.cost,
    params.blockSize,
    params.parallelization,
    salt,
    key.toString('base64url')
  ].join('$');
}

async function verifyPassword(password, storedHash) {
  const parts = String(storedHash || '').split('$');

  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }

  const [, cost, blockSize, parallelization, salt, expected] = parts;
  const expectedBuffer = Buffer.from(expected, 'base64url');
  const actual = await scrypt(String(password || ''), salt, expectedBuffer.length, {
    N: Number(cost),
    r: Number(blockSize),
    p: Number(parallelization)
  });

  if (actual.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actual, expectedBuffer);
}

function createAuth(options) {
  const {
    query,
    withTransaction,
    cookieName = DEFAULT_COOKIE_NAME,
    sessionHours = DEFAULT_SESSION_HOURS,
    secureCookies = false,
    routePrefix = '/auth'
  } = options || {};

  if (typeof query !== 'function') {
    throw new Error('createAuth requiere query(text, params)');
  }

  if (typeof withTransaction !== 'function') {
    throw new Error('createAuth requiere withTransaction(work)');
  }

  async function audit(action, context = {}) {
    await query(
      `
      INSERT INTO auth_audit_log (
        user_id,
        username,
        action,
        entity_type,
        entity_id,
        result,
        ip_address,
        user_agent,
        details
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        context.user?.id || context.userId || null,
        context.user?.username || context.username || null,
        action,
        context.entityType || null,
        context.entityId || null,
        context.result || 'OK',
        context.ipAddress || '',
        context.userAgent || '',
        JSON.stringify(context.details || {})
      ]
    );
  }

  async function createUser(data) {
    const username = normalizeUsername(data.username);
    const passwordHash = await hashPassword(data.password);

    const result = await query(
      `
      INSERT INTO auth_users (
        username,
        password_hash,
        display_name,
        role,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, display_name, role, is_active
      `,
      [
        username,
        passwordHash,
        required(data.displayName || data.display_name || data.username, 'nombre visible'),
        normalizeRole(data.role),
        data.isActive === undefined ? true : Boolean(data.isActive)
      ]
    );

    await audit('USER_CREATED', {
      username,
      entityType: 'auth_user',
      entityId: String(result.rows[0].id)
    });

    return publicUser(result.rows[0]);
  }

  async function findUserByUsername(username) {
    const result = await query(
      `
      SELECT id, username, password_hash, display_name, role, is_active
      FROM auth_users
      WHERE username = $1
      `,
      [normalizeUsername(username)]
    );

    return result.rows[0] || null;
  }

  async function login(data, req = null) {
    const username = normalizeUsername(data.username);
    const password = required(data.password, 'contrasena');
    const ipAddress = requestIp(req);
    const userAgent = requestUserAgent(req);
    const user = await findUserByUsername(username);

    if (!user || !user.is_active || !(await verifyPassword(password, user.password_hash))) {
      await audit('LOGIN_FAILED', {
        username,
        result: 'REJECTED',
        ipAddress,
        userAgent
      });
      throw new Error('Usuario o contrasena invalida');
    }

    return withTransaction(async client => {
      const token = randomBytes(32).toString('base64url');
      const expiresAt = addHours(new Date(), sessionHours);

      await client.query(
        `
        INSERT INTO auth_sessions (
          user_id,
          token_hash,
          expires_at,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [user.id, sha256(token), expiresAt.toISOString(), ipAddress, userAgent]
      );

      await client.query(
        `
        UPDATE auth_users
        SET last_login_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        `,
        [user.id]
      );

      await client.query(
        `
        INSERT INTO auth_audit_log (
          user_id,
          username,
          action,
          result,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, 'LOGIN_OK', 'OK', $3, $4)
        `,
        [user.id, user.username, ipAddress, userAgent]
      );

      return {
        token,
        expiresAt: expiresAt.toISOString(),
        cookie: cookieHeader(cookieName, token, { expiresAt, secure: secureCookies }),
        user: publicUser(user)
      };
    });
  }

  function tokenFromRequest(req) {
    const cookies = parseCookies(req?.headers?.cookie);
    return cookies[cookieName] || bearerToken(req);
  }

  async function sessionFromToken(token) {
    if (!token) return null;

    const result = await query(
      `
      SELECT
        s.id AS session_id,
        s.expires_at,
        u.id,
        u.username,
        u.display_name,
        u.role,
        u.is_active
      FROM auth_sessions s
      JOIN auth_users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
        AND u.is_active = TRUE
      `,
      [sha256(token)]
    );

    const row = result.rows[0];

    if (!row) return null;

    await query(
      `UPDATE auth_sessions SET last_seen_at = NOW() WHERE id = $1`,
      [row.session_id]
    );

    return {
      sessionId: row.session_id,
      expiresAt: new Date(row.expires_at).toISOString(),
      user: publicUser(row)
    };
  }

  async function currentSession(req) {
    return sessionFromToken(tokenFromRequest(req));
  }

  async function requireAuth(req, roles = []) {
    const session = await currentSession(req);

    if (!session) {
      const error = new Error('No autorizado');
      error.statusCode = 401;
      throw error;
    }

    const allowedRoles = roles.map(normalizeRole);

    if (allowedRoles.length && !allowedRoles.includes(session.user.role)) {
      const error = new Error('Permisos insuficientes');
      error.statusCode = 403;
      throw error;
    }

    return session;
  }

  async function logout(req) {
    const token = tokenFromRequest(req);

    if (token) {
      await query(`DELETE FROM auth_sessions WHERE token_hash = $1`, [sha256(token)]);
    }

    return {
      cookie: clearCookieHeader(cookieName)
    };
  }

  async function cleanupExpiredSessions() {
    const result = await query(`DELETE FROM auth_sessions WHERE expires_at <= NOW()`);
    return result.rowCount || 0;
  }

  async function handleAuthRoute({ method, path, req, res, sendJson, readJson }) {
    if (!path.startsWith(routePrefix)) {
      return false;
    }

    if (method === 'POST' && path === `${routePrefix}/login`) {
      const result = await login(await readJson(req), req);
      res.setHeader('Set-Cookie', result.cookie);
      sendJson(res, 200, {
        user: result.user,
        token: result.token,
        expiresAt: result.expiresAt
      });
      return true;
    }

    if (method === 'POST' && path === `${routePrefix}/logout`) {
      const result = await logout(req);
      res.setHeader('Set-Cookie', result.cookie);
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (method === 'GET' && path === `${routePrefix}/me`) {
      const session = await requireAuth(req);
      sendJson(res, 200, session);
      return true;
    }

    return false;
  }

  return {
    audit,
    cleanupExpiredSessions,
    createUser,
    currentSession,
    findUserByUsername,
    handleAuthRoute,
    login,
    logout,
    requireAuth,
    sessionFromToken,
    tokenFromRequest
  };
}

module.exports = {
  createAuth,
  hashPassword,
  verifyPassword
};
