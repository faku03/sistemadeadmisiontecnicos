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
      banner.textContent = `Licencia activa - ${status.unitType || ''} ${status.unitId || ''}`;
      return;
    }

    if (status.canUse && status.status === 'GRACE') {
      banner.classList.add('warning');
      banner.textContent = `No se pudo validar la licencia online. Quedan ${status.daysRemaining} dias de gracia.`;
      return;
    }

    banner.classList.add('blocked');
    banner.textContent = `${status.reason || 'Licencia bloqueada'}. Comunicate con soporte para reactivar el sistema.`;
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
