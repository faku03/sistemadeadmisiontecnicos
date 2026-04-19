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

  function getApi() {
    return window.api || window.apiCaja;
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
          Ingresá la clave asignada a esta sucursal o técnico.
        </p>
        <input id="licenseKeyInput" placeholder="XXXX-XXXX-XXXX">
        <div class="license-meta" id="licenseMeta"></div>
        <div class="modal-actions">
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

  function openActivationModal(status) {
    const api = getApi();
    const modal = ensureModal();
    const input = modal.querySelector('#licenseKeyInput');
    const meta = modal.querySelector('#licenseMeta');

    input.value = status?.licenseKey || '';
    meta.textContent = `Equipo: ${status?.machineId || 'sin identificar'}`;
    modal.classList.remove('hidden');
    input.focus();

    modal.querySelector('#licenseSaveBtn').onclick = async () => {
      try {
        const nextStatus = await api.activarLicencia(input.value);
        modal.classList.add('hidden');
        document.body.classList.remove('license-blocked');
        render(nextStatus);
      } catch (error) {
        alert(error.message || 'No se pudo activar la licencia');
      }
    };
  }

  function disableWrites() {
    document.body.classList.add('license-blocked');

    writeSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        element.disabled = true;
      });
    });
  }

  function render(status) {
    const banner = ensureBanner();
    banner.classList.remove('hidden', 'warning', 'blocked', 'active');

    if (status.canUse && status.status === 'ACTIVE') {
      banner.classList.add('active');
      banner.innerHTML = `
        <span>Licencia activa - ${status.unitType || ''} ${status.unitId || ''}</span>
        <button class="license-action">Ver licencia</button>
      `;
      banner.querySelector('.license-action').onclick = () => openActivationModal(status);
      return;
    }

    if (status.canUse && status.status === 'GRACE') {
      banner.classList.add('warning');
      banner.innerHTML = `
        <span>No se pudo validar la licencia online. Quedan ${status.daysRemaining} dias de gracia.</span>
        <button class="license-action">Actualizar licencia</button>
      `;
      banner.querySelector('.license-action').onclick = () => openActivationModal(status);
      return;
    }

    banner.classList.add('blocked');
    banner.innerHTML = `
      <span>${status.reason || 'Licencia bloqueada'}. Comunicate con soporte para reactivar el sistema.</span>
      <button class="license-action">Activar licencia</button>
    `;
    banner.querySelector('.license-action').onclick = () => openActivationModal(status);
    disableWrites();
  }

  async function initLicenseUI() {
    const api = getApi();

    if (!api?.obtenerEstadoLicencia) {
      return;
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
