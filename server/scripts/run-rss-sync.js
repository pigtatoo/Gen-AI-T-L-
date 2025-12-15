#!/usr/bin/env node

/**
 * Standalone RSS Sync Script
 * Runs independently without needing Express server
 * Perfect for GitHub Actions scheduling
 */

require('dotenv').config();

const sequelize = require('../config/database');
const { syncRssWeekly } = require('../jobs/rssSync');

async function runSync() {
  try {
    console.log('🚀 Starting standalone RSS sync...');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log(`📦 DeepSeek API: ${process.env.DEEPSEEK_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`🗄️  Database: ${process.env.DB_HOST || 'localhost'}`);
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
