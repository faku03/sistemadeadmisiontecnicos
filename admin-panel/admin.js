const state = {
  groups: [],
  units: [],
  licenses: [],
  validations: [],
  token: localStorage.getItem('sistemaAdminToken') || ''
};

const $ = selector => document.querySelector(selector);

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${state.token}`
  };
}

function toDateInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function daysTo(value) {
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function showMessage(text, isError = false) {
  const box = $('#message');
  box.textContent = text;
  box.className = `message${isError ? ' error' : ''}`;

  window.clearTimeout(showMessage.timer);
  showMessage.timer = window.setTimeout(() => box.classList.add('hidden'), 5000);
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Error HTTP ${response.status}`);
  }

  return data;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function renderSelects() {
  const groupOptions = state.groups
    .map(group => `<option value="${group.id}">${group.codigo} - ${group.nombre}</option>`)
    .join('');

  $('#unitGroup').innerHTML = groupOptions || '<option value="">Sin grupos</option>';

  $('#licenseUnit').innerHTML = state.units
    .map(unit => `<option value="${unit.id}" data-group="${unit.group_id}">${unit.group_code} / ${unit.codigo} - ${unit.nombre}</option>`)
    .join('') || '<option value="">Sin unidades</option>';
}

function statusInfo(license) {
  const remaining = daysTo(license.expires_at);

  if (license.status !== 'ACTIVE') {
    return { text: license.status, className: 'status-blocked' };
  }

  if (remaining < 0) {
    return { text: 'VENCIDA', className: 'status-blocked' };
  }

  if (remaining <= 7) {
    return { text: `${remaining} dias`, className: 'status-warning' };
  }

  return { text: 'ACTIVA', className: 'status-active' };
}

function renderSummary() {
  $('#groupsCount').textContent = state.groups.length;
  $('#unitsCount').textContent = state.units.length;
  $('#activeLicensesCount').textContent = state.licenses
    .filter(license => license.status === 'ACTIVE' && daysTo(license.expires_at) >= 0)
    .length;
  $('#expiringLicensesCount').textContent = state.licenses
    .filter(license => license.status === 'ACTIVE' && daysTo(license.expires_at) >= 0 && daysTo(license.expires_at) <= 7)
    .length;
}

function renderLicenses() {
  const body = $('#licensesBody');

  if (!state.licenses.length) {
    body.innerHTML = '<tr><td colspan="8">Sin licencias cargadas.</td></tr>';
    return;
  }

  body.innerHTML = state.licenses.map(license => {
    const status = statusInfo(license);
    const dateId = `renew-${license.id}`;
    const activeAction = license.status === 'ACTIVE'
      ? `<button class="btn btn-danger" data-action="suspend" data-id="${license.id}">Suspender</button>`
      : `<button class="btn btn-secondary" data-action="activate" data-id="${license.id}">Activar</button>`;

    return `
      <tr>
        <td>${license.group_code}</td>
        <td><strong>${license.unit_code}</strong></td>
        <td>${license.unit_name}</td>
        <td><span class="status-pill ${status.className}">${status.text}</span></td>
        <td>${toDateInput(license.expires_at)}</td>
        <td>
          <div class="renew-box">
            <input id="${dateId}" type="date" value="${toDateInput(license.expires_at)}">
            <button class="btn btn-primary" data-action="renew" data-id="${license.id}">Guardar</button>
          </div>
        </td>
        <td class="machine" title="${license.machine_id || ''}">${license.machine_id || 'Sin activar'}</td>
        <td class="actions">
          ${activeAction}
          <button class="btn btn-secondary" data-action="release" data-id="${license.id}">Liberar PC</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderValidations() {
  const list = $('#validationsList');

  if (!state.validations.length) {
    list.innerHTML = '<div class="audit-item">Sin validaciones registradas.</div>';
    return;
  }

  list.innerHTML = state.validations.slice(0, 40).map(item => `
    <article class="audit-item">
      <strong>${item.result}</strong>
      <span>${item.group_code || '-'} / ${item.unit_code || '-'} / ${item.machine_id || '-'}</span>
      <span>${new Date(item.created_at).toLocaleString()}</span>
    </article>
  `).join('');
}

function render() {
  renderSelects();
  renderSummary();
  renderLicenses();
  renderValidations();
}

async function loadAll() {
  if (!state.token) {
    showMessage('Ingresa el token administrador para conectar.');
    return;
  }

  const [groups, units, licenses, validations] = await Promise.all([
    request('/admin/license-groups'),
    request('/admin/license-units'),
    request('/admin/licenses'),
    request('/admin/license-validations')
  ]);

  state.groups = groups;
  state.units = units;
  state.licenses = licenses;
  state.validations = validations;
  render();
  showMessage('Datos actualizados.');
}

async function handleSubmit(form, work) {
  try {
    const message = await work(formData(form));
    form.reset();
    await loadAll();
    if (message) {
      showMessage(message);
    }
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function createGroup(data) {
  await request('/admin/license-groups', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function createUnit(data) {
  await request('/admin/license-units', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      group_id: Number(data.group_id)
    })
  });
}

async function createLicense(data) {
  const unit = state.units.find(item => String(item.id) === String(data.unit_id));

  if (!unit) {
    throw new Error('Selecciona una sucursal o tecnico');
  }

  const created = await request('/admin/licenses', {
    method: 'POST',
    body: JSON.stringify({
      group_id: Number(unit.group_id),
      unit_id: Number(data.unit_id),
      plan: data.plan,
      expires_at: data.expires_at,
      grace_days: Number(data.grace_days || 7),
      features: {
        tickets: true,
        caja: true,
        derivaciones: true
      }
    })
  });

  return `Licencia creada. Clave: ${created.license_key}`;
}

function licenseById(id) {
  const license = state.licenses.find(item => String(item.id) === String(id));

  if (!license) {
    throw new Error('Licencia no encontrada');
  }

  return license;
}

async function renewLicense(id) {
  const license = licenseById(id);
  const expiresAt = $(`#renew-${id}`).value;

  await request(`/admin/licenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      status: 'ACTIVE',
      plan: license.plan,
      grace_days: license.grace_days,
      expires_at: expiresAt,
      features: license.features
    })
  });

  await loadAll();
  showMessage(`Vencimiento renovado para ${license.unit_code}.`);
}

async function postAction(id, action) {
  await request(`/admin/licenses/${id}/${action}`, { method: 'POST' });
  await loadAll();
}

function wireEvents() {
  $('#adminToken').value = state.token;

  $('#tokenForm').addEventListener('submit', async event => {
    event.preventDefault();
    state.token = $('#adminToken').value.trim();
    localStorage.setItem('sistemaAdminToken', state.token);

    try {
      await loadAll();
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  $('#groupForm').addEventListener('submit', event => {
    event.preventDefault();
    handleSubmit(event.currentTarget, createGroup);
  });

  $('#unitForm').addEventListener('submit', event => {
    event.preventDefault();
    handleSubmit(event.currentTarget, createUnit);
  });

  $('#licenseForm').addEventListener('submit', event => {
    event.preventDefault();
    handleSubmit(event.currentTarget, createLicense);
  });

  $('#refreshBtn').addEventListener('click', () => {
    loadAll().catch(error => showMessage(error.message, true));
  });

  $('#licensesBody').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');

    if (!button) return;

    const { action, id } = button.dataset;
    const run = action === 'renew'
      ? renewLicense(id)
      : postAction(id, action === 'release' ? 'release-machine' : action);

    run.catch(error => showMessage(error.message, true));
  });
}

wireEvents();
loadAll().catch(error => showMessage(error.message, true));
