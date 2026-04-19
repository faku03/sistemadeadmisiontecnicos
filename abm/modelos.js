let editandoId = null;

const buscar = document.getElementById('buscar');
const btnBuscar = document.getElementById('btnBuscar');
const verEliminados = document.getElementById('verEliminados');
const tabla = document.getElementById('tabla');

const tipoEquipo = document.getElementById('tipoEquipo');
const marca = document.getElementById('marca');
const nombre = document.getElementById('nombre');

const guardar = document.getElementById('guardar');
const cancelar = document.getElementById('cancelar');
const tituloForm = document.getElementById('tituloForm');

/* ================== CARGAS INICIALES ================== */

async function cargarTipos() {
  const tipos = await window.api.listarTipos();
  tipoEquipo.innerHTML = '<option value="">Tipo de equipo</option>';

  tipos.filter(t => !t.is_deleted).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.descripcion;
    tipoEquipo.appendChild(opt);
  });
}

async function cargarMarcas() {
  const marcas = await window.api.listarMarcas();
  marca.innerHTML = '<option value="">Marca</option>';

  marcas.filter(m => !m.is_deleted).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.nombre;
    marca.appendChild(opt);
  });
}

/* ================== GRILLA ================== */

async function cargar() {
  const datos = await window.apiModelos.listar(verEliminados.checked);
  tabla.innerHTML = '';

  const filtro = buscar.value.toLowerCase();

  datos
    .filter(d =>
      `${d.tipo} ${d.marca} ${d.modelo}`
        .toLowerCase()
        .includes(filtro)
    )
    .forEach(d => {
      const tr = document.createElement('tr');

      if (d.is_deleted) {
        tr.style.opacity = '0.5';
        tr.style.textDecoration = 'line-through';
      }

      tr.innerHTML = `
        <td>${d.tipo}</td>
        <td>${d.marca}</td>
        <td>${d.modelo}</td>
        <td>${d.is_deleted ? 'ELIMINADO' : 'ACTIVO'}</td>
        <td>
          ${
            d.is_deleted
              ? `<button onclick="reactivar(${d.id})">Reactivar</button>`
              : `
                <button onclick="editar(${d.id}, ${d.tipo_equipo_id}, ${d.marca_id}, '${d.modelo}')">Editar</button>
                <button onclick="eliminar(${d.id})">Eliminar</button>
              `
          }
        </td>
      `;

      tabla.appendChild(tr);
    });
}

/* ================== FORM ================== */

guardar.onclick = async () => {
  if (!tipoEquipo.value || !marca.value || !nombre.value.trim()) {
    alert('Completá tipo, marca y modelo');
    return;
  }

  const data = {
    tipo_equipo_id: tipoEquipo.value,
    marca_id: marca.value,
    nombre: nombre.value.trim()
  };

  if (editandoId) {
    await window.apiModelos.actualizar({ ...data, id: editandoId });
  } else {
    await window.apiModelos.crear(data);
  }

  limpiar();
  cargar();
};

function editar(id, tipoId, marcaId, modelo) {
  editandoId = id;
  tipoEquipo.value = tipoId;
  marca.value = marcaId;
  nombre.value = modelo;

  tituloForm.textContent = 'Editar Modelo';
  cancelar.style.display = 'inline';
}

function limpiar() {
  editandoId = null;
  nombre.value = '';
  tituloForm.textContent = 'Nuevo Modelo';
  cancelar.style.display = 'none';
}

/* ================== ACCIONES ================== */

async function eliminar(id) {
  if (confirm('¿Eliminar modelo?')) {
    await window.apiModelos.eliminar(id);
    cargar();
  }
}

async function reactivar(id) {
  await window.apiModelos.reactivar(id);
  cargar();
}

/* ================== EVENTOS ================== */

btnBuscar.onclick = cargar;
verEliminados.onchange = cargar;
cancelar.onclick = limpiar;

/* ================== INIT ================== */
(async () => {
  await cargarTipos();
  await cargarMarcas();
  cargar();
})();
