const fs = require('fs');
const path = require('path');

/**
 * Get the latest mapped articles from Phase 2 output
 * @returns {Array|null} Mapped articles or null if not found
 */
function getLatestMappedArticles() {
  try {
    const tempDir = process.env.ARTICLE_OUTPUT_DIR || './temp';

    if (!fs.existsSync(tempDir)) {
      return null;
    }

    // Find latest mapped results file
    const files = fs.readdirSync(tempDir).filter((f) => f.startsWith('articles_mapped_'));
    if (files.length === 0) {
      return null;
    }

    // Sort by filename (descending) to get latest
    files.sort().reverse();
    const latestFile = files[0];
    const filePath = path.join(tempDir, latestFile);

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data;
  } catch (err) {
    console.error('Error fetching mapped articles:', err.message);
    return null;
  }
}

/**
 * Get articles for specific topics from mapped results
 * @param {Array<string>} selectedTopics - Topic titles to filter by
 * @returns {Array} Articles relevant to selected topics
 */
function getArticlesForTopics(selectedTopics, mappedArticles) {
  if (!mappedArticles || !selectedTopics || selectedTopics.length === 0) {
    return [];
  }

  const topicLower = selectedTopics.map((t) => t.toLowerCase());
  const relevant = [];

  // Find mapped data for selected topics
  for (const topicData of mappedArticles) {
    if (topicLower.some((t) => topicData.topicTitle.toLowerCase().includes(t))) {
      relevant.push({
        topic: topicData.topicTitle,
        articles: topicData.articles
      });
    }
  }

  return relevant;
}

/**
 * Format articles for inclusion in chat system message
 * @param {Array} articlesData - Articles grouped by topic
 * @returns {string} Formatted text for system message
 */
function formatArticlesForPrompt(articlesData) {
  if (!articlesData || articlesData.length === 0) {
    return '';
  }

  let formatted = '\n\n## Recent Real-World Case Studies & Incidents:\n';

  for (const topicGroup of articlesData) {
    formatted += `\n### ${topicGroup.topic}:\n`;

    topicGroup.articles.forEach((article, idx) => {
      formatted += `\n**Case Study ${idx + 1}: ${article.title}**\n`;
      formatted += `📰 Source: ${article.source}\n`;
      formatted += `📅 Date: ${new Date(article.published).toLocaleDateString()}\n`;
      formatted += `🎯 Relevance: ${(article.confidence * 100).toFixed(0)}%\n`;
      formatted += `📄 Summary: ${article.summary?.substring(0, 300)}...\n`;
      formatted += `🔗 Full Article: ${article.url}\n`;
    });
  }

  formatted += '\n\n**IMPORTANT INSTRUCTIONS:**\n';
  formatted += '- When user asks for "case study", "incident", "example", or "latest", provide detailed analysis using these real-world case studies\n';
  formatted += '- ALWAYS include the URL of each case study you reference\n';
  formatted += '- Format as: **Title** → Summary → Analysis → URL\n';
  formatted += '- Be specific about dates, sources, and relevance percentages\n';

  return formatted;
}

module.exports = {
  getLatestMappedArticles,
  getArticlesForTopics,
  formatArticlesForPrompt
};
