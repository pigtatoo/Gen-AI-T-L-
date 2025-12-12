const axios = require('axios');
const sequelize = require('../config/database');
const Topic = require('../models/Topics');
const Module = require('../models/Modules');

/**
 * Quick relevance check using title + summary
 * Uses DeepSeek with brief prompt for speed
 */
async function isQuickRelevant(topic, article) {
  try {
    const prompt = `Is the following article relevant to the topic "${topic.title}"? 
Article title: "${article.title}"
Article summary: "${article.summary}"

Reply with ONLY "yes" or "no".`;

    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a content relevance analyzer. Answer with only "yes" or "no".'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const answer = response.data.choices[0].message.content.toLowerCase().trim();
    return answer.includes('yes');
  } catch (err) {
    console.error(`Quick relevance check failed:`, err.message);
    return false;
  }
}

/**
 * Deep relevance analysis using full article text
 * Returns confidence score 0-1
 */
async function analyzeRelevance(topic, article) {
  try {
    const prompt = `Rate how relevant this article is to the topic "${topic.title}".

Article Title: "${article.title}"
Article Summary: "${article.summary}"

Article Text (first 3000 chars):
${article.articleText ? article.articleText.substring(0, 3000) : ''}

Respond in JSON format ONLY (no other text):
{
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>"
}`;

    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'You are a content relevance analyzer. Respond only with valid JSON. No markdown, no code blocks.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const text = response.data.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('Could not parse JSON response');
      return null;
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      confidence: Math.min(Math.max(result.confidence, 0), 1), // Clamp 0-1
      reasoning: result.reasoning || ''
    };
  } catch (err) {
    console.error(`Relevance analysis failed:`, err.message);
    return null;
  }
}

/**
 * Analyze all articles for a single topic
 * Returns top 3 relevant articles with scores
 */
async function analyzeTopicRelevance(topic, articles, delayMs = 1000) {
  console.log(`\nAnalyzing ${articles.length} articles for topic: "${topic.title}"`);

  const relevant = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];

    // Step 1: Quick filter
    const isRelevant = await isQuickRelevant(topic, article);
    if (!isRelevant) {
      console.log(`  [${i + 1}/${articles.length}] ✗ Not relevant (quick check)`);
      continue;
    }

    // Step 2: Deep analysis
    const analysis = await analyzeRelevance(topic, article);
    if (!analysis) {
      console.log(`  [${i + 1}/${articles.length}] ✗ Analysis failed`);
      continue;
    }

    relevant.push({
      ...article,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning
    });

    console.log(
      `  [${i + 1}/${articles.length}] ✓ Confidence: ${(analysis.confidence * 100).toFixed(1)}%`
    );

    // Delay between requests to avoid rate limiting
    if (i < articles.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Sort by confidence descending and take top 3
  const top3 = relevant.sort((a, b) => b.confidence - a.confidence).slice(0, 3);

  console.log(`  → Found ${relevant.length} relevant, keeping top 3`);
  return top3;
}

/**
 * Analyze all articles against all topics SEMANTICALLY
 * Uses module context to find top 5 related topics per module
 * So newly added topics automatically get matched
 */
async function analyzeAndMapArticles(articles) {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 2: Topic Filtering & Mapping (Semantic)');
  console.log('='.repeat(60));

  try {
    // Fetch all topics grouped by module
    const allTopics = await Topic.findAll({
      include: [{ model: Module, attributes: ['module_id', 'title'] }],
      attributes: ['topic_id', 'title', 'module_id']
    });

    if (allTopics.length === 0) {
      console.warn('No topics found in database');
      return [];
    }

    console.log(`Found ${allTopics.length} topics to analyze against`);
    console.log(`Found ${articles.length} articles to analyze`);

    const mappedResults = [];

    // For each article, find TOP 5 most relevant topics across ALL modules
    // This allows newly added topics to be matched semantically
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];

      console.log(`\n[Article ${i + 1}/${articles.length}] "${article.title}"`);

      // Get semantic relevance scores for ALL topics
      const topicScores = await findTopRelatedTopics(article, allTopics, 5);

      // Group by topic and keep only high-confidence matches (>0.5)
      for (const topicScore of topicScores) {
        if (topicScore.confidence >= 0.5) {
          // Find if this topic already has an entry in mappedResults
          let topicEntry = mappedResults.find(
            (m) => m.topicId === topicScore.topicId
          );

          if (!topicEntry) {
            const topic = allTopics.find((t) => t.topic_id === topicScore.topicId);
            topicEntry = {
              topicId: topicScore.topicId,
              topicTitle: topic.title,
              moduleId: topic.module_id,
              moduleTitle: topic.Module?.title || 'Unknown',
              articleCount: 0,
              articles: []
            };
            mappedResults.push(topicEntry);
          }

          // Add article to this topic if not already there
          const exists = topicEntry.articles.some((a) => a.url === article.url);
          if (!exists && topicEntry.articles.length < 3) {
            topicEntry.articles.push({
              title: article.title,
              url: article.url,
              source: article.source,
              published: article.published,
              summary: article.summary,
              confidence: topicScore.confidence,
              reasoning: topicScore.reasoning
            });
            topicEntry.articleCount = topicEntry.articles.length;
          }
        }
      }

      // Delay to avoid rate limiting
      if (i < articles.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Sort articles within each topic by confidence
    mappedResults.forEach((m) => {
      m.articles.sort((a, b) => b.confidence - a.confidence);
      m.articles = m.articles.slice(0, 3); // Keep top 3 per topic
      m.articleCount = m.articles.length;
    });

    return mappedResults;
  } catch (err) {
    console.error('Error in analyzeAndMapArticles:', err.message);
    throw err;
  }
}

