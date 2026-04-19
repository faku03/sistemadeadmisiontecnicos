let editandoId = null;

const tabla = document.getElementById('tabla');
const buscar = document.getElementById('buscar');
const verEliminados = document.getElementById('verEliminados');

const nombre = document.getElementById('nombre');
const guardarBtn = document.getElementById('guardar');
const cancelarBtn = document.getElementById('cancelar');
const tituloForm = document.getElementById('tituloForm');

async function cargar() {
  const datos = await window.apiMarcas.listar(verEliminados.checked);
  tabla.innerHTML = '';

  datos
    .filter(m =>
      m.nombre.toLowerCase().includes(buscar.value.toLowerCase())
    )
    .forEach(m => {
      const tr = document.createElement('tr');

      if (m.is_deleted) {
        tr.style.opacity = '0.5';
        tr.style.textDecoration = 'line-through';
      }

      const acciones = document.createElement('td');

      if (m.is_deleted) {
        const btnReactivar = document.createElement('button');
        btnReactivar.textContent = 'Reactivar';
        btnReactivar.onclick = async () => {
          await window.apiMarcas.reactivar(m.id);
          cargar();
        };
        acciones.appendChild(btnReactivar);
      } else {
        const btnEditar = document.createElement('button');
        btnEditar.textContent = 'Editar';
        btnEditar.onclick = () => editar(m);

        const btnEliminar = document.createElement('button');
        btnEliminar.textContent = 'Eliminar';
        btnEliminar.onclick = async () => {
          if (confirm('¿Eliminar esta marca?')) {
            await window.apiMarcas.eliminar(m.id);
            cargar();
          }
        };

        acciones.appendChild(btnEditar);
        acciones.appendChild(btnEliminar);
      }

      tr.innerHTML = `
        <td>${m.nombre}</td>
        <td>${m.is_deleted ? 'ELIMINADA' : 'ACTIVA'}</td>
      `;

      tr.appendChild(acciones);
      tabla.appendChild(tr);
    });
}

guardarBtn.onclick = async () => {
  if (!nombre.value.trim()) {
    alert('Ingresá el nombre');
    return;
  }

  if (editandoId) {
    await window.apiMarcas.actualizar({
      id: editandoId,
      nombre: nombre.value.trim()
    });
  } else {
    await window.apiMarcas.crear({
      nombre: nombre.value.trim()
    });
  }

  limpiar();
  cargar();
};

function editar(m) {
  editandoId = m.id;
  nombre.value = m.nombre;
  tituloForm.innerText = 'Editar Marca';
  cancelarBtn.style.display = 'inline';
}

function limpiar() {
  editandoId = null;
  nombre.value = '';
  tituloForm.innerText = 'Nueva Marca';
  cancelarBtn.style.display = 'none';
}

cancelarBtn.onclick = limpiar;
buscar.oninput = cargar;
verEliminados.onchange = cargar;

cargar();
