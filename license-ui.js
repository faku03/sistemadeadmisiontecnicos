(function () {
  const writeSelectors = [
    '#btnGuardar',
    '#guardar',
    '#confirmarEntrega',
    '#btnGuardarPresupuesto',
    '#btnEnviarPresupuesto',
    '#btnDevolver',
    '.btn-cobrar',
    '.btn-entregar',
    '.btn-presupuesto',
    '.combo-estado'
  ];

  let currentConfig = null;

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

  function describeUnit(status) {
    const parts = [
      status?.unitType || '',
      status?.unitCode || status?.unitId || '',
      status?.unitName || ''
    ].filter(Boolean);

    return parts.join(' - ');
  }

  function buildRequestText(status) {
    const cfg = currentConfig || {};
    const businessName = cfg.pdfBusinessName || cfg.sucursalNombre || status?.unitName || '-';
    const contactPhone = cfg.businessMobile || cfg.pdfBusinessPhone || '-';
    const contactEmail = cfg.pdfBusinessEmail || '-';
    const location = [
      cfg.pdfBusinessLocality || '',
      cfg.pdfBusinessProvince || ''
    ].filter(Boolean).join(', ') || '-';
    const lines = [
      'Solicitud de licencia - Sistema de Tickets MardelTech',
      '',
      'Datos comerciales',
      `Nombre / razon social: ${businessName}`,
      `CUIT/CUIL: ${cfg.businessTaxId || '-'}`,
      `Contacto responsable: ${cfg.businessContactName || '-'}`,
      `Email de contacto: ${contactEmail}`,
      `Celular: ${contactPhone}`,
      `Direccion: ${cfg.pdfBusinessAddress || cfg.pdfBusinessStreet || '-'}`,
      `Localidad / provincia: ${location}`,
      '',
      'Datos tecnicos',
      `Sucursal o local: ${cfg.sucursalNombre || status?.unitName || '-'}`,
      `Codigo unidad: ${cfg.licenseUnitId || status?.unitCode || status?.unitId || '-'}`,
      `Codigo grupo: ${cfg.licenseGroupId || status?.groupCode || status?.groupId || '-'}`,
      `Tipo unidad: ${cfg.licenseUnitType || status?.unitType || '-'}`,
      `Machine ID: ${status?.machineId || '-'}`,
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

  async function requestLicense(status) {
    const api = getApi();
    const cfg = currentConfig || {};
    const text = buildRequestText(status);

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        // seguimos igual
      }
    }

    const email = String(cfg.licenseSupportEmail || '').trim();
    const phone = String(cfg.licenseSupportWhatsApp || '').replace(/\D/g, '');

    if (email && api?.abrirUrlExterna) {
      const subject = encodeURIComponent('Solicitud de licencia - Sistema de Tickets MardelTech');
      await api.abrirUrlExterna(`mailto:${email}?subject=${subject}&body=${encodeURIComponent(text)}`);
      return;
    }

    if (phone && api?.abrirUrlExterna) {
      await api.abrirUrlExterna(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
      return;
    }

    await showAlert(
      'Solicitud de licencia',
      `Se copio la solicitud al portapapeles. Envia estos datos a soporte:\n\n${text}`
    );
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
    const banner = ensureBanner();
    banner.classList.remove('hidden', 'warning', 'blocked', 'active');

    if (status.canUse && status.status === 'ACTIVE') {
      enableWrites();
      banner.classList.add('active');
      banner.innerHTML = `
        <span>Licencia activa${describeUnit(status) ? ` - ${describeUnit(status)}` : ''}</span>
        <button class="license-action license-view">Ver licencia</button>
      `;
      banner.querySelector('.license-view').onclick = () => openActivationModal(status);
      return;
    }

    if (status.canUse && status.status === 'GRACE') {
      enableWrites();
      banner.classList.add('warning');
      banner.innerHTML = `
        <span>${status.reason}</span>
        <div class="license-inline-actions">
          <button class="license-action license-request">Solicitar licencia</button>
          <button class="license-action license-update">Actualizar licencia</button>
        </div>
      `;
      banner.querySelector('.license-request').onclick = () => requestLicense(status);
      banner.querySelector('.license-update').onclick = () => openActivationModal(status);
      return;
    }

    banner.classList.add('blocked');
    banner.innerHTML = `
      <span>${status.reason || 'Licencia bloqueada'}. Comunicate con soporte para reactivar el sistema.</span>
      <div class="license-inline-actions">
        <button class="license-action license-request">Solicitar licencia</button>
        <button class="license-action license-activate">Activar licencia</button>
      </div>
    `;
    banner.querySelector('.license-request').onclick = () => requestLicense(status);
    banner.querySelector('.license-activate').onclick = () => openActivationModal(status);
    disableWrites();
  }

  async function initLicenseUI() {
    const api = getApi();

    if (!api?.obtenerEstadoLicencia) {
      return;
    }

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
})();
