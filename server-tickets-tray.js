const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { app, Menu, Tray, nativeImage, shell } = require('electron');
const { spawn } = require('child_process');

const DEFAULT_PORT = 3000;
const DEFAULT_PG_PORT = 3585;
const DEFAULT_PG_DATA = 'C:\\mardeltech\\postgresql\\data';

let tray = null;
let postgresProcess = null;
let gatewayProcess = null;
let lastStatus = {
  postgres: false,
  gateway: false,
  message: 'Iniciando servidor...'
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function installDir() {
  if (app.isPackaged) {
    return path.dirname(process.execPath);
  }

  return __dirname;
}

function resourcesDir() {
  if (app.isPackaged) {
    return process.resourcesPath;
  }

  return __dirname;
}

function logDir() {
  const base = process.env.ProgramData || 'C:\\ProgramData';
  const dir = path.join(base, 'MardelTech', 'SistemaTickets', 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readServerConfig() {
  const candidates = [
    path.join(installDir(), 'server.config.json'),
    path.join(path.dirname(installDir()), 'server.config.json'),
    path.join(resourcesDir(), 'server.config.example.json')
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return JSON.parse(fs.readFileSync(candidate, 'utf8'));
      }
    } catch (_) {
      return {};
    }
  }

  return {};
}

function postgresPaths() {
  const runtime = path.join(resourcesDir(), 'postgresql', 'runtime');
  return {
    runtime,
    postgres: path.join(runtime, 'bin', 'postgres.exe'),
    pgIsReady: path.join(runtime, 'bin', 'pg_isready.exe')
  };
}

function openLogStream(fileName) {
  return fs.openSync(path.join(logDir(), fileName), 'a');
}

function appendLog(fileName, message) {
  fs.appendFileSync(
    path.join(logDir(), fileName),
    `[${new Date().toISOString()}] ${message}\r\n`
  );
}

function runCheck(filePath, args, timeoutMs = 4000) {
  return new Promise(resolve => {
    if (!fs.existsSync(filePath)) {
      resolve(false);
      return;
    }

    const child = spawn(filePath, args, {
      windowsHide: true,
      stdio: 'ignore'
    });
    const timer = setTimeout(() => {
      child.kill();
      resolve(false);
    }, timeoutMs);

    child.on('exit', code => {
      clearTimeout(timer);
      resolve(code === 0);
    });

    child.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

async function postgresReady() {
  const cfg = readServerConfig();
  const pg = postgresPaths();
  const port = Number(cfg.PGPORT || DEFAULT_PG_PORT);
  return runCheck(pg.pgIsReady, ['-h', '127.0.0.1', '-p', String(port), '-U', 'postgres']);
}

async function startPostgres() {
  if (await postgresReady()) {
    appendLog('server-tickets.log', 'PostgreSQL ya estaba activo.');
    return true;
  }

  const cfg = readServerConfig();
  const pg = postgresPaths();
  const port = Number(cfg.PGPORT || DEFAULT_PG_PORT);

  if (!fs.existsSync(pg.postgres)) {
    appendLog('server-tickets.err.log', `No se encontro postgres.exe en ${pg.postgres}`);
    return false;
  }

  if (!fs.existsSync(DEFAULT_PG_DATA)) {
    appendLog('server-tickets.err.log', `No se encontro el directorio de datos ${DEFAULT_PG_DATA}`);
    return false;
  }

  appendLog('server-tickets.log', 'Iniciando PostgreSQL...');
  const stdout = openLogStream('postgresql.out.log');
  const stderr = openLogStream('postgresql.err.log');

  postgresProcess = spawn(pg.postgres, ['-D', DEFAULT_PG_DATA, '-p', String(port)], {
    cwd: pg.runtime,
    windowsHide: true,
    stdio: ['ignore', stdout, stderr]
  });

  postgresProcess.on('exit', code => {
    appendLog('server-tickets.log', `PostgreSQL finalizo con codigo ${code}.`);
    postgresProcess = null;
  });

  for (let i = 0; i < 30; i += 1) {
    if (await postgresReady()) {
      appendLog('server-tickets.log', 'PostgreSQL iniciado.');
      return true;
    }
    await sleep(2000);
  }

  appendLog('server-tickets.err.log', 'PostgreSQL no respondio despues de iniciar.');
  return false;
}

async function gatewayReady() {
  const cfg = readServerConfig();
  const port = Number(cfg.SISTEMA_TICKETS_API_PORT || DEFAULT_PORT);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    return response.ok;
  } catch (_) {
    return false;
  }
}

async function startGateway() {
  if (await gatewayReady()) {
    appendLog('server-tickets.log', 'Gateway ya estaba activo.');
    return true;
  }

  const cfg = readServerConfig();
  const env = {
    ...process.env,
    PGHOST: cfg.PGHOST || '127.0.0.1',
    PGPORT: String(cfg.PGPORT || DEFAULT_PG_PORT),
    PGDATABASE: cfg.PGDATABASE || 'sistema_tickets',
    PGUSER: cfg.PGUSER || 'mardeltech_app',
    PGPASSWORD: cfg.PGPASSWORD || 'mardeltech_app',
    SISTEMA_TICKETS_API_PORT: String(cfg.SISTEMA_TICKETS_API_PORT || DEFAULT_PORT),
    SISTEMA_TICKETS_OUTPUT_PATH: path.join(process.env.ProgramData || 'C:\\ProgramData', 'MardelTech', 'SistemaTickets', 'pdfs')
  };

  fs.mkdirSync(env.SISTEMA_TICKETS_OUTPUT_PATH, { recursive: true });

  appendLog('server-tickets.log', 'Iniciando gateway...');
  const stdout = openLogStream('gateway.out.log');
  const stderr = openLogStream('gateway.err.log');

  gatewayProcess = spawn(process.execPath, ['--gateway'], {
    cwd: installDir(),
    windowsHide: true,
    env,
    stdio: ['ignore', stdout, stderr]
  });

  gatewayProcess.on('exit', code => {
    appendLog('server-tickets.log', `Gateway finalizo con codigo ${code}.`);
    gatewayProcess = null;
  });

  for (let i = 0; i < 30; i += 1) {
    if (await gatewayReady()) {
      appendLog('server-tickets.log', 'Gateway iniciado.');
      return true;
    }
    await sleep(2000);
  }

  appendLog('server-tickets.err.log', 'Gateway no respondio despues de iniciar.');
  return false;
}

function iconImage() {
  return nativeImage.createFromBuffer(createTrayPng());
}

function createTrayPng() {
  const size = 32;
  const pixels = Buffer.alloc(size * size * 4, 0);

  function setPixel(x, y, color) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const offset = ((y * size) + x) * 4;
    pixels[offset] = color[0];
    pixels[offset + 1] = color[1];
    pixels[offset + 2] = color[2];
    pixels[offset + 3] = color[3];
  }

  function rect(x, y, width, height, color) {
    for (let row = y; row < y + height; row += 1) {
      for (let col = x; col < x + width; col += 1) {
        setPixel(col, row, color);
      }
    }
  }

  function circle(cx, cy, radius, color) {
    for (let y = cy - radius; y <= cy + radius; y += 1) {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if ((dx * dx) + (dy * dy) <= radius * radius) {
          setPixel(x, y, color);
        }
      }
    }
  }

  const blue = [13, 110, 253, 255];
  const darkBlue = [8, 74, 170, 255];
  const white = [255, 255, 255, 255];
  const green = [34, 197, 94, 255];
  const greenDark = [21, 128, 61, 255];

  rect(6, 5, 20, 22, blue);
  rect(6, 5, 20, 3, darkBlue);
  rect(9, 10, 14, 3, white);
  rect(9, 16, 14, 3, white);
  rect(9, 22, 9, 3, white);
  circle(23, 24, 6, greenDark);
  circle(23, 24, 4, green);

  return encodePng(size, size, pixels);
}

function encodePng(width, height, rgba) {
  const scanlineLength = (width * 4) + 1;
  const raw = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y += 1) {
    const rawOffset = y * scanlineLength;
    const rgbaOffset = y * width * 4;
    raw[rawOffset] = 0;
    rgba.copy(raw, rawOffset + 1, rgbaOffset, rgbaOffset + (width * 4));
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', Buffer.concat([
      uint32(width),
      uint32(height),
      Buffer.from([8, 6, 0, 0, 0])
    ])),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuffer, data]));

  return Buffer.concat([
    uint32(data.length),
    typeBuffer,
    data,
    uint32(crc)
  ]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0, 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function updateTray() {
  if (!tray) return;

  const stateText = lastStatus.postgres && lastStatus.gateway
    ? 'Servidor activo'
    : 'Servidor con alertas';

  tray.setToolTip(`ServerTickets - ${stateText}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: `PostgreSQL: ${lastStatus.postgres ? 'Activo' : 'Detenido'}`, enabled: false },
    { label: `Gateway: ${lastStatus.gateway ? 'Activo' : 'Detenido'}`, enabled: false },
    { type: 'separator' },
    { label: 'Reiniciar servidor', click: () => ensureServer() },
    { label: 'Abrir logs', click: () => shell.openPath(logDir()) },
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() }
  ]));
}

async function ensureServer() {
  try {
    lastStatus.message = 'Verificando servidor...';
    updateTray();

    const postgres = await startPostgres();
    const gateway = postgres ? await startGateway() : false;

    lastStatus = {
      postgres,
      gateway,
      message: postgres && gateway ? 'Servidor activo' : 'Servidor con alertas'
    };
    updateTray();
  } catch (error) {
    appendLog('server-tickets.err.log', error.stack || error.message || String(error));
    lastStatus = {
      postgres: false,
      gateway: false,
      message: error.message || 'Error iniciando servidor'
    };
    updateTray();
  }
}

app.whenReady().then(() => {
  app.setName('ServerTickets');
  tray = new Tray(iconImage());
  updateTray();
  ensureServer();
  setInterval(ensureServer, 60000);
});

app.on('window-all-closed', () => {});
