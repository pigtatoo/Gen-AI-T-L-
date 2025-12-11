const rssService = require('../services/rssService');
const scraperService = require('../services/scraperService');
const contentAnalyzer = require('../services/contentAnalyzer');
const fs = require('fs');
const path = require('path');

/**
 * Main RSS sync job - fetches, filters, scrapes, and analyzes articles
 * This is called by the scheduler or manually via API
 */
async function syncRssWeekly() {
  const startTime = new Date();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`RSS Sync started at ${startTime.toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Step 1: Fetch and filter RSS feeds
    const candidates = await rssService.syncRSS();

    if (candidates.length === 0) {
      console.log('No articles to process.');
      return {
        success: true,
        articlesFound: 0,
        articlesProcessed: 0,
        topicsAnalyzed: 0,
        timestamp: new Date().toISOString()
      };
    }

    // Step 2: Fetch full article text
    const enriched = await scraperService.fetchArticlesText(candidates);

    // Step 3: Filter out articles with no content
    const valid = enriched.filter((a) => a.articleText && a.articleText.length > 0);
    console.log(`\nAfter scraping: ${valid.length} articles with content`);

    if (valid.length === 0) {
      console.warn('No valid articles after scraping.');
      return {
        success: true,
        articlesFound: candidates.length,
        articlesProcessed: 0,
        topicsAnalyzed: 0,
        timestamp: new Date().toISOString()
      };
    }

    // Step 4: Analyze articles for all topics
    const mappedResults = await contentAnalyzer.analyzeAndMapArticles(valid);

    // Step 5: Save results to JSON file
    const outputFile = path.join(
      process.env.ARTICLE_OUTPUT_DIR || './temp',
      `articles_mapped_${Date.now()}.json`
    );

    // Create directory if it doesn't exist
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(mappedResults, null, 2));
    console.log(`\nSaved mapped articles to ${outputFile}`);

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`RSS Sync completed in ${duration.toFixed(2)}s`);
    console.log(`Results:`);
    console.log(`  - Articles found: ${candidates.length}`);
    console.log(`  - Articles processed: ${valid.length}`);
    console.log(`  - Topics with articles: ${mappedResults.length}`);
    console.log(`${'='.repeat(60)}\n`);

    return {
      success: true,
      articlesFound: candidates.length,
      articlesProcessed: valid.length,
      topicsAnalyzed: mappedResults.length,
      outputFile,
      duration: duration.toFixed(2),
      mappedResults,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('RSS Sync failed with error:', err);

    return {
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  syncRssWeekly
};
