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
      
      // Save articles to Supabase
      for (const module of result.mappedResults) {
        for (const topic of module.topics) {
          for (const article of topic.articles) {
            const { error } = await supabase.from('Articles').insert({
              title: article.title,
              url: article.url,
              source: article.source,
              published: article.published,
              summary: article.summary,
              topic_id: topic.topicId,
              module_id: module.moduleId,
              confidence: article.confidence,
              reasoning: article.reasoning
            });

            if (error) {
              console.error(`Failed to insert article: ${error.message}`);
            }
          }
        }
      }
      
      console.log(`✓ Saved ${result.articlesProcessed} articles to Supabase`);
    }

    console.log('\n✅ RSS sync completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ RSS sync failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the sync
runSync();
