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
 * Analyze all articles against ALL MODULES first, then TOPICS within each module
 * So newly added topics automatically inherit module-level articles
 */
async function analyzeAndMapArticles(articles) {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 2: Module & Topic Filtering (Module-First)');
  console.log('='.repeat(60));

  try {
    // Fetch all modules and topics
    const allModules = await Module.findAll({
      include: [{ model: Topic, attributes: ['topic_id', 'title'] }],
      attributes: ['module_id', 'title']
    });

    if (allModules.length === 0) {
      console.warn('No modules found in database');
      return [];
    }

    console.log(`Found ${allModules.length} modules`);
    console.log(`Found ${articles.length} articles to analyze\n`);

    const mappedResults = [];

    // STEP 1: For each article, find RELEVANT MODULES
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];

      console.log(`\n[Article ${i + 1}/${articles.length}] "${article.title}"`);

      // Find modules that match this article
      const moduleMatches = await findRelevantModules(article, allModules);

      // STEP 2: For each matched module, find relevant TOPICS
      for (const moduleMatch of moduleMatches) {
        const module = allModules.find((m) => m.module_id === moduleMatch.moduleId);
        if (!module) continue;

        // Find topics within this module that match the article
        const topicMatches = await findRelevantTopicsInModule(
          article,
          module.Topics || [],
          moduleMatch.moduleTitle
        );

        // Add to results
        for (const topicMatch of topicMatches) {
          if (topicMatch.confidence >= 0.5) {
            let moduleEntry = mappedResults.find(
              (m) => m.moduleId === moduleMatch.moduleId
            );

            if (!moduleEntry) {
              moduleEntry = {
                moduleId: moduleMatch.moduleId,
                moduleTitle: moduleMatch.moduleTitle,
                moduleConfidence: moduleMatch.confidence,
                topics: []
              };
              mappedResults.push(moduleEntry);
            }

            let topicEntry = moduleEntry.topics.find(
              (t) => t.topicId === topicMatch.topicId
            );

            if (!topicEntry) {
              topicEntry = {
                topicId: topicMatch.topicId,
                topicTitle: topicMatch.topicTitle,
                articleCount: 0,
                articles: []
              };
              moduleEntry.topics.push(topicEntry);
            }

            // Add article if not already there and under 3 articles per topic
            const exists = topicEntry.articles.some((a) => a.url === article.url);
            if (!exists && topicEntry.articles.length < 3) {
              topicEntry.articles.push({
                title: article.title,
                url: article.url,
                source: article.source,
                published: article.published,
                summary: article.summary,
                confidence: topicMatch.confidence,
                reasoning: topicMatch.reasoning
              });
              topicEntry.articleCount = topicEntry.articles.length;
            }
          }
        }
      }

      if (i < articles.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Sort articles within each topic by confidence
    mappedResults.forEach((moduleEntry) => {
      moduleEntry.topics.forEach((topicEntry) => {
        topicEntry.articles.sort((a, b) => b.confidence - a.confidence);
      });
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Mapping complete: ${mappedResults.length} modules with topics`);
    console.log('='.repeat(60) + '\n');

    return mappedResults;
  } catch (err) {
    console.error('Error in analyzeAndMapArticles:', err.message);
    throw err;
  }
}

/**
 * Find relevant MODULES for an article
 */
async function findRelevantModules(article, allModules) {
  try {
    const moduleList = allModules.map((m) => `"${m.title}"`).join(', ');

    const prompt = `You are a module relevance analyzer. Given an article and a list of modules, find the TOP 3 most relevant modules.

Article Title: "${article.title}"
Article Summary: "${article.summary}"
Article Text (first 2000 chars):
${article.articleText ? article.articleText.substring(0, 2000) : article.summary}

AVAILABLE MODULES:
${moduleList}

Respond ONLY with JSON array (no other text):
[
  {"title": "Module Name", "confidence": 0.85},
  ...
]
Confidence should be 0-1. Include ONLY top 3 items. No markdown.`;

    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a module relevance analyzer. Respond ONLY with valid JSON array. No markdown, no code blocks, no other text.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 300
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const text = response.data.choices[0].message.content;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('  Could not parse modules response');
      return [];
    }

    const suggestions = JSON.parse(jsonMatch[0]);

    const matchedModules = suggestions
      .map((suggestion) => {
        const module = allModules.find(
          (m) => m.title.toLowerCase() === suggestion.title.toLowerCase()
        );
        return module
          ? {
              moduleId: module.module_id,
              moduleTitle: module.title,
              confidence: Math.min(Math.max(suggestion.confidence, 0), 1)
            }
          : null;
      })
      .filter((m) => m !== null && m.confidence >= 0.5);

    console.log(
      `  → Relevant modules: ${matchedModules.map((m) => `${m.moduleTitle} (${(m.confidence * 100).toFixed(0)}%)`).join(', ')}`
    );

    return matchedModules.slice(0, 3);
  } catch (err) {
    console.error(`  Error finding modules:`, err.message);
    return [];
  }
}

/**
 * Find relevant TOPICS within a specific module
 */
async function findRelevantTopicsInModule(article, topicsInModule, moduleName) {
  try {
    if (topicsInModule.length === 0) {
      return [];
    }

    const topicList = topicsInModule.map((t) => `"${t.title}"`).join(', ');

    const prompt = `You are a topic relevance analyzer. Given an article and a list of topics within the "${moduleName}" module, find the TOP 3 most relevant topics.

Article Title: "${article.title}"
Article Summary: "${article.summary}"
Article Text (first 1500 chars):
${article.articleText ? article.articleText.substring(0, 1500) : article.summary}

AVAILABLE TOPICS IN "${moduleName}" MODULE:
${topicList}

Respond ONLY with JSON array (no other text):
[
  {"title": "Topic Name", "confidence": 0.85, "reasoning": "why it matches"},
  ...
]
Confidence should be 0-1. Include top 3 items. No markdown.`;

    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a topic relevance analyzer. Respond ONLY with valid JSON array. No markdown.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 300
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const text = response.data.choices[0].message.content;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const suggestions = JSON.parse(jsonMatch[0]);

    const matchedTopics = suggestions
      .map((suggestion) => {
        const topic = topicsInModule.find(
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

    return matchedTopics.slice(0, 3);
  } catch (err) {
    console.error(`  Error finding topics:`, err.message);
    return [];
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
  findRelevantModules,
  findRelevantTopicsInModule,
  findTopRelatedTopics
};
