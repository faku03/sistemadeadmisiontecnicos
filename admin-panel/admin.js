const state = {
  groups: [],
  units: [],
  licenses: [],
  validations: [],
  selectedGroupId: null,
  selectedLicenseId: null,
  licenseSearch: '',
  groupSearch: '',
  unitSearch: '',
  expiringSearch: '',
  token: localStorage.getItem('sistemaAdminToken') || ''
};

const $ = selector => document.querySelector(selector);

function headers() {
  const values = {
    'Content-Type': 'application/json'
  };

  if (state.token) {
    values.Authorization = `Bearer ${state.token}`;
  }

  return values;
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
    credentials: 'same-origin',
    headers: {
      ...headers(),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && !state.token) {
      window.location.href = '/login';
      throw new Error('Sesion vencida. Redirigiendo al login.');
    }

    throw new Error(data?.error || `Error HTTP ${response.status}`);
  }

  return data;
}

async function logout() {
  await fetch('/auth/logout', {
    method: 'POST',
    credentials: 'same-origin'
  });
  localStorage.removeItem('sistemaAdminToken');
  window.location.href = '/login';
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function includesText(item, fields, searchText) {
  const needle = String(searchText || '').trim().toLowerCase();

  if (!needle) {
    return true;
  }

  return fields.some(field => String(item[field] || '').toLowerCase().includes(needle));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatGroupContact(group) {
  const parts = [
    group.contact_name,
    group.contact_email,
    group.contact_phone
  ].filter(Boolean);

  return parts.join(' / ') || '-';
}

function formatGroupLocation(group) {
  return [
    group.address,
    [group.locality, group.province].filter(Boolean).join(', ')
  ].filter(Boolean).join(' - ') || '-';
}

async function copyText(text) {
  const value = String(text || '').trim();

  if (!value) {
    throw new Error('No hay clave de licencia para copiar');
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
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

function paymentInfo(license) {
  const status = String(license.subscription_status || 'PENDING').toUpperCase();
  const due = license.next_payment_due_at || license.expires_at;
  const remaining = daysTo(due);

  if (status === 'ACTIVE' && remaining >= 0) {
    return { text: `Pago al dia (${remaining} dias)`, className: 'status-active' };
  }

  if (status === 'TRIAL') {
    return { text: `Demo (${Math.max(remaining, 0)} dias)`, className: remaining <= 2 ? 'status-warning' : 'status-active' };
  }

  if (remaining < 0) {
    return { text: `Pago vencido ${Math.abs(remaining)} dias`, className: 'status-blocked' };
  }

  return { text: status, className: remaining <= 7 ? 'status-warning' : 'status-blocked' };
}

function buildLicenseDeliveryText(license) {
  const due = toDateInput(license.expires_at);
  const lines = [
    'Hola, te envio la licencia del Sistema de Tickets MardelTech.',
    '',
    `Cliente: ${license.group_name || license.group_code}`,
    `Sucursal/tecnico: ${license.unit_name} (${license.unit_code})`,
    `Clave de licencia: ${license.license_key}`,
    `Vigencia: hasta ${due}`,
    '',
    'Para activarla: abrir el sistema, tocar "Activar licencia", pegar la clave y confirmar.',
    '',
    'Recordatorio comercial:',
    'Alta / instalacion inicial: $75.000',
    'Licencia mensual por local o sucursal: $30.000',
    'Terminal adicional o caja adicional: $10.000',
    'Pago anual: $300.000, con alta bonificada'
  ];

  return lines.join('\n');
}

function getSelectedLicense() {
  return state.licenses.find(item => String(item.id) === String(state.selectedLicenseId)) || null;
}

function confirmAction(message) {
  return window.confirm(message);
}

function expiringStatusClass(license) {
  const remaining = daysTo(license.expires_at);

  if (license.status !== 'ACTIVE' || remaining < 0 || remaining <= 7) {
    return 'expiring-danger-row';
  }

  return '';
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
  const visibleLicenses = state.licenses.filter(license =>
    includesText(
      license,
      ['group_code', 'group_name', 'unit_code', 'unit_name'],
      state.licenseSearch
    )
  );

  if (!state.licenses.length) {
    state.selectedLicenseId = null;
    body.innerHTML = '<tr><td colspan="8">Sin licencias cargadas.</td></tr>';
    return;
  }

  if (!visibleLicenses.length) {
    state.selectedLicenseId = null;
    body.innerHTML = '<tr><td colspan="8">No hay licencias para esa busqueda.</td></tr>';
    return;
  }

  if (state.selectedLicenseId && !visibleLicenses.some(license => String(license.id) === String(state.selectedLicenseId))) {
    state.selectedLicenseId = null;
  }

  body.innerHTML = visibleLicenses.map(license => {
    const status = statusInfo(license);
    const payment = paymentInfo(license);
    const licenseKey = license.license_key || '';
    const selected = String(license.id) === String(state.selectedLicenseId) ? ' selected-row' : '';

    return `
      <tr class="license-row${selected}" data-license-row="${license.id}">
        <td>${license.group_code}</td>
        <td><strong>${license.unit_code}</strong></td>
        <td>${license.unit_name}</td>
        <td>
          <div class="license-key-box">
            <code>${escapeHtml(licenseKey || license.license_key_label || 'Sin clave')}</code>
          </div>
        </td>
        <td><span class="status-pill ${status.className}">${status.text}</span></td>
        <td>
          <div class="payment-cell">
            <span class="status-pill ${payment.className}">${payment.text}</span>
            ${license.subscription_reference ? `<small>${escapeHtml(license.subscription_reference)}</small>` : ''}
          </div>
        </td>
        <td>${toDateInput(license.expires_at)}</td>
        <td class="machine" title="${license.machine_id || ''}">${license.machine_id || 'Sin activar'}</td>
      </tr>
    `;
  }).join('');
}

function renderActionPanel() {
  const license = getSelectedLicense();
  const selectedText = $('#selectedLicenseText');
  const selectedCard = $('#selectedLicenseCard');
  const renewDate = $('#selectedRenewDate');
  const buttons = document.querySelectorAll('.license-selected-action');

  if (!license) {
    selectedText.textContent = 'Selecciona una licencia de la grilla.';
    selectedCard.textContent = 'Sin registro seleccionado.';
    renewDate.value = '';
    renewDate.disabled = true;
    buttons.forEach(button => {
      button.disabled = true;
    });
    $('#selectedStatusBtn').textContent = 'Suspender';
    $('#selectedStatusBtn').className = 'btn btn-danger license-selected-action';
    return;
  }

  const status = statusInfo(license);
  const payment = paymentInfo(license);
  selectedText.textContent = `${license.group_code} / ${license.unit_code}`;
  selectedCard.innerHTML = `
    <strong>${escapeHtml(license.unit_name)}</strong>
    <span>${escapeHtml(license.group_name || license.group_code)}</span>
    <span>Licencia: ${escapeHtml(license.license_key || license.license_key_label || 'Sin clave')}</span>
    <span>Estado: ${escapeHtml(status.text)} / Pago: ${escapeHtml(payment.text)}</span>
    <span>Equipo: ${escapeHtml(license.machine_id || 'Sin activar')}</span>
  `;
  renewDate.disabled = false;
  renewDate.value = toDateInput(license.expires_at);
  buttons.forEach(button => {
    button.disabled = false;
  });
  $('#selectedMessageBtn').disabled = !license.license_key;
  $('#selectedCopyBtn').disabled = !license.license_key;
  $('#selectedReleaseBtn').disabled = !license.machine_id;

  const statusButton = $('#selectedStatusBtn');
  if (license.status === 'ACTIVE') {
    statusButton.textContent = 'Suspender';
    statusButton.className = 'btn btn-danger license-selected-action';
  } else {
    statusButton.textContent = 'Activar';
    statusButton.className = 'btn btn-secondary license-selected-action';
  }
}

function isExpiringLicense(license) {
  return daysTo(license.expires_at) <= 7 || license.status !== 'ACTIVE';
}

function renderExpiringLicenses() {
  const body = $('#expiringBody');
  const visible = state.licenses
    .filter(isExpiringLicense)
    .filter(license => includesText(
      license,
      ['group_code', 'group_name', 'unit_code', 'unit_name', 'status'],
      state.expiringSearch
    ))
    .sort((a, b) => daysTo(a.expires_at) - daysTo(b.expires_at));

  if (!visible.length) {
    body.innerHTML = '<tr><td colspan="8">No hay licencias vencidas o por vencer para esa busqueda.</td></tr>';
    return;
  }

  body.innerHTML = visible.map(license => {
    const status = statusInfo(license);
    const remaining = daysTo(license.expires_at);
    const dateId = `expiring-renew-${license.id}`;
    const daysText = remaining < 0 ? `Vencida hace ${Math.abs(remaining)} dias` : `${remaining} dias`;

    return `
      <tr class="${expiringStatusClass(license)}">
        <td>${license.group_code}</td>
        <td><strong>${license.unit_code}</strong></td>
        <td>${license.unit_name}</td>
        <td><span class="status-pill ${status.className}">${status.text}</span></td>
        <td><strong>${daysText}</strong></td>
        <td>${toDateInput(license.expires_at)}</td>
        <td>
          <div class="renew-box">
            <input id="${dateId}" type="date" value="${toDateInput(license.expires_at)}">
            <button class="btn btn-primary" data-expiring-action="renew" data-id="${license.id}">Guardar</button>
          </div>
        </td>
        <td class="machine" title="${license.machine_id || ''}">${license.machine_id || 'Sin activar'}</td>
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

function unitsForGroup(groupId) {
  return state.units.filter(unit => String(unit.group_id) === String(groupId));
}

function licenseForUnit(unitId) {
  return state.licenses.find(license => String(license.unit_id) === String(unitId));
}

function renderGroupsMaster() {
  const body = $('#groupsBody');
  const visibleGroups = state.groups.filter(group =>
    includesText(group, ['codigo', 'nombre', 'tax_id', 'contact_name', 'contact_email', 'contact_phone'], state.groupSearch)
  );

  if (!state.groups.length) {
    body.innerHTML = '<tr><td colspan="5">Sin grupos cargados.</td></tr>';
    $('#groupUnitsBody').innerHTML = '<tr><td colspan="6">Selecciona un grupo.</td></tr>';
    return;
  }

  if (!visibleGroups.length) {
    state.selectedGroupId = null;
    body.innerHTML = '<tr><td colspan="5">Sin grupos para esa busqueda.</td></tr>';
    $('#groupUnitsBody').innerHTML = '<tr><td colspan="6">Sin grupo seleccionado.</td></tr>';
    return;
  }

  if (!state.selectedGroupId || !visibleGroups.some(group => String(group.id) === String(state.selectedGroupId))) {
    state.selectedGroupId = visibleGroups[0].id;
  }

  body.innerHTML = visibleGroups.map(group => {
    const units = unitsForGroup(group.id);
    const selected = String(group.id) === String(state.selectedGroupId) ? ' class="selected-row"' : '';
    const statusClass = group.is_active ? 'status-active' : 'status-blocked';
    const statusText = group.is_active ? 'Activo' : 'Inactivo';

    return `
      <tr${selected} data-group-id="${group.id}">
        <td><strong>${group.codigo}</strong></td>
        <td>${group.nombre}</td>
        <td>${escapeHtml(formatGroupContact(group))}</td>
        <td>${units.length}</td>
        <td><span class="status-pill ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  }).join('');
}

function renderGroupDetail() {
  const group = state.groups.find(item => String(item.id) === String(state.selectedGroupId));
  const body = $('#groupUnitsBody');

  if (!group) {
    $('#selectedGroupTitle').textContent = 'Sucursales y tecnicos';
    $('#selectedGroupSubtitle').textContent = 'Selecciona un grupo para ver el detalle.';
    $('#selectedGroupContact').innerHTML = '';
    body.innerHTML = '<tr><td colspan="6">Selecciona un grupo.</td></tr>';
    return;
  }

  const units = unitsForGroup(group.id);
  const visibleUnits = units.filter(unit =>
    includesText(unit, ['codigo', 'nombre', 'tipo'], state.unitSearch)
  );
  $('#selectedGroupTitle').textContent = `${group.codigo} - ${group.nombre}`;
  $('#selectedGroupSubtitle').textContent = `${visibleUnits.length} de ${units.length} sucursal(es) o tecnico(s).`;
  $('#selectedGroupContact').innerHTML = `
    <span><strong>CUIT/CUIL:</strong> ${escapeHtml(group.tax_id || '-')}</span>
    <span><strong>Contacto:</strong> ${escapeHtml(formatGroupContact(group))}</span>
    <span><strong>Direccion:</strong> ${escapeHtml(formatGroupLocation(group))}</span>
  `;

  if (!units.length) {
    body.innerHTML = '<tr><td colspan="6">Este grupo todavia no tiene sucursales ni tecnicos.</td></tr>';
    return;
  }

  if (!visibleUnits.length) {
    body.innerHTML = '<tr><td colspan="6">Sin sucursales o tecnicos para esa busqueda.</td></tr>';
    return;
  }

  body.innerHTML = visibleUnits.map(unit => {
    const license = licenseForUnit(unit.id);
    const status = license
      ? statusInfo(license)
      : { text: 'SIN LICENCIA', className: 'status-blocked' };

    return `
      <tr>
        <td><strong>${unit.codigo}</strong></td>
        <td>${unit.nombre}</td>
        <td>${unit.tipo}</td>
        <td><span class="status-pill ${status.className}">${status.text}</span></td>
        <td>${license ? toDateInput(license.expires_at) : '-'}</td>
        <td class="machine" title="${license?.machine_id || ''}">${license?.machine_id || 'Sin activar'}</td>
      </tr>
    `;
  }).join('');
}

function renderGroupsView() {
  renderGroupsMaster();
  renderGroupDetail();
}

function render() {
  renderSelects();
  renderSummary();
  renderLicenses();
  renderActionPanel();
  renderExpiringLicenses();
  renderValidations();
  renderGroupsView();
}

async function loadAll() {
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
  state.selectedLicenseId = state.licenses.some(license => String(license.id) === String(state.selectedLicenseId))
    ? state.selectedLicenseId
    : null;
  state.selectedGroupId = state.groups.some(group => String(group.id) === String(state.selectedGroupId))
    ? state.selectedGroupId
    : state.groups[0]?.id || null;
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
      subscription_status: data.subscription_status,
      subscription_reference: data.subscription_reference,
      billing_period: data.billing_period,
      next_payment_due_at: data.expires_at,
      expires_at: data.expires_at,
      grace_days: Number(data.grace_days || 7),
      features: {
        tickets: true,
        caja: true,
        derivaciones: true
      }
    })
  });

  await copyText(created.license_key);
  return {
    id: created.id,
    message: `Licencia creada correctamente. Clave copiada: ${created.license_key}`
  };
}

function licenseById(id) {
  const license = state.licenses.find(item => String(item.id) === String(id));

  if (!license) {
    throw new Error('Licencia no encontrada');
  }

  return license;
}

function requireSelectedLicense() {
  const license = getSelectedLicense();

  if (!license) {
    throw new Error('Selecciona una licencia de la grilla');
  }

  return license;
}

function validateRenewDate(value) {
  if (!value) {
    throw new Error('Indica el nuevo vencimiento');
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Fecha de vencimiento invalida');
  }

  return value;
}

async function renewLicense(id, expiresAt) {
  const license = licenseById(id);
  const nextExpiresAt = validateRenewDate(expiresAt);

  await request(`/admin/licenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      status: 'ACTIVE',
      plan: license.plan,
      grace_days: license.grace_days,
      expires_at: nextExpiresAt,
      subscription_status: license.subscription_status,
      subscription_reference: license.subscription_reference,
      billing_period: license.billing_period,
      next_payment_due_at: nextExpiresAt,
      payment_notes: license.payment_notes,
      features: license.features
    })
  });

  await loadAll();
  showMessage(`Vencimiento renovado para ${license.unit_code}.`);
}

async function recordMonthlyPayment(id) {
  const license = licenseById(id);

  await request(`/admin/licenses/${id}/payment`, {
    method: 'POST',
    body: JSON.stringify({
      amount: 30000,
      currency: 'ARS',
      payment_method: 'MANUAL',
      valid_days: license.billing_period === 'ANNUAL' ? 365 : 30,
      subscription_status: 'ACTIVE',
      payment_reference: license.subscription_reference || '',
      notes: 'Pago registrado desde panel administrador'
    })
  });

  await loadAll();
  showMessage(`Pago registrado y licencia renovada para ${license.unit_code}.`);
}

async function copyLicenseDelivery(id) {
  const license = licenseById(id);

  if (!license.license_key) {
    throw new Error('La clave completa no esta disponible para copiar');
  }

  await copyText(buildLicenseDeliveryText(license));
  showMessage('Mensaje de licencia copiado para enviar al cliente.');
}

async function copySelectedLicenseKey() {
  const license = requireSelectedLicense();

  if (!license.license_key) {
    throw new Error('La clave completa no esta disponible para copiar');
  }

  await copyText(license.license_key);
  showMessage('Clave de licencia copiada.');
}

async function renewSelectedLicense() {
  const license = requireSelectedLicense();
  const expiresAt = validateRenewDate($('#selectedRenewDate').value);

  if (!confirmAction(`Renovar ${license.group_code} / ${license.unit_code} hasta ${expiresAt}?`)) {
    return;
  }

  await renewLicense(license.id, expiresAt);
}

async function recordSelectedPayment() {
  const license = requireSelectedLicense();

  if (!confirmAction(`Registrar pago aprobado y renovar ${license.group_code} / ${license.unit_code}?`)) {
    return;
  }

  await recordMonthlyPayment(license.id);
}

async function copySelectedDeliveryMessage() {
  const license = requireSelectedLicense();

  if (!license.license_key) {
    throw new Error('La clave completa no esta disponible para armar el mensaje');
  }

  await copyLicenseDelivery(license.id);
}

async function toggleSelectedLicenseStatus() {
  const license = requireSelectedLicense();
  const action = license.status === 'ACTIVE' ? 'suspend' : 'activate';
  const label = action === 'suspend' ? 'suspender' : 'activar';

  if (!confirmAction(`Confirmas ${label} la licencia ${license.group_code} / ${license.unit_code}?`)) {
    return;
  }

  await postAction(license.id, action);
  showMessage(action === 'suspend' ? 'Licencia suspendida.' : 'Licencia activada.');
}

async function releaseSelectedLicenseMachine() {
  const license = requireSelectedLicense();

  if (!license.machine_id) {
    throw new Error('La licencia seleccionada no tiene una PC vinculada');
  }

  if (!confirmAction(`Liberar la PC vinculada a ${license.group_code} / ${license.unit_code}?`)) {
    return;
  }

  await postAction(license.id, 'release-machine');
  showMessage('PC liberada para nueva activacion.');
}

async function postAction(id, action) {
  await request(`/admin/licenses/${id}/${action}`, { method: 'POST' });
  await loadAll();
}

function wireEvents() {
  $('#adminToken').value = state.token;

  function openAltaModal() {
    $('#licenseAltaModal').classList.remove('hidden');
  }

  function closeAltaModal() {
    $('#licenseAltaModal').classList.add('hidden');
  }

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

  $('#logoutBtn').addEventListener('click', () => {
    logout().catch(error => showMessage(error.message, true));
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
    const form = event.currentTarget;

    (async () => {
      try {
        const result = await createLicense(formData(form));
        form.reset();
        await loadAll();
        state.selectedLicenseId = result.id;
        render();
        closeAltaModal();
        showMessage(result.message || 'Licencia creada correctamente.');
      } catch (error) {
        showMessage(error.message, true);
      }
    })();
  });

  $('#refreshBtn').addEventListener('click', () => {
    loadAll().catch(error => showMessage(error.message, true));
  });

  $('#openLicenseAltaBtn').addEventListener('click', openAltaModal);
  $('#closeLicenseAltaBtn').addEventListener('click', closeAltaModal);
  $('#licenseAltaModal').addEventListener('click', event => {
    if (event.target.id === 'licenseAltaModal') {
      closeAltaModal();
    }
  });

  $('#licenseSearch').addEventListener('input', event => {
    state.licenseSearch = event.target.value;
    renderLicenses();
  });

  $('#refreshExpiringBtn').addEventListener('click', () => {
    loadAll().catch(error => showMessage(error.message, true));
  });

  $('#refreshValidationsBtn').addEventListener('click', () => {
    loadAll().catch(error => showMessage(error.message, true));
  });

  $('#licensesBody').addEventListener('click', event => {
    const row = event.target.closest('tr[data-license-row]');

    if (!row) return;

    state.selectedLicenseId = row.dataset.licenseRow;
    renderLicenses();
    renderActionPanel();
  });

  $('#selectedRenewBtn').addEventListener('click', () => {
    renewSelectedLicense().catch(error => showMessage(error.message, true));
  });

  $('#selectedPaymentBtn').addEventListener('click', () => {
    recordSelectedPayment().catch(error => showMessage(error.message, true));
  });

  $('#selectedMessageBtn').addEventListener('click', () => {
    copySelectedDeliveryMessage().catch(error => showMessage(error.message, true));
  });

  $('#selectedCopyBtn').addEventListener('click', () => {
    copySelectedLicenseKey().catch(error => showMessage(error.message, true));
  });

  $('#selectedStatusBtn').addEventListener('click', () => {
    toggleSelectedLicenseStatus().catch(error => showMessage(error.message, true));
  });

  $('#selectedReleaseBtn').addEventListener('click', () => {
    releaseSelectedLicenseMachine().catch(error => showMessage(error.message, true));
  });

  document.querySelectorAll('.menu-item').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
      document.querySelectorAll('.view').forEach(view => view.classList.remove('active-view'));
      button.classList.add('active');
      $(`#${button.dataset.view}`).classList.add('active-view');
    });
  });

  $('#groupsBody').addEventListener('click', event => {
    const row = event.target.closest('tr[data-group-id]');

    if (!row) return;

    state.selectedGroupId = row.dataset.groupId;
    renderGroupsView();
  });

  $('#groupSearch').addEventListener('input', event => {
    state.groupSearch = event.target.value;
    renderGroupsView();
  });

  $('#unitSearch').addEventListener('input', event => {
    state.unitSearch = event.target.value;
    renderGroupDetail();
  });

  $('#expiringSearch').addEventListener('input', event => {
    state.expiringSearch = event.target.value;
    renderExpiringLicenses();
  });

  $('#expiringBody').addEventListener('click', event => {
    const button = event.target.closest('button[data-expiring-action]');

    if (!button) return;

    renewExpiringLicense(button.dataset.id).catch(error => showMessage(error.message, true));
  });
}

async function renewExpiringLicense(id) {
  const license = licenseById(id);
  const expiresAt = validateRenewDate($(`#expiring-renew-${id}`).value);

  await renewLicense(id, expiresAt);
}

wireEvents();
loadAll().catch(error => showMessage(error.message, true));
