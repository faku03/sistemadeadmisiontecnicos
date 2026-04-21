let editandoId = null;

document.addEventListener('DOMContentLoaded', () => {
  const tabla = document.getElementById('tabla');
  const buscar = document.getElementById('buscar');
  const verEliminados = document.getElementById('verEliminados');

  const codigo = document.getElementById('codigo');
  const descripcion = document.getElementById('descripcion');

  const guardarBtn = document.getElementById('guardar');
  const cancelarBtn = document.getElementById('cancelar');
  const tituloForm = document.getElementById('tituloForm');

  async function cargar() {
    const datos = await window.apiTiposEquipo.listar(verEliminados.checked);
    tabla.innerHTML = '';

    datos
      .filter(d =>
        d.codigo.toLowerCase().includes(buscar.value.toLowerCase()) ||
        d.descripcion.toLowerCase().includes(buscar.value.toLowerCase())
      )
      .forEach(d => {
        const tr = document.createElement('tr');

        if (d.is_deleted) {
          tr.style.opacity = '0.5';
          tr.style.textDecoration = 'line-through';
        }

        const acciones = document.createElement('td');

        if (d.is_deleted) {
          const btnReactivar = document.createElement('button');
          btnReactivar.textContent = 'Reactivar';
          btnReactivar.onclick = async () => {
            await window.apiTiposEquipo.reactivar(d.id);
            cargar();
          };
          acciones.appendChild(btnReactivar);
        } else {
          const btnEditar = document.createElement('button');
          btnEditar.textContent = 'Editar';
          btnEditar.onclick = () => editar(d);

          const btnEliminar = document.createElement('button');
          btnEliminar.textContent = 'Eliminar';
          btnEliminar.onclick = async () => {
            if (confirm('¿Eliminar este tipo?')) {
              await window.apiTiposEquipo.eliminar(d.id);
              cargar();
            }
          };

          acciones.appendChild(btnEditar);
          acciones.appendChild(btnEliminar);
        }

        tr.innerHTML = `
          <td>${d.codigo}</td>
          <td>${d.descripcion}</td>
          <td>${d.is_deleted ? 'ELIMINADO' : 'ACTIVO'}</td>
        `;

        tr.appendChild(acciones);
        tabla.appendChild(tr);
      });
  }

  function editar(d) {
    editandoId = d.id;
    codigo.value = d.codigo;
    descripcion.value = d.descripcion;
    tituloForm.textContent = 'Editar Tipo';
    cancelarBtn.style.display = 'inline';
  }

  function limpiar() {
    editandoId = null;
    codigo.value = '';
    descripcion.value = '';
    tituloForm.textContent = 'Nuevo Tipo';
    cancelarBtn.style.display = 'none';
  }

  guardarBtn.onclick = async () => {
    if (!codigo.value.trim() || !descripcion.value.trim()) {
      alert('Completa todos los campos');
      return;
    }

    guardarBtn.disabled = true;

    try {
      if (editandoId) {
        await window.apiTiposEquipo.actualizar({
          id: editandoId,
          codigo: codigo.value.trim(),
          descripcion: descripcion.value.trim()
        });
      } else {
        await window.apiTiposEquipo.crear({
          codigo: codigo.value.trim(),
          descripcion: descripcion.value.trim()
        });
      }

      limpiar();
      await cargar();
    } catch (error) {
      alert(error.message || 'No se pudo guardar el tipo de equipo');
    } finally {
      guardarBtn.disabled = false;
    }
  };

  cancelarBtn.onclick = limpiar;
  buscar.oninput = cargar;
  verEliminados.onchange = cargar;

  cargar();
});
