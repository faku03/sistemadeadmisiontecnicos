let editandoId = null;
let clientesCache = [];

const tabla = document.getElementById('tabla');
const buscar = document.getElementById('buscar');
const verEliminados = document.getElementById('verEliminados');

const dni = document.getElementById('dni');
const nombre = document.getElementById('nombre');
const apellido = document.getElementById('apellido');
const celular = document.getElementById('celular');
const email = document.getElementById('email');

const guardarBtn = document.getElementById('guardar');
const cancelarBtn = document.getElementById('cancelar');
const tituloForm = document.getElementById('tituloForm');

function textoCliente(cliente) {
  return `${cliente.dni || ''} ${cliente.nombre || ''} ${cliente.apellido || ''} ${cliente.celular || ''} ${cliente.email || ''}`.toLowerCase();
}

async function cargar() {
  const datos = await window.apiClientes.listar(verEliminados.checked);
  clientesCache = datos;
  tabla.innerHTML = '';

  const filtro = buscar.value.trim().toLowerCase();

  datos
    .filter(cliente => textoCliente(cliente).includes(filtro))
    .forEach(cliente => {
      const tr = document.createElement('tr');

      if (cliente.is_deleted) {
        tr.style.opacity = '0.5';
        tr.style.textDecoration = 'line-through';
      }

      tr.innerHTML = `
        <td>${cliente.dni || ''}</td>
        <td>${cliente.nombre || ''}</td>
        <td>${cliente.apellido || ''}</td>
        <td>${cliente.celular || ''}</td>
        <td>${cliente.email || ''}</td>
        <td>${cliente.is_deleted ? 'ELIMINADO' : 'ACTIVO'}</td>
        <td>
          ${
            cliente.is_deleted
              ? `<button onclick="reactivar(${cliente.id})">Reactivar</button>`
              : `
                <button onclick="editar(${cliente.id})">Editar</button>
                <button onclick="eliminar(${cliente.id})">Eliminar</button>
              `
          }
        </td>
      `;

      tabla.appendChild(tr);
    });
}

guardarBtn.onclick = async () => {
  if (!dni.value.trim() || !nombre.value.trim() || !apellido.value.trim()) {
    alert('Completa DNI, nombre y apellido');
    return;
  }

  guardarBtn.disabled = true;

  try {
    const data = {
      dni: dni.value.trim(),
      nombre: nombre.value.trim(),
      apellido: apellido.value.trim(),
      celular: celular.value.trim(),
      email: email.value.trim()
    };

    if (editandoId) {
      await window.apiClientes.actualizar({ ...data, id: editandoId });
    } else {
      await window.apiClientes.crear(data);
    }

    limpiar();
    await cargar();
  } catch (error) {
    alert(error.message || 'No se pudo guardar el cliente');
  } finally {
    guardarBtn.disabled = false;
  }
};

function editar(id) {
  const cliente = clientesCache.find(item => Number(item.id) === Number(id));
  if (!cliente) return;

  editandoId = id;
  dni.value = cliente.dni || '';
  nombre.value = cliente.nombre || '';
  apellido.value = cliente.apellido || '';
  celular.value = cliente.celular || '';
  email.value = cliente.email || '';

  tituloForm.textContent = 'Editar Cliente';
  cancelarBtn.style.display = 'inline';
}

function limpiar() {
  editandoId = null;
  dni.value = '';
  nombre.value = '';
  apellido.value = '';
  celular.value = '';
  email.value = '';
  tituloForm.textContent = 'Nuevo Cliente';
  cancelarBtn.style.display = 'none';
}

async function eliminar(id) {
  if (confirm('Eliminar cliente?')) {
    await window.apiClientes.eliminar(id);
    cargar();
  }
}

async function reactivar(id) {
  await window.apiClientes.reactivar(id);
  cargar();
}

cancelarBtn.onclick = limpiar;
buscar.oninput = cargar;
verEliminados.onchange = cargar;

cargar();
