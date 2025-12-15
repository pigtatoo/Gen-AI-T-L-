#!/usr/bin/env node

/**
 * Test database connection
 */

require('dotenv').config();
const sequelize = require('../config/database');

async function testConnection() {
  try {
    console.log('🔗 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    console.log(`Database: ${process.env.DATABASE_URL ? 'Supabase (PostgreSQL)' : 'Local MySQL'}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
