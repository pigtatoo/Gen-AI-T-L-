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
 * Analyze all articles against all topics
 * Returns mapping of topics to relevant articles
 */
async function analyzeAndMapArticles(articles) {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 2: Topic Filtering & Mapping');
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
  analyzeAndMapArticles
};
