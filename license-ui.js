(function () {
  const writeSelectors = [
    '#btnGuardar',
    '#guardar',
    '#confirmarEntrega',
    '#btnGuardarPresupuesto',
    '#btnEnviarPresupuesto',
    '#btnDevolver',
    '#btnCobrarSeleccionado',
    '.btn-cobrar',
    '.btn-entregar',
    '.btn-presupuesto',
    '.combo-estado'
  ];

  let currentConfig = null;
  let currentStatus = null;

  function getApi() {
    return window.api || window.apiCaja;
  }

  function showAlert(title, message) {
    if (window.appDialog?.alert) {
      return window.appDialog.alert({ title, message });
    }

    alert(message);
    return Promise.resolve();
  }

  async function resolveStatusForAction() {
    if (currentStatus) {
      return currentStatus;
    }

    const api = getApi();
    if (!api?.obtenerEstadoLicencia) {
      return {};
    }

    try {
      currentStatus = await api.obtenerEstadoLicencia();
      return currentStatus;
    } catch (_) {
      return {};
    }
  }

  function bindTopActions() {
    const requestBtn = document.getElementById('licenseTopRequestBtn');
    const openBtn = document.getElementById('licenseTopOpenBtn');

    if (requestBtn && !requestBtn.dataset.boundLicenseUi) {
      requestBtn.dataset.boundLicenseUi = 'true';
      requestBtn.addEventListener('click', async () => {
        requestLicense(await resolveStatusForAction());
      });
    }

    if (openBtn && !openBtn.dataset.boundLicenseUi) {
      openBtn.dataset.boundLicenseUi = 'true';
      openBtn.addEventListener('click', async () => {
        openActivationModal(await resolveStatusForAction());
      });
    }
  }

  function ensureBanner() {
    let banner = document.getElementById('licenseBanner');

    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'licenseBanner';
      banner.className = 'license-banner hidden';
      document.body.prepend(banner);
    }

    return banner;
  }

  function ensureModal() {
    let modal = document.getElementById('licenseModal');

    if (modal) {
      return modal;
    }

    modal = document.createElement('div');
    modal.id = 'licenseModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content license-modal-content">
        <h3>Activar licencia</h3>
        <p class="muted" id="licenseModalText">
          Ingresa la clave asignada a esta sucursal o tecnico.
        </p>
        <input id="licenseKeyInput" placeholder="XXXX-XXXX-XXXX">
        <div class="license-meta" id="licenseMeta"></div>
        <div class="modal-actions">
          <button id="licenseRequestBtn">Solicitar licencia</button>
          <button id="licenseSaveBtn">Activar</button>
          <button id="licenseCancelBtn">Cancelar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#licenseCancelBtn').onclick = () => {
      modal.classList.add('hidden');
    };

    modal.addEventListener('click', event => {
      if (event.target === modal) {
        modal.classList.add('hidden');
      }
    });

    return modal;
  }

  function ensureRequestModal() {
    let modal = document.getElementById('licenseRequestModal');

    if (modal) {
      return modal;
    }

    modal = document.createElement('div');
    modal.id = 'licenseRequestModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content license-request-modal-content">
        <h3>Solicitar licencia</h3>
        <p class="muted">
          Completa los datos del titular y del pago. El sistema arma el mensaje para enviar a soporte.
        </p>
        <div class="license-request-grid">
          <label class="field-label">Nombre completo / razon social
            <input id="licenseReqName" type="text" placeholder="Nombre completo o razon social">
          </label>
          <label class="field-label">CUIT / CUIL
            <input id="licenseReqTaxId" type="text" placeholder="CUIT o CUIL">
          </label>
          <label class="field-label full-row">Direccion
            <input id="licenseReqAddress" type="text" placeholder="Calle, numero, localidad y provincia">
          </label>
          <label class="field-label">Email
            <input id="licenseReqEmail" type="email" placeholder="email@cliente.com">
          </label>
          <label class="field-label">Celular
            <input id="licenseReqPhone" type="text" placeholder="223...">
          </label>
          <label class="field-label full-row">Comprobante de pago
            <textarea id="licenseReqPayment" placeholder="Adjunto comprobante / numero de operacion / detalle de la transferencia"></textarea>
          </label>
        </div>
        <div class="license-meta" id="licenseRequestMeta"></div>
        <div class="modal-actions">
          <button id="licenseRequestNextBtn">Aceptar</button>
          <button id="licenseRequestCloseBtn">Cerrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#licenseRequestCloseBtn').onclick = () => {
      modal.classList.add('hidden');
    };

    modal.addEventListener('click', event => {
      if (event.target === modal) {
        modal.classList.add('hidden');
      }
    });

    return modal;
  }

  function ensureRequestPreviewModal() {
    let modal = document.getElementById('licenseRequestPreviewModal');

    if (modal) {
      return modal;
    }

    modal = document.createElement('div');
    modal.id = 'licenseRequestPreviewModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content license-preview-modal-content">
        <div class="license-preview-header">
          <h3>Solicitud de licencia</h3>
          <p class="muted">
            Revisa los datos y elegi como enviar la solicitud.
          </p>
        </div>
        <pre id="licenseRequestPreviewText" class="license-request-preview"></pre>
        <div class="license-preview-actions">
          <div class="license-preview-primary-actions">
            <button id="licensePreviewOnlineBtn" class="license-primary-action">Enviar online</button>
          </div>
          <div class="license-preview-secondary-actions">
            <button id="licensePreviewWhatsappBtn">WhatsApp</button>
            <button id="licensePreviewEmailBtn">Email</button>
            <button id="licensePreviewCopyBtn">Copiar</button>
            <button id="licensePreviewTxtBtn">Guardar TXT</button>
            <button id="licensePreviewBackBtn">Corregir</button>
            <button id="licensePreviewCloseBtn">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#licensePreviewCloseBtn').onclick = () => {
      modal.classList.add('hidden');
    };

    modal.addEventListener('click', event => {
      if (event.target === modal) {
        modal.classList.add('hidden');
      }
    });

    return modal;
  }

  function describeUnit(status) {
    const parts = [
      status?.unitType || '',
      status?.unitCode || status?.unitId || '',
      status?.unitName || ''
    ].filter(Boolean);

    return parts.join(' - ');
  }

  function readRequestForm(modal) {
    return {
      name: modal.querySelector('#licenseReqName').value.trim(),
      taxId: modal.querySelector('#licenseReqTaxId').value.trim(),
      address: modal.querySelector('#licenseReqAddress').value.trim(),
      email: modal.querySelector('#licenseReqEmail').value.trim(),
      phone: modal.querySelector('#licenseReqPhone').value.trim(),
      payment: modal.querySelector('#licenseReqPayment').value.trim()
    };
  }

  function validateRequestForm(data) {
    if (!data.name) return 'Ingresa nombre completo o razon social.';
    if (!data.taxId) return 'Ingresa CUIT o CUIL.';
    if (!data.address) return 'Ingresa direccion.';
    if (!data.email) return 'Ingresa email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'El email no tiene un formato valido.';
    if (!data.phone) return 'Ingresa celular.';
    if (!data.payment) return 'Ingresa el detalle del comprobante de pago.';
    return '';
  }

  function buildRequestText(status, requestData = {}) {
    const cfg = currentConfig || {};
    const businessName = requestData.name || cfg.pdfBusinessName || cfg.sucursalNombre || status?.unitName || '-';
    const contactPhone = requestData.phone || cfg.businessMobile || cfg.pdfBusinessPhone || '-';
    const contactEmail = requestData.email || cfg.pdfBusinessEmail || '-';
    const location = [
      cfg.pdfBusinessLocality || '',
      cfg.pdfBusinessProvince || ''
    ].filter(Boolean).join(', ') || '-';
    const lines = [
      'Solicitud de licencia - Sistema de Tickets MardelTech',
      '',
      'Datos comerciales',
      `Nombre / razon social: ${businessName}`,
      `CUIT/CUIL: ${requestData.taxId || cfg.businessTaxId || '-'}`,
      `Contacto responsable: ${cfg.businessContactName || '-'}`,
      `Email de contacto: ${contactEmail}`,
      `Celular: ${contactPhone}`,
      `Direccion: ${requestData.address || cfg.pdfBusinessAddress || cfg.pdfBusinessStreet || '-'}`,
      `Localidad / provincia: ${location}`,
      `Comprobante / pago: ${requestData.payment || '-'}`,
      'Adjunto comprobante de transferencia.',
      '',
      'Datos tecnicos',
      `Sucursal o local: ${cfg.sucursalNombre || status?.unitName || '-'}`,
      `Codigo unidad: ${cfg.licenseUnitId || status?.unitCode || status?.unitId || '-'}`,
      `Codigo grupo: ${cfg.licenseGroupId || status?.groupCode || status?.groupId || '-'}`,
      `Tipo unidad: ${cfg.licenseUnitType || status?.unitType || '-'}`,
      `Machine ID: ${status?.machineId || '-'}`,
      `CUIT/CUIL: ${requestData.taxId || cfg.businessTaxId || '-'}`,
      `Email: ${contactEmail}`,
      `Celular: ${contactPhone}`,
      `Clave actual: ${status?.licenseKey || cfg.licenseKey || '-'}`,
      '',
      'Plan solicitado',
      'Alta / instalacion inicial: $75.000',
      'Licencia mensual por local o sucursal: $30.000',
      'Terminal adicional o caja adicional: $10.000',
      'Pago anual: $300.000, con alta bonificada',
      '',
      'Condiciones',
      '7 dias de prueba',
      'Sin permanencia mensual',
      'Soporte por WhatsApp en horario comercial',
      'Instalacion remota incluida en el alta'
    ];

    return lines.join('\n');
  }

  function buildOnlinePayload(status, requestData, text) {
    const cfg = currentConfig || {};

    return {
      request: {
        name: requestData.name,
        taxId: requestData.taxId,
        address: requestData.address,
        email: requestData.email,
        phone: requestData.phone,
        payment: requestData.payment
      },
      technical: {
        machineId: status?.machineId || '',
        licenseKey: status?.licenseKey || cfg.licenseKey || '',
        groupCode: cfg.licenseGroupId || status?.groupCode || status?.groupId || '',
        unitCode: cfg.licenseUnitId || status?.unitCode || status?.unitId || '',
        unitName: cfg.sucursalNombre || status?.unitName || '',
        unitType: cfg.licenseUnitType || status?.unitType || '',
        appStatus: status?.status || '',
        reason: status?.reason || ''
      },
      config: {
        businessName: cfg.pdfBusinessName || cfg.sucursalNombre || '',
        contactName: cfg.businessContactName || '',
        locality: cfg.pdfBusinessLocality || '',
        province: cfg.pdfBusinessProvince || '',
        supportEmail: cfg.licenseSupportEmail || '',
        supportWhatsApp: cfg.licenseSupportWhatsApp || ''
      },
      status,
      text
    };
  }

  async function copyRequestText(text) {
    if (!navigator.clipboard?.writeText) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      return false;
    }
  }

  async function saveRequestText(text) {
    const api = getApi();

    if (!api?.guardarSolicitudLicencia) {
      await copyRequestText(text);
      await showAlert('Solicitud copiada', 'No se pudo guardar TXT desde esta pantalla, pero la solicitud se copio al portapapeles.');
      return null;
    }

    const filePath = await api.guardarSolicitudLicencia(text);
    await showAlert('Solicitud guardada', `Se guardo y abrio el archivo:\n${filePath}`);
    return filePath;
  }

  async function sendRequestByEmail(text) {
    const api = getApi();
    const cfg = currentConfig || {};
    const email = String(cfg.licenseSupportEmail || '').trim();

    await copyRequestText(text);

    if (!email || !api?.abrirUrlExterna) {
      await saveRequestText(text);
      return;
    }

    const subject = encodeURIComponent('Solicitud de licencia - Sistema de Tickets MardelTech');

    try {
      await api.abrirUrlExterna(`mailto:${email}?subject=${subject}&body=${encodeURIComponent(text)}`);
      await saveRequestText(text);
      await showAlert(
        'Email preparado',
        'Se intento abrir el correo y tambien se guardo un TXT por si esta PC no tiene cliente de email configurado.'
      );
      return;
    } catch (_) {
      await saveRequestText(text);
    }
  }

  async function sendRequestByWhatsapp(text) {
    const api = getApi();
    const cfg = currentConfig || {};
    const phone = String(cfg.licenseSupportWhatsApp || '').replace(/\D/g, '');

    await copyRequestText(text);

    if (phone && api?.abrirUrlExterna) {
      await api.abrirUrlExterna(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
      return;
    }

    await showAlert(
      'WhatsApp no configurado',
      'No hay WhatsApp de soporte configurado. La solicitud se copio al portapapeles.'
    );
  }

  async function sendRequestOnline(status, requestData, text) {
    const api = getApi();

    if (!api?.enviarSolicitudLicencia) {
      await showAlert('Envio online no disponible', 'Esta version no tiene habilitado el envio online. Usa WhatsApp, email o TXT.');
      return;
    }

    try {
      const result = await api.enviarSolicitudLicencia(buildOnlinePayload(status, requestData, text));
      await copyRequestText(text);
      await showAlert(
        'Solicitud enviada',
        result?.requestId
          ? `La solicitud fue registrada correctamente.\nNumero: ${result.requestId}`
          : 'La solicitud fue registrada correctamente.'
      );
    } catch (error) {
      await copyRequestText(text);
      await showAlert(
        'No se pudo enviar online',
        `${error.message || 'No se pudo registrar la solicitud.'}\n\nLa solicitud quedo copiada para enviarla por WhatsApp o email.`
      );
    }
  }

  function openRequestPreview(status, requestData, text) {
    const formModal = ensureRequestModal();
    const previewModal = ensureRequestPreviewModal();

    formModal.classList.add('hidden');
    previewModal.querySelector('#licenseRequestPreviewText').textContent = text;
    previewModal.classList.remove('hidden');

    previewModal.querySelector('#licensePreviewBackBtn').onclick = () => {
      previewModal.classList.add('hidden');
      formModal.classList.remove('hidden');
    };

    previewModal.querySelector('#licensePreviewOnlineBtn').onclick = () => sendRequestOnline(status, requestData, text);

    previewModal.querySelector('#licensePreviewCopyBtn').onclick = async () => {
      await copyRequestText(text);
      await showAlert('Solicitud copiada', 'La solicitud se copio al portapapeles.');
    };

    previewModal.querySelector('#licensePreviewWhatsappBtn').onclick = () => sendRequestByWhatsapp(text);
    previewModal.querySelector('#licensePreviewEmailBtn').onclick = () => sendRequestByEmail(text);
    previewModal.querySelector('#licensePreviewTxtBtn').onclick = () => saveRequestText(text);
  }

  async function requestLicense(status) {
    const modal = ensureRequestModal();
    const cfg = currentConfig || {};

    modal.querySelector('#licenseReqName').value = cfg.pdfBusinessName || cfg.sucursalNombre || status?.unitName || '';
    modal.querySelector('#licenseReqTaxId').value = cfg.businessTaxId || '';
    modal.querySelector('#licenseReqAddress').value = cfg.pdfBusinessAddress || cfg.pdfBusinessStreet || '';
    modal.querySelector('#licenseReqEmail').value = cfg.pdfBusinessEmail || '';
    modal.querySelector('#licenseReqPhone').value = cfg.businessMobile || cfg.pdfBusinessPhone || '';
    modal.querySelector('#licenseReqPayment').value = '';
    modal.querySelector('#licenseRequestMeta').textContent =
      `Equipo: ${status?.machineId || 'sin identificar'}${describeUnit(status) ? ` | ${describeUnit(status)}` : ''}`;

    modal.classList.remove('hidden');
    modal.querySelector('#licenseReqName').focus();

    modal.querySelector('#licenseRequestNextBtn').onclick = async () => {
      const data = readRequestForm(modal);
      const error = validateRequestForm(data);

      if (error) {
        await showAlert('Faltan datos', error);
        return;
      }

      const text = buildRequestText(status, data);
      openRequestPreview(status, data, text);
    };
  }

  function openActivationModal(status) {
    const api = getApi();
    const modal = ensureModal();
    const input = modal.querySelector('#licenseKeyInput');
    const meta = modal.querySelector('#licenseMeta');

    input.value = status?.licenseKey || '';
    meta.textContent = `Equipo: ${status?.machineId || 'sin identificar'}${describeUnit(status) ? ` | ${describeUnit(status)}` : ''}`;
    modal.classList.remove('hidden');
    input.focus();

    modal.querySelector('#licenseRequestBtn').onclick = () => requestLicense(status);
    modal.querySelector('#licenseSaveBtn').onclick = async () => {
      try {
        const nextStatus = await api.activarLicencia(input.value);
        modal.classList.add('hidden');
        document.body.classList.remove('license-blocked');
        render(nextStatus);
      } catch (error) {
        await showAlert('No se pudo activar la licencia', error.message || 'No se pudo activar la licencia');
      }
    };
  }

  function enableWrites() {
    document.body.classList.remove('license-blocked');

    document.querySelectorAll('[data-license-disabled="true"]').forEach(element => {
      element.disabled = false;
      delete element.dataset.licenseDisabled;
    });
  }

  function disableWrites() {
    document.body.classList.add('license-blocked');

    writeSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        if (!element.disabled) {
          element.dataset.licenseDisabled = 'true';
          element.disabled = true;
        }
      });
    });
  }

  function render(status) {
    currentStatus = status || null;
    const banner = ensureBanner();
    banner.classList.remove('hidden', 'warning', 'blocked', 'active');

    if (status.canUse && status.status === 'ACTIVE') {
      enableWrites();
      banner.classList.add('active');
      banner.innerHTML = `
        <span>Licencia activa${describeUnit(status) ? ` - ${describeUnit(status)}` : ''}</span>
      `;
      return;
    }

    if (status.canUse && status.status === 'GRACE') {
      enableWrites();
      banner.classList.add('warning');
      banner.innerHTML = `
        <span>${status.reason}</span>
      `;
      return;
    }

    banner.classList.add('blocked');
    banner.innerHTML = `
      <span>${status.reason || 'Licencia bloqueada'}. Comunicate con soporte para reactivar el sistema.</span>
    `;
    disableWrites();
  }

  async function initLicenseUI() {
    const api = getApi();

    bindTopActions();

    if (!api?.obtenerEstadoLicencia) {
      return;
    }

    const banner = ensureBanner();
    banner.classList.remove('hidden', 'warning', 'blocked', 'active');
    banner.classList.add('warning');
    banner.innerHTML = `
      <span>Verificando licencia...</span>
    `;

    if (api.obtenerConfiguracion) {
      try {
        currentConfig = await api.obtenerConfiguracion();
      } catch (_) {
        currentConfig = null;
      }
    }

    try {
      const status = await api.obtenerEstadoLicencia();
      render(status);

      if (status.status === 'GRACE' && api.marcarAvisoLicencia) {
        await api.marcarAvisoLicencia();
      }
    } catch (error) {
      render({
        canUse: false,
        reason: error.message || 'No se pudo validar la licencia'
      });
    }
  }

  window.licenseUI = {
    init: initLicenseUI,
    disableWrites
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindTopActions);
  } else {
    bindTopActions();
  }
})();
