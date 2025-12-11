const axios = require('axios');
const cheerio = require('cheerio');
const rssConfig = require('../config/rssConfig');

/**
 * Fetch and parse article text from URL
 * @param {string} url - Article URL
 * @returns {Promise<string>} Extracted article text
 */
async function fetchArticleText(url) {
  try {
    const response = await axios.get(url, {
      timeout: rssConfig.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Remove unwanted elements
    const unwantedSelectors = [
      'script',
      'style',
      'nav',
      'footer',
      'header',
      'noscript',
      'aside',
      '.advertisement',
      '.ads',
      '.sidebar',
      'iframe'
    ];

    unwantedSelectors.forEach((selector) => {
      $(selector).remove();
    });

    // Extract paragraphs and list items
    const paragraphs = [];
    $('p, li').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.length > 0) {
        paragraphs.push(text);
      }
    });

    // Join paragraphs
    let articleText = paragraphs.join(' ');

    // Limit to max length
    if (articleText.length > rssConfig.maxArticleLength) {
      articleText = articleText.substring(0, rssConfig.maxArticleLength) + '...';
    }

    return articleText;
  } catch (err) {
    console.error(`Failed to fetch article from ${url}:`, err.message);
    return '';
  }
}

/**
 * Fetch article text for multiple articles
 * @param {Array} articles - Array of article objects
 * @returns {Promise<Array>} Articles with added articleText field
 */
async function fetchArticlesText(articles) {
  console.log(`Fetching full text for ${articles.length} articles...`);

  const enriched = [];

  for (const article of articles) {
    const text = await fetchArticleText(article.url);
    enriched.push({
      ...article,
      articleText: text
    });

    // Log progress
    if (enriched.length % 5 === 0) {
      console.log(`  Progress: ${enriched.length}/${articles.length}`);
    }
  }

  console.log(`Fetched text for ${enriched.length} articles`);
  return enriched;
}

module.exports = {
  fetchArticleText,
  fetchArticlesText
};
