const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const outDir = path.join(root, 'docs', 'manual-usuario-img');
const runtimeDir = path.join(root, '.tmp-manual-screenshots');

fs.mkdirSync(runtimeDir, { recursive: true });
app.setPath('userData', path.join(runtimeDir, 'user-data'));
app.setPath('sessionData', path.join(runtimeDir, 'session-data'));
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disk-cache-dir', path.join(runtimeDir, 'cache'));
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

const captures = [
  {
    file: 'login.html',
    name: '01-login.png',
    width: 700,
    height: 560,
    afterLoad: async win => {
      await win.webContents.executeJavaScript(`
        document.querySelector('#username, input[type="text"], input')?.setAttribute('placeholder', 'admin');
        document.querySelector('#password, input[type="password"]')?.setAttribute('placeholder', 'Ingrese su clave');
      `);
    }
  },
  {
    file: 'index.html',
    name: '02-farodesk-tickets-principal.png',
    width: 1360,
    height: 880,
    afterLoad: async win => {
      await win.webContents.executeJavaScript(`
        document.getElementById('dni').value = '33777444';
        document.getElementById('nombre').value = 'Lucia';
        document.getElementById('apellido').value = 'Martinez';
        document.getElementById('celular').value = '2235550303';
        document.getElementById('email').value = 'lucia.martinez@email.com';
        document.getElementById('falla').value = 'No conecta a WiFi.';
      `);
    }
  },
  {
    file: 'configuracion.html',
    name: '03-configuracion.png',
    width: 1180,
    height: 860
  },
  {
    file: 'abm/clientes.html',
    name: '04-abm-clientes.png',
    width: 1180,
    height: 780,
    afterLoad: async win => {
      await win.webContents.executeJavaScript(`
        document.getElementById('dni').value = '34555666';
        document.getElementById('nombre').value = 'Marina';
        document.getElementById('apellido').value = 'Suarez';
        document.getElementById('celular').value = '2235550808';
        document.getElementById('email').value = 'marina.suarez@email.com';
      `);
    }
  },
  {
    file: 'tickets.html',
    name: '05-tickets-detalle-estados.png',
    width: 1440,
    height: 900,
    afterLoad: async win => {
      await win.webContents.executeJavaScript(`
        document.querySelector('#listaTicketsFull tr:nth-child(1)')?.click();
      `);
    }
  },
  {
    file: 'tickets.html',
    name: '06-presupuesto-ticket.png',
    width: 1440,
    height: 900,
    afterLoad: async win => {
      await win.webContents.executeJavaScript(`
        document.querySelector('#listaTicketsFull tr:nth-child(1)')?.click();
        document.getElementById('btnPresupuestoTicketFull')?.click();
      `);
    }
  },
  {
    file: 'tickets.html',
    name: '07-entregar-ticket-caja.png',
    width: 1440,
    height: 900,
    afterLoad: async win => {
      await win.webContents.executeJavaScript(`
        document.querySelector('#listaTicketsFull tr:nth-child(2)')?.click();
        document.getElementById('btnEntregarTicketFull')?.click();
        document.getElementById('trabajoEntrega').value = 'Cambio de modulo y prueba final.';
        document.getElementById('garantiaEntrega').value = '30';
      `);
    }
  },
  {
    file: 'index-caja.html',
    name: '08-caja-pendientes.png',
    width: 1360,
    height: 840,
    afterLoad: async win => {
      await win.webContents.executeJavaScript(`
        document.querySelector('#tablaPendientes tr:nth-child(1)')?.click();
      `);
    }
  },
  {
    file: 'index-caja.html',
    name: '09-caja-cobrados.png',
    width: 1360,
    height: 840,
    afterLoad: async win => {
      await win.webContents.executeJavaScript(`
        document.getElementById('tabCobrados')?.click();
        document.querySelector('#tablaCobrados tr:nth-child(1)')?.click();
      `);
    }
  }
];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capturePage(item) {
  const win = new BrowserWindow({
    width: item.width,
    height: item.height,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'screenshot-preload.js'),
      contextIsolation: false,
      nodeIntegration: false,
      sandbox: false
    }
  });

  await win.loadFile(path.join(root, item.file));
  await wait(900);
  if (item.afterLoad) {
    await item.afterLoad(win);
    await wait(500);
  }
  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, item.name), image.toPNG());
  win.close();
}

app.whenReady().then(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const capture of captures) {
    await capturePage(capture);
  }
  app.quit();
});
