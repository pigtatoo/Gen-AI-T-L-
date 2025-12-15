#!/usr/bin/env node

/**
 * Sync MySQL to Supabase
 * Copies User, Module, and Topic data from local MySQL to Supabase
 * Run manually: node scripts/sync-mysql-to-supabase.js
 * Or set up cron job to run periodically
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// MySQL connection (local)
const mysqlDb = new Sequelize(
  process.env.DB_NAME || 'gen_ai_app',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'mysql',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
);

// Supabase connection
const supabaseDb = new Sequelize(
  'postgresql://postgres:!NypFyp2025@db.uzcaxtxmkcfjuofgbalw.supabase.co:5432/postgres',
  {
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
      }
    }
  }
);

async function syncDatabases() {
  try {
    console.log('🔄 Starting MySQL → Supabase sync...\n');

    // Test connections
    console.log('Testing MySQL connection...');
    await mysqlDb.authenticate();
    console.log('✓ MySQL connected\n');

    console.log('Testing Supabase connection...');
    await supabaseDb.authenticate();
    console.log('✓ Supabase connected\n');

    // Define models for MySQL
    const MysqlUser = mysqlDb.define('User', {
      user_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      email: Sequelize.STRING,
      password: Sequelize.STRING,
      created_at: Sequelize.DATE
    }, { tableName: 'Users', timestamps: false });

    const MysqlModule = mysqlDb.define('Module', {
      module_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: Sequelize.INTEGER,
      title: Sequelize.STRING,
      description: Sequelize.TEXT,
      created_at: Sequelize.DATE
    }, { tableName: 'Modules', timestamps: false });

    const MysqlTopic = mysqlDb.define('Topic', {
      topic_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      module_id: Sequelize.INTEGER,
      title: Sequelize.STRING,
      description: Sequelize.TEXT,
      created_at: Sequelize.DATE
    }, { tableName: 'Topics', timestamps: false });

    // Define models for Supabase
    const SupabaseUser = supabaseDb.define('User', {
      user_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      email: Sequelize.STRING,
      password: Sequelize.STRING,
      created_at: Sequelize.DATE
    }, { tableName: 'Users', timestamps: false });

    const SupabaseModule = supabaseDb.define('Module', {
      module_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: Sequelize.INTEGER,
      title: Sequelize.STRING,
      description: Sequelize.TEXT,
      created_at: Sequelize.DATE
    }, { tableName: 'Modules', timestamps: false });

    const SupabaseTopic = supabaseDb.define('Topic', {
      topic_id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      module_id: Sequelize.INTEGER,
      title: Sequelize.STRING,
      description: Sequelize.TEXT,
      created_at: Sequelize.DATE
    }, { tableName: 'Topics', timestamps: false });

    // Sync Users
    console.log('Syncing Users...');
    const users = await MysqlUser.findAll({ raw: true });
    console.log(`  Found ${users.length} users in MySQL`);
    
    for (const user of users) {
      await SupabaseUser.upsert(user, { conflictFields: ['user_id'] });
    }
    console.log(`✓ Synced ${users.length} users\n`);

    // Sync Modules
    console.log('Syncing Modules...');
    const modules = await MysqlModule.findAll({ raw: true });
    console.log(`  Found ${modules.length} modules in MySQL`);
    
    for (const module of modules) {
      await SupabaseModule.upsert(module, { conflictFields: ['module_id'] });
    }
    console.log(`✓ Synced ${modules.length} modules\n`);

    // Sync Topics
    console.log('Syncing Topics...');
    const topics = await MysqlTopic.findAll({ raw: true });
    console.log(`  Found ${topics.length} topics in MySQL`);
    
    for (const topic of topics) {
      await SupabaseTopic.upsert(topic, { conflictFields: ['topic_id'] });
    }
    console.log(`✓ Synced ${topics.length} topics\n`);

    console.log('✅ Sync completed successfully!');
    console.log('\nSummary:');
    console.log(`  • Users: ${users.length}`);
    console.log(`  • Modules: ${modules.length}`);
    console.log(`  • Topics: ${topics.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await mysqlDb.close();
    await supabaseDb.close();
  }
}

syncDatabases();
