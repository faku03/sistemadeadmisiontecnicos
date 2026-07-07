const { pool } = require('../server/db');

const fallas = [
  ['FTEST01', 'Pantalla rota o astillada'],
  ['FTEST02', 'Equipo mojado o con humedad'],
  ['FTEST03', 'No reconoce chip / SIM'],
  ['FTEST04', 'Microfono no funciona'],
  ['FTEST05', 'Parlante distorsionado'],
  ['FTEST06', 'Camara no abre o falla'],
  ['FTEST07', 'Boton de encendido trabado'],
  ['FTEST08', 'Equipo se reinicia solo'],
  ['FTEST09', 'Sistema lento o bloqueado'],
  ['FTEST10', 'No conecta WiFi'],
  ['FTEST11', 'No conecta Bluetooth'],
  ['FTEST12', 'Pin de carga flojo'],
  ['FTEST13', 'Bateria hinchada'],
  ['FTEST14', 'Imagen con manchas o lineas'],
  ['FTEST15', 'No vibra']
];

const trabajos = [
  ['TTEST01', 'Cambio de pantalla completa'],
  ['TTEST02', 'Secado quimico y limpieza interna'],
  ['TTEST03', 'Reparacion de lector SIM'],
  ['TTEST04', 'Cambio de microfono'],
  ['TTEST05', 'Cambio de parlante'],
  ['TTEST06', 'Cambio de camara'],
  ['TTEST07', 'Cambio de flex de encendido'],
  ['TTEST08', 'Reinstalacion de software'],
  ['TTEST09', 'Optimizacion y limpieza de sistema'],
  ['TTEST10', 'Reparacion de antena WiFi'],
  ['TTEST11', 'Reparacion de modulo Bluetooth'],
  ['TTEST12', 'Cambio de pin de carga'],
  ['TTEST13', 'Cambio de bateria'],
  ['TTEST14', 'Cambio de modulo display'],
  ['TTEST15', 'Cambio de motor vibrador']
];

const repuestos = [
  ['RTEST01', 'Pantalla completa'],
  ['RTEST02', 'Kit de limpieza quimica'],
  ['RTEST03', 'Lector SIM'],
  ['RTEST04', 'Microfono'],
  ['RTEST05', 'Parlante auricular'],
  ['RTEST06', 'Camara trasera'],
  ['RTEST07', 'Flex de encendido'],
  ['RTEST08', 'Firmware / software'],
  ['RTEST09', 'Memoria / almacenamiento'],
  ['RTEST10', 'Antena WiFi'],
  ['RTEST11', 'Modulo Bluetooth'],
  ['RTEST12', 'Pin de carga'],
  ['RTEST13', 'Bateria'],
  ['RTEST14', 'Modulo display'],
  ['RTEST15', 'Motor vibrador']
];

async function upsert(table, rows) {
  const values = rows
    .map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2}, TRUE, NOW())`)
    .join(',\n');
  const params = rows.flatMap(([codigo, descripcion]) => [codigo, descripcion]);

  await pool.query(
    `
    INSERT INTO ${table} (codigo, descripcion, activo, updated_at)
    VALUES ${values}
    ON CONFLICT (codigo) DO UPDATE
    SET descripcion = EXCLUDED.descripcion,
        activo = TRUE,
        updated_at = NOW()
    `,
    params
  );
}

async function main() {
  await upsert('fallas_oficiales', fallas);
  await upsert('trabajos_oficiales', trabajos);
  await upsert('repuestos_oficiales', repuestos);

  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM fallas_oficiales WHERE codigo LIKE 'FTEST%') AS fallas,
      (SELECT COUNT(*) FROM trabajos_oficiales WHERE codigo LIKE 'TTEST%') AS trabajos,
      (SELECT COUNT(*) FROM repuestos_oficiales WHERE codigo LIKE 'RTEST%') AS repuestos
  `);

  console.log(`Datos cargados: fallas=${counts.rows[0].fallas}, trabajos=${counts.rows[0].trabajos}, repuestos=${counts.rows[0].repuestos}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
