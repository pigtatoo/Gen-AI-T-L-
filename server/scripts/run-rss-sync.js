#!/usr/bin/env node

/**
 * Standalone RSS Sync Script
 * Runs independently without needing Express server
 * Perfect for GitHub Actions scheduling
 */

require('dotenv').config();

const sequelize = require('../config/database');

// Import models to establish relationships
const User = require('../models/User');
const Module = require('../models/Modules');
const Topic = require('../models/Topics');

// Define relationships (same as server.js)
User.hasMany(Module, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Module.belongsTo(User, { foreignKey: 'user_id' });
Module.hasMany(Topic, { foreignKey: 'module_id', onDelete: 'CASCADE' });
Topic.belongsTo(Module, { foreignKey: 'module_id' });

const { syncRssWeekly } = require('../jobs/rssSync');

async function runSync() {
  try {
    console.log('🚀 Starting standalone RSS sync...');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log(`📦 DeepSeek API: ${process.env.DEEPSEEK_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`� DATABASE_URL: ${process.env.DATABASE_URL ? '✓ Set' : '✗ Not set'}`);
    console.log('');

    // Sync database
    console.log('Syncing database...');
    await sequelize.sync({ alter: true });
    console.log('✓ Database synced\n');

    // Run the sync job
    await syncRssWeekly();

    console.log('\n✅ RSS sync completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ RSS sync failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the sync
runSync();
