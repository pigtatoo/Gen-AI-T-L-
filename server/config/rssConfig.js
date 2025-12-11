// RSS Feed Configuration
const rssConfig = {
  feeds: [
    'https://www.reuters.com/technology/rss',
    'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'https://www.theregister.com/headlines.atom'
  ],

  // Keywords to include (if any of these are in title/summary, include article)
  includeKeywords: [
    'cybersecurity',
    'ai',
    'artificial intelligence',
    'machine learning',
    'cloud',
    'data breach',
    'vulnerability',
    'hack',
    'malware',
    'api',
    'devops',
    'security',
    'tech',
    'technology',
    'software',
    'hardware',
    'network',
    'database',
    'encryption',
    'authentication',
    'blockchain',
    'quantum',
    '5g',
    'internet of things',
    'iot',
    'robotics',
    'automation'
  ],

  // Keywords to exclude (blacklist)
  excludeKeywords: [
    'opinion',
    'lifestyle',
    'sports',
    'entertainment',
    'celebrity',
    'gossip',
    'weather',
    'sports'
  ],

  // Fetch articles from last N days
  sinceDays: parseInt(process.env.RSS_SINCE_DAYS || '7'),

  // Timeout for fetching each article
  timeout: parseInt(process.env.RSS_TIMEOUT || '15000'),

  // Max characters for article text
  maxArticleLength: 15000,

  // Schedule: Every Sunday at 2 AM
  schedule: process.env.RSS_SYNC_SCHEDULE || '0 2 * * 0'
};

module.exports = rssConfig;
