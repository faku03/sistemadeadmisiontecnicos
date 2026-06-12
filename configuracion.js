document.addEventListener('DOMContentLoaded', async () => {
  const tabs = Array.from(document.querySelectorAll('.config-tab'));
  const panels = Array.from(document.querySelectorAll('.config-panel'));
  const btnGuardar = document.getElementById('btnGuardarConfiguracion');
  const btnCerrar = document.getElementById('btnCerrarConfiguracion');
  const btnSeleccionarLogoPdf = document.getElementById('btnSeleccionarLogoPdf');
  const btnProbarPdfConfiguracion = document.getElementById('btnProbarPdfConfiguracion');
  const btnEditarUrls = document.getElementById('btnEditarUrls');
  const tabUsuarios = document.getElementById('tabUsuarios');
  const usuariosBody = document.getElementById('usuariosBody');
  const usuariosStatus = document.getElementById('usuariosStatus');
  const usuariosSearch = document.getElementById('usuariosSearch');
  const usuariosSeleccionInfo = document.getElementById('usuariosSeleccionInfo');
  const btnRefrescarUsuarios = document.getElementById('btnRefrescarUsuarios');
  const btnAbrirAltaUsuario = document.getElementById('btnAbrirAltaUsuario');
  const btnEditarUsuario = document.getElementById('btnEditarUsuario');
  const btnDesactivarUsuario = document.getElementById('btnDesactivarUsuario');
  const btnReactivarUsuario = document.getElementById('btnReactivarUsuario');
  const btnGestionClavesUsuario = document.getElementById('btnGestionClavesUsuario');
  const usuarioModal = document.getElementById('usuarioModal');
  const formUsuario = document.getElementById('formUsuario');
  const btnCancelarUsuarioModal = document.getElementById('btnCancelarUsuarioModal');
  const usuarioModalTitulo = document.getElementById('usuarioModalTitulo');
  const usuarioClaveModal = document.getElementById('usuarioClaveModal');
  const formUsuarioClave = document.getElementById('formUsuarioClave');
  const usuarioClaveInfo = document.getElementById('usuarioClaveInfo');
  const btnCancelarResetClave = document.getElementById('btnCancelarResetClave');
  const gestionClavesModal = document.getElementById('gestionClavesModal');
  const gestionClavesAuth = document.getElementById('gestionClavesAuth');
  const gestionClavesContenido = document.getElementById('gestionClavesContenido');
  const gestionClavesAuthStatus = document.getElementById('gestionClavesAuthStatus');
  const gestionClavesBody = document.getElementById('gestionClavesBody');
  const gestionClavesSearch = document.getElementById('gestionClavesSearch');
  const gestionClavesSeleccionInfo = document.getElementById('gestionClavesSeleccionInfo');
  const gestionClavesStatus = document.getElementById('gestionClavesStatus');
  const cfgAdminPasswordConfirm = document.getElementById('cfgAdminPasswordConfirm');
  const btnValidarClaveAdmin = document.getElementById('btnValidarClaveAdmin');
  const btnClaveManual = document.getElementById('btnClaveManual');
  const btnClaveTemporal = document.getElementById('btnClaveTemporal');
  const btnCerrarGestionClaves = document.getElementById('btnCerrarGestionClaves');
  const btnVerAuditoriaUsuarios = document.getElementById('btnVerAuditoriaUsuarios');
  const auditoriaUsuariosModal = document.getElementById('auditoriaUsuariosModal');
  const auditoriaUsuariosBody = document.getElementById('auditoriaUsuariosBody');
  const btnCerrarAuditoriaUsuarios = document.getElementById('btnCerrarAuditoriaUsuarios');

  let urlsEditables = false;
  let usuarioActual = null;
  let usuariosCache = [];
  let usuarioSeleccionadoId = null;
  let usuarioClaveSeleccionadoId = null;
  let adminClaveValidada = false;
  let usuarioEditandoId = null;

  const fields = {
    sucursalId: document.getElementById('cfgSucursalId'),
    sucursalNombre: document.getElementById('cfgSucursalNombre'),
    pdfBusinessStreet: document.getElementById('cfgPdfBusinessStreet'),
    pdfBusinessLocality: document.getElementById('cfgPdfBusinessLocality'),
    pdfBusinessProvince: document.getElementById('cfgPdfBusinessProvince'),
    pdfBusinessPhone: document.getElementById('cfgPdfBusinessPhone'),
    pdfBusinessEmail: document.getElementById('cfgPdfBusinessEmail'),
    businessTaxId: document.getElementById('cfgBusinessTaxId'),
    businessContactName: document.getElementById('cfgBusinessContactName'),
    businessMobile: document.getElementById('cfgBusinessMobile'),
    dateFormat: document.getElementById('cfgDateFormat'),
    currencyCode: document.getElementById('cfgCurrencyCode'),
    currencyFormat: document.getElementById('cfgCurrencyFormat'),
    pdfBusinessName: document.getElementById('cfgPdfBusinessName'),
    pdfLogoPath: document.getElementById('cfgPdfLogoPath'),
    outputPath: document.getElementById('cfgOutputPath'),
    alertPendingDays: document.getElementById('cfgAlertPendingDays'),
    alertRepairDays: document.getElementById('cfgAlertRepairDays'),
    alertBudgetDays: document.getElementById('cfgAlertBudgetDays'),
    alertReadyDays: document.getElementById('cfgAlertReadyDays'),
    apiUrl: document.getElementById('cfgApiUrl'),
    licenseMode: document.getElementById('cfgLicenseMode'),
    licenseServerUrl: document.getElementById('cfgLicenseServerUrl'),
    licenseSupportWhatsApp: document.getElementById('cfgLicenseSupportWhatsApp'),
    licenseSupportEmail: document.getElementById('cfgLicenseSupportEmail'),
    licenseKey: document.getElementById('cfgLicenseKey'),
    licenseGroupId: document.getElementById('cfgLicenseGroupId'),
    licenseUnitId: document.getElementById('cfgLicenseUnitId'),
    licenseUnitType: document.getElementById('cfgLicenseUnitType')
  };

  const userFormFields = {
    username: document.getElementById('cfgUserUsername'),
    displayName: document.getElementById('cfgUserDisplayName'),
    password: document.getElementById('cfgUserPassword'),
    role: document.getElementById('cfgUserRole')
  };

  const resetPasswordFields = {
    password: document.getElementById('cfgResetUserPassword')
  };

  function mostrarAlerta(title, message) {
    return window.appDialog?.alert({ title, message }) || Promise.resolve(alert(message));
  }

  function mostrarConfirmacion(title, message) {
    return window.appDialog?.confirm({ title, message }) || Promise.resolve(confirm(message));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setUsuariosStatus(message = '', visible = false) {
    usuariosStatus.textContent = message;
    usuariosStatus.classList.toggle('hidden', !visible);
  }

  function setGestionClavesStatus(message = '', visible = false) {
    gestionClavesStatus.textContent = message;
    gestionClavesStatus.classList.toggle('hidden', !visible);
  }

  function setGestionClavesAuthStatus(message = '', visible = false) {
    gestionClavesAuthStatus.textContent = message;
    gestionClavesAuthStatus.classList.toggle('hidden', !visible);
  }

  function normalizarNumero(valor, defecto) {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero > 0 ? Math.floor(numero) : defecto;
  }

  function esUrlValida(valor) {
    if (!valor) return true;
    try {
      const url = new URL(valor);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  function emailValido(valor) {
    if (!valor) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
  }

  function activarTab(tab) {
    tabs.forEach(item => item.classList.toggle('is-active', item.dataset.tab === tab));
    panels.forEach(panel => panel.classList.toggle('hidden', panel.dataset.panel !== tab));
  }

  function formatearFechaHora(value) {
    if (!value) return '-';

    try {
      return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(new Date(value));
    } catch {
      return String(value);
    }
  }

  function usuarioSeleccionado() {
    return usuariosCache.find(usuario => String(usuario.id) === String(usuarioSeleccionadoId)) || null;
  }

  function usuarioClaveSeleccionado() {
    return usuariosCache.find(usuario => String(usuario.id) === String(usuarioClaveSeleccionadoId)) || null;
  }

  function actualizarBotonesUsuarios() {
    const seleccionado = usuarioSeleccionado();
    const esAdminPropio = seleccionado && usuarioActual && seleccionado.username === usuarioActual.username;
    const activo = Boolean(seleccionado?.is_active);

    usuariosSeleccionInfo.textContent = seleccionado
      ? `${seleccionado.display_name || seleccionado.displayName || seleccionado.username} (${seleccionado.role})`
      : 'Seleccione un usuario para operar.';

    btnDesactivarUsuario.disabled = !seleccionado || !activo || esAdminPropio;
    btnReactivarUsuario.disabled = !seleccionado || activo;
    btnEditarUsuario.disabled = !seleccionado;
    btnGestionClavesUsuario.disabled = false;
  }

  function actualizarBotonesGestionClaves() {
    const seleccionado = usuarioClaveSeleccionado();
    gestionClavesSeleccionInfo.textContent = seleccionado
      ? `${seleccionado.display_name || seleccionado.displayName || seleccionado.username} (${seleccionado.role})`
      : 'Seleccione un usuario para operar.';

    btnClaveManual.disabled = !adminClaveValidada || !seleccionado;
    btnClaveTemporal.disabled = !adminClaveValidada || !seleccionado;
  }

  function usuariosFiltrados() {
    const term = String(usuariosSearch?.value || '').trim().toLowerCase();
    if (!term) return usuariosCache;

    return usuariosCache.filter(usuario => {
      const username = String(usuario.username || '').toLowerCase();
      const name = String(usuario.display_name || usuario.displayName || '').toLowerCase();
      return username.includes(term) || name.includes(term);
    });
  }

  function renderUsuarios() {
    const usuarios = usuariosFiltrados();

    if (!usuarios.length) {
      usuariosBody.innerHTML = '<tr><td colspan="5" class="muted">No hay usuarios para mostrar.</td></tr>';
      return;
    }

    usuariosBody.innerHTML = usuarios.map(usuario => {
      const selectedClass = String(usuario.id) === String(usuarioSeleccionadoId) ? 'selected-row' : '';
      return `
        <tr class="${selectedClass}" data-user-id="${usuario.id}">
          <td>${escapeHtml(usuario.username)}</td>
          <td>${escapeHtml(usuario.display_name || usuario.displayName || '')}</td>
          <td>${escapeHtml(usuario.role || '')}</td>
          <td>${usuario.is_active ? 'Activo' : 'Inactivo'}</td>
          <td>${escapeHtml(formatearFechaHora(usuario.last_login_at || usuario.lastLoginAt))}</td>
        </tr>
      `;
    }).join('');

    usuariosBody.querySelectorAll('tr[data-user-id]').forEach(row => {
      row.addEventListener('click', () => {
        usuarioSeleccionadoId = row.dataset.userId;
        renderUsuarios();
        actualizarBotonesUsuarios();
      });
    });
  }

  function renderUsuariosClave() {
    if (!gestionClavesBody) return;

    const filtro = String(gestionClavesSearch?.value || '').trim().toLowerCase();
    const rows = usuariosCache.filter(usuario => {
      if (!filtro) return true;
      const username = String(usuario.username || '').toLowerCase();
      const displayName = String(usuario.display_name || usuario.displayName || '').toLowerCase();
      return username.includes(filtro) || displayName.includes(filtro);
    });

    if (!rows.length) {
      gestionClavesBody.innerHTML = `
        <tr>
          <td colspan="5" class="muted">No se encontraron usuarios.</td>
        </tr>
      `;
      usuarioClaveSeleccionadoId = null;
      actualizarBotonesGestionClaves();
      return;
    }

    gestionClavesBody.innerHTML = rows.map(usuario => {
      const displayName = usuario.display_name || usuario.displayName || usuario.username;
      const lastLogin = formatearFechaHora(usuario.last_login_at || usuario.lastLoginAt);
      const selected = String(usuario.id) === String(usuarioClaveSeleccionadoId);

      return `
        <tr data-user-id="${usuario.id}" class="${selected ? 'selected-row' : ''}">
          <td>${escapeHtml(usuario.username)}</td>
          <td>${escapeHtml(displayName)}</td>
          <td>${escapeHtml(usuario.role)}</td>
          <td>${usuario.is_active ? 'Activo' : 'Inactivo'}</td>
          <td>${escapeHtml(lastLogin)}</td>
        </tr>
      `;
    }).join('');

    gestionClavesBody.querySelectorAll('tr[data-user-id]').forEach(row => {
      row.addEventListener('click', () => {
        usuarioClaveSeleccionadoId = row.dataset.userId;
        renderUsuariosClave();
        actualizarBotonesGestionClaves();
      });
    });

    actualizarBotonesGestionClaves();
  }

  async function abrirAuditoriaUsuarios() {
    auditoriaUsuariosModal.classList.remove('hidden');
    auditoriaUsuariosBody.innerHTML = '<tr><td colspan="4" class="muted">Cargando auditoria...</td></tr>';

    try {
      const rows = await window.api.listarAuditoriaUsuarios(100);
      if (!rows.length) {
        auditoriaUsuariosBody.innerHTML = '<tr><td colspan="4" class="muted">No hay movimientos para mostrar.</td></tr>';
        return;
      }

      auditoriaUsuariosBody.innerHTML = rows.map(row => `
        <tr>
          <td>${escapeHtml(formatearFechaHora(row.created_at || row.createdAt))}</td>
          <td>${escapeHtml(row.username || '-')}</td>
          <td>${escapeHtml(row.action || '-')}</td>
          <td>${escapeHtml(row.result || '-')}</td>
        </tr>
      `).join('');
    } catch (error) {
      auditoriaUsuariosBody.innerHTML = `<tr><td colspan="4" class="muted">${escapeHtml(error.message || 'No se pudo cargar la auditoria.')}</td></tr>`;
    }
  }

  function cerrarAuditoriaUsuarios() {
    auditoriaUsuariosModal.classList.add('hidden');
  }

  async function cargarUsuarios() {
    if (!usuarioActual || usuarioActual.role !== 'ADMIN') {
      return;
    }

    usuariosBody.innerHTML = '<tr><td colspan="5" class="muted">Cargando usuarios...</td></tr>';

    try {
      usuariosCache = await window.api.listarUsuarios();

      if (usuarioSeleccionadoId && !usuarioSeleccionado()) {
        usuarioSeleccionadoId = null;
      }

      renderUsuarios();
      actualizarBotonesUsuarios();
    } catch (error) {
      usuariosBody.innerHTML = '<tr><td colspan="5" class="muted">No se pudieron cargar los usuarios.</td></tr>';
      setUsuariosStatus(error.message || 'No se pudieron cargar los usuarios.', true);
    }
  }

  function abrirModalUsuario() {
    formUsuario.reset();
    usuarioEditandoId = null;
    usuarioModalTitulo.textContent = 'Alta de usuario';
    userFormFields.username.disabled = false;
    userFormFields.role.value = 'OPERADOR';
    userFormFields.password.closest('.field-label').classList.remove('hidden');
    document.getElementById('btnCrearUsuario').textContent = 'Crear usuario';
    usuarioModal.classList.remove('hidden');
    userFormFields.username.focus();
  }

  function abrirModalEditarUsuario(usuario) {
    if (!usuario) return;

    usuarioEditandoId = usuario.id;
    usuarioModalTitulo.textContent = 'Editar usuario';
    userFormFields.username.value = usuario.username || '';
    userFormFields.username.disabled = true;
    userFormFields.displayName.value = usuario.display_name || usuario.displayName || '';
    userFormFields.password.value = '';
    userFormFields.role.value = usuario.role || 'OPERADOR';
    userFormFields.password.closest('.field-label').classList.add('hidden');
    document.getElementById('btnCrearUsuario').textContent = 'Guardar cambios';
    usuarioModal.classList.remove('hidden');
    userFormFields.displayName.focus();
  }

  function cerrarModalUsuario() {
    usuarioEditandoId = null;
    userFormFields.username.disabled = false;
    userFormFields.password.closest('.field-label').classList.remove('hidden');
    document.getElementById('btnCrearUsuario').textContent = 'Crear usuario';
    usuarioModal.classList.add('hidden');
  }

  function abrirModalResetClave(usuario) {
    if (!usuario) return;

    formUsuarioClave?.reset();
    usuarioClaveInfo.textContent = `Nueva clave para ${usuario.display_name || usuario.displayName || usuario.username}.`;
    usuarioClaveModal.classList.add('modal-overlay-top');
    usuarioClaveModal.classList.remove('hidden');
    resetPasswordFields.password.focus();
  }

  function cerrarModalResetClave() {
    usuarioClaveModal.classList.add('hidden');
    usuarioClaveModal.classList.remove('modal-overlay-top');
  }

  function abrirGestionClaves() {
    adminClaveValidada = false;
    usuarioClaveSeleccionadoId = usuarioSeleccionadoId;
    cfgAdminPasswordConfirm.value = '';
    setGestionClavesAuthStatus('', false);
    setGestionClavesStatus('', false);
    gestionClavesAuth.classList.remove('hidden');
    gestionClavesContenido.classList.add('hidden');
    renderUsuariosClave();
    gestionClavesModal.classList.remove('hidden');
    cfgAdminPasswordConfirm.focus();
  }

  function cerrarGestionClaves() {
    gestionClavesModal.classList.add('hidden');
    adminClaveValidada = false;
    usuarioClaveSeleccionadoId = null;
    setGestionClavesAuthStatus('', false);
    setGestionClavesStatus('', false);
  }

  function cargar(config) {
    if (!config.pdfBusinessStreet && config.pdfBusinessAddress) {
      fields.pdfBusinessStreet.value = config.pdfBusinessAddress;
    }

    Object.entries(fields).forEach(([key, field]) => {
      if (key === 'pdfBusinessStreet' && field.value) {
        return;
      }
      field.value = config[key] ?? '';
    });
  }

  function aplicarBloqueoUrls() {
    fields.apiUrl.readOnly = !urlsEditables;
    fields.licenseServerUrl.readOnly = !urlsEditables;
    btnEditarUrls.textContent = urlsEditables ? 'Bloquear URLs' : 'Editar URLs';
  }

  function leer() {
    return {
      sucursalId: fields.sucursalId.value.trim(),
      sucursalNombre: fields.sucursalNombre.value.trim(),
      pdfBusinessStreet: fields.pdfBusinessStreet.value.trim(),
      pdfBusinessLocality: fields.pdfBusinessLocality.value.trim(),
      pdfBusinessProvince: fields.pdfBusinessProvince.value.trim(),
      pdfBusinessAddress: [
        fields.pdfBusinessStreet.value.trim(),
        [fields.pdfBusinessLocality.value.trim(), fields.pdfBusinessProvince.value.trim()].filter(Boolean).join(', ')
      ].filter(Boolean).join(' - '),
      pdfBusinessPhone: fields.pdfBusinessPhone.value.trim(),
      pdfBusinessEmail: fields.pdfBusinessEmail.value.trim(),
      businessTaxId: fields.businessTaxId.value.trim(),
      businessContactName: fields.businessContactName.value.trim(),
      businessMobile: fields.businessMobile.value.trim(),
      dateFormat: fields.dateFormat.value,
      currencyCode: fields.currencyCode.value,
      currencyFormat: fields.currencyFormat.value,
      pdfBusinessName: fields.pdfBusinessName.value.trim(),
      pdfLogoPath: fields.pdfLogoPath.value.trim(),
      outputPath: fields.outputPath.value.trim(),
      alertPendingDays: normalizarNumero(fields.alertPendingDays.value, 2),
      alertRepairDays: normalizarNumero(fields.alertRepairDays.value, 5),
      alertBudgetDays: normalizarNumero(fields.alertBudgetDays.value, 3),
      alertReadyDays: normalizarNumero(fields.alertReadyDays.value, 7),
      apiUrl: fields.apiUrl.value.trim(),
      licenseMode: fields.licenseMode.value,
      licenseServerUrl: fields.licenseServerUrl.value.trim(),
      licenseSupportWhatsApp: fields.licenseSupportWhatsApp.value.trim(),
      licenseSupportEmail: fields.licenseSupportEmail.value.trim(),
      licenseKey: fields.licenseKey.value.trim(),
      licenseGroupId: fields.licenseGroupId.value.trim(),
      licenseUnitId: fields.licenseUnitId.value.trim(),
      licenseUnitType: fields.licenseUnitType.value
    };
  }

  async function validar(config) {
    if (!esUrlValida(config.apiUrl)) {
      await mostrarAlerta('URL invalida', 'La URL del gateway / API no es valida.');
      activarTab('licencia');
      fields.apiUrl.focus();
      return false;
    }

    if (!esUrlValida(config.licenseServerUrl)) {
      await mostrarAlerta('URL invalida', 'La URL del servidor de licencias no es valida.');
      activarTab('licencia');
      fields.licenseServerUrl.focus();
      return false;
    }

    if (!emailValido(config.pdfBusinessEmail)) {
      await mostrarAlerta('Email invalido', 'El email del negocio no tiene un formato valido.');
      activarTab('general');
      fields.pdfBusinessEmail.focus();
      return false;
    }

    if (!emailValido(config.licenseSupportEmail)) {
      await mostrarAlerta('Email invalido', 'El email de soporte no tiene un formato valido.');
      activarTab('licencia');
      fields.licenseSupportEmail.focus();
      return false;
    }

    return true;
  }

  tabs.forEach(tab => tab.addEventListener('click', () => activarTab(tab.dataset.tab)));
  btnCerrar.addEventListener('click', () => window.close());
  btnGuardar.addEventListener('click', async () => {
    const config = leer();
    if (!(await validar(config))) {
      return;
    }
    await window.api.guardarConfiguracion(config);
    await mostrarAlerta('Configuracion guardada', 'Los cambios fueron guardados correctamente.');
  });

  btnSeleccionarLogoPdf?.addEventListener('click', async () => {
    const selected = await window.api.seleccionarLogoPdf();
    if (selected) {
      fields.pdfLogoPath.value = selected;
    }
  });

  btnProbarPdfConfiguracion?.addEventListener('click', async () => {
    const config = leer();
    if (!(await validar(config))) {
      return;
    }

    const ruta = await window.api.probarPdfConfiguracion(config);
    await mostrarAlerta('Vista previa generada', `El PDF de prueba se genero en:\n${ruta}`);
  });

  btnEditarUrls?.addEventListener('click', async () => {
    if (urlsEditables) {
      urlsEditables = false;
      aplicarBloqueoUrls();
      return;
    }

    const clave = window.prompt('Ingrese la clave para editar las URLs:', '');
    if (clave !== 'mardelurl') {
      await mostrarAlerta('Clave incorrecta', 'La clave para editar las URLs no es correcta.');
      return;
    }

    urlsEditables = true;
    aplicarBloqueoUrls();
    fields.apiUrl.focus();
  });

  usuariosSearch?.addEventListener('input', () => {
    renderUsuarios();
    actualizarBotonesUsuarios();
  });

  gestionClavesSearch?.addEventListener('input', () => {
    renderUsuariosClave();
    actualizarBotonesGestionClaves();
  });

  btnRefrescarUsuarios?.addEventListener('click', () => {
    setUsuariosStatus('', false);
    cargarUsuarios();
  });

  btnAbrirAltaUsuario?.addEventListener('click', () => {
    setUsuariosStatus('', false);
    abrirModalUsuario();
  });

  btnEditarUsuario?.addEventListener('click', () => {
    const usuario = usuarioSeleccionado();
    if (!usuario) return;
    setUsuariosStatus('', false);
    abrirModalEditarUsuario(usuario);
  });

  btnGestionClavesUsuario?.addEventListener('click', () => {
    setUsuariosStatus('', false);
    abrirGestionClaves();
  });

  btnVerAuditoriaUsuarios?.addEventListener('click', () => {
    setUsuariosStatus('', false);
    abrirAuditoriaUsuarios();
  });

  btnCancelarUsuarioModal?.addEventListener('click', cerrarModalUsuario);

  usuarioModal?.addEventListener('click', event => {
    if (event.target === usuarioModal) {
      cerrarModalUsuario();
    }
  });

  btnCancelarResetClave?.addEventListener('click', cerrarModalResetClave);

  usuarioClaveModal?.addEventListener('click', event => {
    if (event.target === usuarioClaveModal) {
      cerrarModalResetClave();
    }
  });

  btnCerrarGestionClaves?.addEventListener('click', cerrarGestionClaves);

  gestionClavesModal?.addEventListener('click', event => {
    if (event.target === gestionClavesModal) {
      cerrarGestionClaves();
    }
  });

  btnCerrarAuditoriaUsuarios?.addEventListener('click', cerrarAuditoriaUsuarios);

  auditoriaUsuariosModal?.addEventListener('click', event => {
    if (event.target === auditoriaUsuariosModal) {
      cerrarAuditoriaUsuarios();
    }
  });

  btnValidarClaveAdmin?.addEventListener('click', async () => {
    const password = String(cfgAdminPasswordConfirm.value || '').trim();
    if (!password) {
      await mostrarAlerta('Clave requerida', 'Ingrese la clave del administrador.');
      return;
    }

    try {
      await window.api.verificarClaveAdmin(password);
      adminClaveValidada = true;
      gestionClavesAuth.classList.add('hidden');
      gestionClavesContenido.classList.remove('hidden');
      setGestionClavesAuthStatus('', false);
      renderUsuariosClave();
      actualizarBotonesGestionClaves();
      setGestionClavesStatus('Clave de administrador verificada.', true);
    } catch (error) {
      adminClaveValidada = false;
      setGestionClavesAuthStatus(error.message || 'No se pudo validar la clave.', true);
    }
  });

  formUsuario?.addEventListener('submit', async event => {
    event.preventDefault();

    const username = userFormFields.username.value.trim();
    const displayName = userFormFields.displayName.value.trim();
    const password = userFormFields.password.value;
    const role = userFormFields.role.value;

    if (!username || !displayName || (!usuarioEditandoId && !password)) {
      await mostrarAlerta('Datos incompletos', 'Usuario y nombre visible son obligatorios. La clave es obligatoria en el alta.');
      return;
    }

    try {
      const isEdit = Boolean(usuarioEditandoId);
      if (usuarioEditandoId) {
        await window.api.actualizarUsuario({
          id: usuarioEditandoId,
          displayName,
          role
        });
      } else {
        await window.api.crearUsuario({
          username,
          displayName,
          password,
          role
        });
      }

      cerrarModalUsuario();
      setUsuariosStatus(isEdit ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.', true);
      await cargarUsuarios();
    } catch (error) {
      await mostrarAlerta(
        usuarioEditandoId ? 'No se pudo actualizar' : 'No se pudo crear',
        error.message || (usuarioEditandoId ? 'No se pudo actualizar el usuario.' : 'No se pudo crear el usuario.')
      );
    }
  });

  btnDesactivarUsuario?.addEventListener('click', async () => {
    const usuario = usuarioSeleccionado();
    if (!usuario) return;

    const confirmed = await mostrarConfirmacion(
      'Desactivar usuario',
      `Se desactivara el usuario ${usuario.username}. Continuar?`
    );

    if (!confirmed) return;

    try {
      await window.api.actualizarEstadoUsuario(usuario.id, false);
      setUsuariosStatus('Usuario desactivado correctamente.', true);
      await cargarUsuarios();
    } catch (error) {
      await mostrarAlerta('No se pudo desactivar', error.message || 'No se pudo desactivar el usuario.');
    }
  });

  btnReactivarUsuario?.addEventListener('click', async () => {
    const usuario = usuarioSeleccionado();
    if (!usuario) return;

    try {
      await window.api.actualizarEstadoUsuario(usuario.id, true);
      setUsuariosStatus('Usuario reactivado correctamente.', true);
      await cargarUsuarios();
    } catch (error) {
      await mostrarAlerta('No se pudo reactivar', error.message || 'No se pudo reactivar el usuario.');
    }
  });

  btnClaveManual?.addEventListener('click', async () => {
    const usuario = usuarioClaveSeleccionado();
    if (!usuario) return;

    abrirModalResetClave(usuario);
  });

  btnClaveTemporal?.addEventListener('click', async () => {
    const usuario = usuarioClaveSeleccionado();
    if (!usuario) return;

    const nuevaClave = `TMP${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString().slice(-4)}`;

    try {
      await window.api.restablecerClaveUsuario(usuario.id, nuevaClave);
      setGestionClavesStatus(`Se genero una clave temporal para ${usuario.username}.`, true);
      await mostrarAlerta('Clave temporal generada', `La nueva clave temporal de ${usuario.username} es:\n${nuevaClave}`);
    } catch (error) {
      await mostrarAlerta('No se pudo generar', error.message || 'No se pudo generar la clave temporal.');
    }
  });

  formUsuarioClave?.addEventListener('submit', async event => {
    event.preventDefault();

    const usuario = usuarioClaveSeleccionado();
    if (!usuario) {
      cerrarModalResetClave();
      return;
    }

    const nuevaClave = resetPasswordFields.password.value.trim();
    if (!nuevaClave) {
      await mostrarAlerta('Clave requerida', 'Ingrese una nueva clave para continuar.');
      return;
    }

    try {
      await window.api.restablecerClaveUsuario(usuario.id, nuevaClave);
      cerrarModalResetClave();
      setUsuariosStatus(`La clave de ${usuario.username} fue actualizada.`, true);
      await mostrarAlerta('Clave restablecida', `La nueva clave de ${usuario.username} fue actualizada.`);
    } catch (error) {
      await mostrarAlerta('No se pudo restablecer', error.message || 'No se pudo restablecer la clave.');
    }
  });

  cargar(await window.api.obtenerConfiguracion());
  usuarioActual = await window.api.obtenerUsuarioActual();

  if (usuarioActual?.role === 'ADMIN') {
    tabUsuarios?.classList.remove('hidden');
    await cargarUsuarios();
  }

  aplicarBloqueoUrls();
  actualizarBotonesUsuarios();
  activarTab('general');
});
