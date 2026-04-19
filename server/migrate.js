const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const licenseSchema = fs.readFileSync(path.join(__dirname, 'schema-licenses.sql'), 'utf8');
  await pool.query(schema);
  await pool.query(licenseSchema);
  console.log('PostgreSQL schema OK');
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
