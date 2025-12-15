const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

// If DATABASE_URL is provided (Supabase connection string), use it
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
} else {
  // Otherwise use individual credentials (local MySQL)
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
