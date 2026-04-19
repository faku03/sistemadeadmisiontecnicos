const config = {
  port: Number(process.env.SISTEMA_TICKETS_API_PORT || process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || '',
  pg: {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || 'sistema_tickets',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || ''
  }
};

module.exports = config;
