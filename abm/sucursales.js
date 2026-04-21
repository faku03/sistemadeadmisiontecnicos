let editandoId = null;
let sucursalesCache = [];

const tabla = document.getElementById('tabla');
const buscar = document.getElementById('buscar');
const verEliminados = document.getElementById('verEliminados');

const codigo = document.getElementById('codigo');
const nombre = document.getElementById('nombre');
const direccion = document.getElementById('direccion');
const telefono = document.getElementById('telefono');
const sucursalLocal = document.getElementById('sucursalLocal');

const guardarBtn = document.getElementById('guardar');
const cancelarBtn = document.getElementById('cancelar');
const tituloForm = document.getElementById('tituloForm');

async function cargar() {
  const datos = await window.apiSucursales.listar(verEliminados.checked);
  sucursalesCache = datos;
  tabla.innerHTML = '';

  datos
    .filter(s =>
      `${s.codigo} ${s.nombre}`
        .toLowerCase()
        .includes(buscar.value.toLowerCase())
    )
    .forEach(s => {
      const tr = document.createElement('tr');

      if (s.is_deleted) {
        tr.style.opacity = '0.5';
        tr.style.textDecoration = 'line-through';
      }

      tr.innerHTML = `
        <td>${s.codigo}</td>
        <td>${s.nombre}</td>
        <td>${s.sucursal_local ? 'Si' : ''}</td>
        <td>${s.is_deleted ? 'ELIMINADA' : 'ACTIVA'}</td>
        <td>
          ${
            s.is_deleted
              ? `<button onclick="reactivar(${s.id})">Reactivar</button>`
              : `
                <button onclick="editar(${s.id})">Editar</button>
                <button onclick="eliminar(${s.id})">Eliminar</button>
              `
          }
        </td>
      `;

      tabla.appendChild(tr);
    });
}

guardarBtn.onclick = async () => {
  if (!codigo.value || !nombre.value) {
    alert('Completa codigo y nombre');
    return;
  }

  guardarBtn.disabled = true;

  try {
    const data = {
      codigo: codigo.value.trim(),
      nombre: nombre.value.trim(),
      direccion: direccion.value.trim(),
      telefono: telefono.value.trim(),
      sucursal_local: sucursalLocal.checked
    };

    if (editandoId) {
      await window.apiSucursales.actualizar({ ...data, id: editandoId });
    } else {
      await window.apiSucursales.crear(data);
    }

    limpiar();
    await cargar();
  } catch (error) {
    alert(error.message || 'No se pudo guardar la sucursal');
  } finally {
    guardarBtn.disabled = false;
  }
};

function editar(id) {
  const datos = sucursalesCache.find(s => Number(s.id) === Number(id));
  if (!datos) return;

  editandoId = id;
  codigo.value = datos.codigo || '';
  nombre.value = datos.nombre || '';
  direccion.value = datos.direccion || '';
  telefono.value = datos.telefono || '';
  sucursalLocal.checked = Boolean(datos.sucursal_local);

  tituloForm.textContent = 'Editar Sucursal';
  cancelarBtn.style.display = 'inline';
}

function limpiar() {
  editandoId = null;
  codigo.value = '';
  nombre.value = '';
  direccion.value = '';
  telefono.value = '';
  sucursalLocal.checked = false;
  tituloForm.textContent = 'Nueva Sucursal';
  cancelarBtn.style.display = 'none';
}

async function eliminar(id) {
  if (confirm('Eliminar sucursal?')) {
    await window.apiSucursales.eliminar(id);
    cargar();
  }
}

async function reactivar(id) {
  await window.apiSucursales.reactivar(id);
  cargar();
}

cancelarBtn.onclick = limpiar;
buscar.oninput = cargar;
verEliminados.onchange = cargar;

cargar();
