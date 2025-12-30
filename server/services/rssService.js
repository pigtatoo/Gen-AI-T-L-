const FeedParser = require('feedparser');
const axios = require('axios');
const { Readable } = require('stream');
const rssConfig = require('../config/rssConfig');
const supabase = require('../config/supabase');

/**
 * Parse RSS feed and extract articles published since given date
 * @param {string} url - Feed URL
 * @param {Date} sinceDate - Only include articles published after this date
 * @returns {Promise<Array>} Array of article objects
 */
async function parseRssSince(url, sinceDate) {
  const articles = [];

  return new Promise((resolve, reject) => {
    const req = axios.get(url, { timeout: rssConfig.timeout });

    req
      .then((res) => {
        const stream = Readable.from([res.data]);
        const parser = new FeedParser({});

        stream.pipe(parser);

        parser.on('readable', function () {
          let item;
          while ((item = this.read())) {
            let published = null;

            // Try to get published date
            if (item.pubdate) {
              published = new Date(item.pubdate);
            } else if (item.date) {
              published = new Date(item.date);
            } else if (item.updated) {
              published = new Date(item.updated);
            }

            // Skip if no date or too old
            if (!published || published < sinceDate) {
              continue;
            }

            articles.push({
              title: item.title || '',
              url: item.link || '',
              published,
              summary: item.summary || item.description || '',
              source: item.meta?.title || url
            });
          }
        });

        parser.on('error', (err) => {
          console.error(`RSS parse error for ${url}:`, err.message);
          resolve(articles); // Resolve with whatever we got
        });

        parser.on('end', () => {
          resolve(articles);
        });
      })
      .catch((err) => {
        console.error(`Failed to fetch RSS from ${url}:`, err.message);
        resolve(articles); // Resolve with empty array on error
      });
  });
}

/**
 * Check if article text is relevant based on keywords
 * @param {string} text - Text to check (title + summary)
 * @returns {boolean} True if relevant
 */
function isRelevant(text) {
  const t = text.toLowerCase();

  // Check exclude keywords first
  if (rssConfig.excludeKeywords.some((kw) => t.includes(kw.toLowerCase()))) {
    return false;
  }

  // Check include keywords
  return rssConfig.includeKeywords.some((kw) => t.includes(kw.toLowerCase()));
}

/**
 * Filter articles by relevance keywords
 * @param {Array} articles - Array of article objects
 * @returns {Array} Filtered articles
 */
function filterByKeywords(articles) {
  return articles.filter((article) => {
    const blob = `${article.title} ${article.summary}`;
    return isRelevant(blob);
  });
}

/**
 * Deduplicate articles by URL and title
 * @param {Array} articles - Array of article objects
 * @returns {Array} Deduplicated and sorted articles
 */
function deduplicateArticles(articles) {
  const seen = new Set();
  const unique = [];

  // Sort by publish date descending (newest first)
  const sorted = articles.sort((a, b) => b.published - a.published);

  for (const article of sorted) {
    const key = `${article.url}|${article.title}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(article);
    }
  }

  return unique;
}

/**
 * Fetch all RSS feeds and return combined articles
 * @returns {Promise<Array>} Array of article objects
 */
/**
 * Get all active RSS feeds from database, with fallback to defaults
 * First tries to get user feeds from Supabase, then falls back to hardcoded defaults
 * @returns {Promise<Array>} Array of feed URLs
 */
async function getAllFeeds() {
  try {
    // Fetch all active feeds from database (from all users)
    // Custom feeds are added ON TOP of default feeds
    const { data: userFeeds, error } = await supabase
      .from('userfeeds')
      .select('url')
      .eq('active', true);

    if (error) {
      console.warn(`⚠️  Failed to fetch feeds from database: ${error.message}`);
      console.log('📡 Using default feeds...');
      return rssConfig.feeds;
    }

    const customUrls = userFeeds.map(f => f.url);
    
    // Combine custom feeds with default feeds
    const allFeeds = [...rssConfig.feeds, ...customUrls];
    
    console.log(`📡 Loaded ${customUrls.length} custom feeds + ${rssConfig.feeds.length} default feeds = ${allFeeds.length} total feeds`);
    return allFeeds;
  } catch (err) {
    console.warn(`⚠️  Error fetching feeds: ${err.message}`);
    console.log('📡 Using default feeds...');
    return rssConfig.feeds;
  }
}

/**
 * Fetch all RSS feeds
 * @returns {Promise<Array>} Array of article objects from all feeds
 */
async function fetchAllRSSFeeds() {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - rssConfig.sinceDays);

  console.log(`Fetching RSS feeds since ${sinceDate.toISOString()}...`);

  // Get feeds from database or use defaults
  const feeds = await getAllFeeds();

  // Fetch all feeds in parallel
  const feedPromises = feeds.map((url) => parseRssSince(url, sinceDate));
  const results = await Promise.allSettled(feedPromises);

  // Combine all results
  let allArticles = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`✓ Fetched ${result.value.length} articles from ${feeds[index]}`);
      allArticles = allArticles.concat(result.value);
    } else {
      console.error(`✗ Failed to fetch ${feeds[index]}`);
    }
  });

  console.log(`Total articles fetched: ${allArticles.length}`);
  return allArticles;
}

/**
 * Main RSS sync workflow
 * @returns {Promise<Array>} Array of final articles ready for processing
 */
async function syncRSS() {
  try {
    // 1. Fetch all feeds
    let articles = await fetchAllRSSFeeds();

    if (articles.length === 0) {
      console.warn('No articles found from any feed.');
      return [];
    }

    // 2. Filter by keywords
    const filtered = filterByKeywords(articles);
    console.log(`After keyword filtering: ${filtered.length} articles`);

    if (filtered.length === 0) {
      console.warn('No relevant articles found after filtering.');
      return [];
    }

    // 3. Deduplicate
    const candidates = deduplicateArticles(filtered);
    console.log(`After deduplication: ${candidates.length} articles`);

    return candidates;
  } catch (err) {
    console.error('RSS sync failed:', err);
    return [];
  }
}

module.exports = {
  parseRssSince,
  isRelevant,
  filterByKeywords,
  deduplicateArticles,
  fetchAllRSSFeeds,
  getAllFeeds,
  syncRSS
};
