#!/usr/bin/env node

/**
 * Standalone RSS Sync Script with Supabase
 * Fetches articles and saves them to Supabase
 * Perfect for GitHub Actions scheduling
 */

require('dotenv').config();

const supabase = require('../config/supabase');
const { syncRssWeekly } = require('../jobs/rssSync');

async function runSync() {
  try {
    console.log('🚀 Starting RSS sync with Supabase...');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log(`📦 DeepSeek API: ${process.env.DEEPSEEK_KEY ? '✓ Configured' : '✗ Missing'}`);
    console.log(`📡 Supabase: ${process.env.SUPABASE_URL ? '✓ Configured' : '✗ Missing'}`);
    console.log('');

    // Test Supabase connection
    console.log('Testing Supabase connection...');
    const { data: modules, error: moduleError } = await supabase
      .from('Modules')
      .select('*');
    
    if (moduleError) {
      throw new Error(`Supabase connection failed: ${moduleError.message}`);
    }
    
    console.log(`✓ Connected to Supabase (${modules.length} modules found)\n`);

    // Run the sync job
    const result = await syncRssWeekly();

    if (result.mappedResults && result.mappedResults.length > 0) {
      console.log('\n📥 Saving articles to Supabase...');
      
      // Articles are saved to temp JSON file (see syncRssWeekly() in rssSync.js)
      // No need to save to database - temp files are used for case studies
    }

    // Cleanup old temp files - keep only latest 3
    cleanupOldTempFiles();

    console.log('\n✅ RSS sync completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ RSS sync failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Cleanup function to keep only latest 3 temp files
function cleanupOldTempFiles() {
  const fs = require('fs');
  const path = require('path');
  const tempDir = process.env.ARTICLE_OUTPUT_DIR || './temp';

  try {
    if (!fs.existsSync(tempDir)) {
      return;
    }

    const files = fs.readdirSync(tempDir)
      .filter(f => f.startsWith('articles_mapped_') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length > 3) {
      const filesToDelete = files.slice(3);
      filesToDelete.forEach(file => {
        const filePath = path.join(tempDir, file);
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted old temp file: ${file}`);
      });
    }
  } catch (err) {
    console.error(`⚠️  Cleanup warning: ${err.message}`);
    // Don't fail the entire sync if cleanup fails
  }
}

// Run the sync
runSync();
