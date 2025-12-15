const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

console.log('[DB Config] Checking connection method...');
console.log('[DB Config] DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Not set');
console.log('[DB Config] DB_HOST:', process.env.DB_HOST || '✗ Not set');

// If DATABASE_URL is provided (Supabase connection string), use it
if (process.env.DATABASE_URL) {
  console.log('[DB Config] Using Supabase (PostgreSQL via DATABASE_URL)');
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      // Force IPv4 for Supabase
      family: 4
    }
  });
} else {
  // Otherwise use individual credentials (local MySQL)
  console.log('[DB Config] Using Local MySQL');
  sequelize = new Sequelize(
    process.env.DB_NAME || 'gen_ai_app',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || 'password',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: process.env.DB_DIALECT || 'mysql',
      logging: false
    }
  );
}

module.exports = sequelize;
