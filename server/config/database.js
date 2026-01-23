const { Sequelize } = require('sequelize');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Build PostgreSQL connection string from Supabase
const dbHost = supabaseUrl.replace('https://', '').split('.')[0] + '.supabase.co';
const databaseUrl = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD || 'postgres'}@db.${dbHost}:5432/postgres`;

console.log('[DB Config] Connecting to Supabase (PostgreSQL)');

const sequelize = new Sequelize(databaseUrl, {
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
    family: 4  // Force IPv4 (critical for GitHub Actions)
  }
});

module.exports = sequelize;
