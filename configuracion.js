document.addEventListener('DOMContentLoaded', async () => {
  const tabs = Array.from(document.querySelectorAll('.config-tab'));
  const panels = Array.from(document.querySelectorAll('.config-panel'));
  const btnGuardar = document.getElementById('btnGuardarConfiguracion');
  const btnCerrar = document.getElementById('btnCerrarConfiguracion');
  const btnSeleccionarLogoPdf = document.getElementById('btnSeleccionarLogoPdf');
  const btnProbarPdfConfiguracion = document.getElementById('btnProbarPdfConfiguracion');
  const btnEditarUrls = document.getElementById('btnEditarUrls');
  let urlsEditables = false;

  const fields = {
    sucursalId: document.getElementById('cfgSucursalId'),
    sucursalNombre: document.getElementById('cfgSucursalNombre'),
    pdfBusinessStreet: document.getElementById('cfgPdfBusinessStreet'),
    pdfBusinessLocality: document.getElementById('cfgPdfBusinessLocality'),
    pdfBusinessProvince: document.getElementById('cfgPdfBusinessProvince'),
    pdfBusinessPhone: document.getElementById('cfgPdfBusinessPhone'),
    pdfBusinessEmail: document.getElementById('cfgPdfBusinessEmail'),
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

  function mostrarAlerta(title, message) {
    return window.appDialog?.alert({ title, message }) || Promise.resolve(alert(message));
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

  cargar(await window.api.obtenerConfiguracion());
  aplicarBloqueoUrls();
  activarTab('general');
});