/**
 * Find top N related topics for an article using semantic analysis
 * Uses module context so newly added topics get matched
 */
async function findTopRelatedTopics(article, allTopics, topN = 5) {
  try {
    // Group topics by module for context
    const topicsByModule = {};
    allTopics.forEach((topic) => {
      const moduleTitle = topic.Module?.title || 'Unknown';
      if (!topicsByModule[moduleTitle]) {
        topicsByModule[moduleTitle] = [];
      }
      topicsByModule[moduleTitle].push(topic);
    });

    // Build context about all topics grouped by module
    const topicContext = Object.entries(topicsByModule)
      .map(([moduleName, topics]) => {
        const topicList = topics.map((t) => `"${t.title}"`).join(', ');
        return `Module: ${moduleName}\n  Topics: ${topicList}`;
      })
      .join('\n\n');

    const prompt = `You are a semantic relevance analyzer. Given an article and a list of topics organized by modules, find the TOP ${topN} most relevant topics.

IMPORTANT: Also consider NEW topics that might be added to modules. Score semantically - if the article is about "Cloud Infrastructure", it's relevant to topics like "Cloud", "Distributed Systems", "Infrastructure", etc.

Article Title: "${article.title}"
Article Summary: "${article.summary}"
Article Text (first 2000 chars):
${article.articleText ? article.articleText.substring(0, 2000) : article.summary}

AVAILABLE TOPICS BY MODULE:
${topicContext}

Respond ONLY with JSON array (no other text):
[
  {"title": "Topic Name", "confidence": 0.85, "reasoning": "why it matches"},
  ...
]
Confidence should be 0-1. Include ONLY ${topN} items. No markdown.`;

    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a semantic relevance analyzer. Respond ONLY with valid JSON array. No markdown, no code blocks, no other text.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 400
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const text = response.data.choices[0].message.content;

    // Extract JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('  Could not parse JSON response');
      return [];
    }

    const suggestions = JSON.parse(jsonMatch[0]);

    // Map topic titles back to topic IDs
    const scoredTopics = suggestions
      .map((suggestion) => {
        const topic = allTopics.find(
          (t) => t.title.toLowerCase() === suggestion.title.toLowerCase()
        );
        return topic
          ? {
              topicId: topic.topic_id,
              topicTitle: topic.title,
              confidence: Math.min(Math.max(suggestion.confidence, 0), 1),
              reasoning: suggestion.reasoning || ''
            }
          : null;
      })
      .filter((t) => t !== null);

    console.log(
      `  → Top related topics: ${scoredTopics.map((t) => `${t.topicTitle} (${(t.confidence * 100).toFixed(0)}%)`).join(', ')}`
    );

    return scoredTopics.slice(0, topN);
  } catch (err) {
    console.error(`  Error finding related topics:`, err.message);
    return [];
  }
}

/**
 * LEGACY: Analyze all articles against all topics (old method)
 * Kept for reference - no longer used
 */
async function analyzeAndMapArticlesLegacy(articles) {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 2: Topic Filtering & Mapping (Legacy)');
  console.log('='.repeat(60));

  try {
    // Fetch all topics from database
    const allTopics = await Topic.findAll({
      include: [{ model: Module, attributes: ['module_id', 'title'] }],
      attributes: ['topic_id', 'title', 'module_id']
    });

    if (allTopics.length === 0) {
      console.warn('No topics found in database');
      return [];
    }

    console.log(`Found ${allTopics.length} topics to analyze against`);
    console.log(`Found ${articles.length} articles to analyze`);

    const mappedResults = [];

    // For each topic, find relevant articles
    for (let i = 0; i < allTopics.length; i++) {
      const topic = allTopics[i];

      const topArticles = await analyzeTopicRelevance(topic, articles);

      if (topArticles.length > 0) {
        mappedResults.push({
          topicId: topic.topic_id,
          topicTitle: topic.title,
          moduleId: topic.module_id,
          moduleTitle: topic.Module?.title || 'Unknown',
          articleCount: topArticles.length,
          articles: topArticles.map((a) => ({
            title: a.title,
            url: a.url,
            source: a.source,
            published: a.published,
            summary: a.summary,
            confidence: a.confidence,
            reasoning: a.reasoning
          }))
        });
      }

      console.log(`\n[${i + 1}/${allTopics.length}] Topic processed\n`);
    }

    console.log('='.repeat(60));
    console.log(`Mapping complete: ${mappedResults.length} topics with articles`);
    console.log('='.repeat(60) + '\n');

    return mappedResults;
  } catch (err) {
    console.error('Article mapping failed:', err);
    throw err;
  }
}

module.exports = {
  isQuickRelevant,
  analyzeRelevance,
  analyzeTopicRelevance,
  analyzeAndMapArticles,
  findTopRelatedTopics
};
