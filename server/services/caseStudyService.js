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
  if (!Array.isArray(mappedArticles) || !Array.isArray(selectedTopics) || selectedTopics.length === 0) {
    return [];
  }

  const topicLower = selectedTopics
    .filter((t) => typeof t === 'string' && t.trim().length > 0)
    .map((t) => t.toLowerCase());

  if (topicLower.length === 0) return [];

  const relevant = [];

  // Support two shapes:
  // 1) Legacy: [ { topicTitle, articles } ]
  // 2) Module-first: [ { moduleId, moduleTitle, topics: [ { topicId, topicTitle, articles } ] } ]
  const looksModuleFirst = mappedArticles.some((m) => Array.isArray(m?.topics));

  if (looksModuleFirst) {
    for (const mod of mappedArticles) {
      const topics = Array.isArray(mod?.topics) ? mod.topics : [];
      for (const t of topics) {
        const title = typeof t?.topicTitle === 'string' ? t.topicTitle : '';
        const titleLower = title.toLowerCase();
        if (titleLower && topicLower.some((q) => titleLower.includes(q))) {
          relevant.push({
            topic: title,
            articles: Array.isArray(t?.articles) ? t.articles : []
          });
        }
      }
    }
  } else {
    // Legacy shape
    for (const topicData of mappedArticles) {
      const title = typeof topicData?.topicTitle === 'string' ? topicData.topicTitle : '';
      const titleLower = title.toLowerCase();
      if (titleLower && topicLower.some((q) => titleLower.includes(q))) {
        relevant.push({
          topic: title,
          articles: Array.isArray(topicData?.articles) ? topicData.articles : []
        });
      }
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

  let formatted = '\n\n## 📚 Real-World Case Studies & Recent Incidents:\n';

  for (const topicGroup of articlesData) {
    formatted += `\n### Topic: ${topicGroup.topic}\n`;
    formatted += '---\n';

    // Sort by confidence score (highest first) and keep only top 3
    const topArticles = (topicGroup.articles || [])
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, 3);

    topArticles.forEach((article, idx) => {
      const publishDate = new Date(article.published).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const confidence = Math.round((article.confidence * 100));

      // Consistent format for ALL articles
      formatted += `\n**📌 Case Study ${idx + 1}: ${article.title}**\n`;
      formatted += `\n📰 **Source:** ${article.source}\n`;
      formatted += `📅 **Date:** ${publishDate}\n`;
      formatted += `🎯 **Relevance:** ${confidence}%\n`;
      formatted += `💡 **Why it matches:** ${article.reasoning || 'Related to this topic'}\n`;
      formatted += `📖 **Summary:** ${article.summary?.substring(0, 300) || 'See full article'}...\n`;
      formatted += `🔗 **[Read Full Article](${article.url})**\n`;
    });
  }

  formatted += '\n\n---\n';
  formatted += '**CRITICAL INSTRUCTIONS FOR DEEPSEEK:**\n';
  formatted += '1. When user asks for "case study", "incident", "example", "real-world", "latest", or "recent":\n';
  formatted += '   - Reference the case studies above with specific details\n';
  formatted += '   - ALWAYS include the full URL so user can click and read\n';
  formatted += '   - Include date, source, and relevance percentage\n';
  formatted += '   - Provide detailed analysis connecting theory to practice\n';
  formatted += '2. Format example: "The [Title] incident ([Date], [Source]) demonstrates [concept]. Learn more: [URL]"\n';
  formatted += '3. NEVER abbreviate or hide URLs - always provide complete link\n';
  formatted += '4. Show relevance scores to justify why each article matches the topic\n';

  return formatted;
}

module.exports = {
  getLatestMappedArticles,
  getArticlesForTopics,
  formatArticlesForPrompt
};
