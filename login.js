document.addEventListener('DOMContentLoaded', async () => {
  const nativeApi = window.api || window.apiCaja;
  const isWebLogin = !nativeApi;
  const api = nativeApi || {
    async login(username, password) {
      const response = await fetch('/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || `Error HTTP ${response.status}`);
      }

      return data;
    },
    async currentSession() {
      const response = await fetch('/auth/me', {
        credentials: 'same-origin'
      });

      if (!response.ok) {
        return null;
      }

      return response.json();
    }
  };
  const form = document.getElementById('loginForm');
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const btnResetAdmin = document.getElementById('btnResetAdmin');
  const loginStatus = document.getElementById('loginStatus');
  const loginAdminInfo = document.getElementById('loginAdminInfo');

  function setStatus(message = '', visible = false) {
    loginStatus.textContent = message;
    loginStatus.classList.toggle('hidden', !visible);
  }

  function setAdminInfo(message = '', visible = false) {
    loginAdminInfo.textContent = message;
    loginAdminInfo.classList.toggle('hidden', !visible);
  }

  async function alert(title, message) {
    if (window.appDialog?.alert) {
      await window.appDialog.alert({ title, message });
      return;
    }

    window.alert(message);
  }

  async function confirm(title, message) {
    if (window.appDialog?.confirm) {
      return window.appDialog.confirm({ title, message });
    }

    return window.confirm(message);
  }

  usernameInput.value = 'admin';

  if (isWebLogin) {
    btnResetAdmin.classList.add('hidden');

    try {
      const session = await api.currentSession();

      if (session?.user) {
        window.location.href = '/admin-panel';
        return;
      }
    } catch (_) {
      // Sin sesion previa.
    }

    setStatus('Ingresa con el usuario administrador del servidor de licencias.', true);
    passwordInput.focus();
  } else {
    try {
      const context = await api.obtenerContextoAdmin();
      await api.bootstrapAdmin(context);
      setStatus('Usuario inicial disponible: admin.', true);
      passwordInput.focus();
    } catch (error) {
      if (String(error.message || '').includes('No autorizado')) {
        setStatus('Usuario administrador disponible. Ingrese la clave para continuar.', true);
      } else {
        setStatus(error.message || 'No se pudo preparar el usuario administrador.', true);
      }
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    setAdminInfo('', false);

    try {
      await api.login(usernameInput.value, passwordInput.value);
      if (isWebLogin) {
        window.location.href = '/admin-panel';
      }
    } catch (error) {
      await alert('No se pudo iniciar sesion', error.message || 'Usuario o clave invalidos.');
      passwordInput.focus();
      passwordInput.select();
    }
  });

  btnResetAdmin.addEventListener('click', async () => {
    const confirmed = await confirm(
      'Restablecer clave',
      'Esto restablece la clave del usuario administrador segun la formula del cliente. Continuar?'
    );

    if (!confirmed) {
      return;
    }

    try {
      const context = await api.obtenerContextoAdmin();
      const result = await api.restablecerClaveAdmin(context);
      setAdminInfo(`Usuario: ${result.username} | Clave: ${result.password}`, true);
      usernameInput.value = result.username || 'admin';
      passwordInput.value = result.password || '';
      await alert('Clave restablecida', `Usuario: ${result.username}\nClave: ${result.password}`);
    } catch (error) {
      await alert('No se pudo restablecer', error.message || 'No se pudo restablecer la clave del administrador.');
    }
  });
});
