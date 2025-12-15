const express = require('express');
const cors = require('cors');
// Supabase client (HTTPS-based, avoids local Postgres DNS issues)
const supabase = require('./config/supabase');
require('dotenv').config();
const axios = require('axios'); // for DeepSeek API requests

// Routes
const authRoutes = require('./routes/auth');
const modulesRoutes = require('./routes/modules');
const topicsRoutes = require('./routes/topics');
const articlesRoutes = require('./routes/articles');

// Scheduler
const { initScheduler } = require('./jobs/scheduler');

// Services
const caseStudyService = require('./services/caseStudyService');

const User = require('./models/User');
const Module = require('./models/Modules');
const Topic = require('./models/Topics');

// Define relationships
User.hasMany(Module, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Module.belongsTo(User, { foreignKey: 'user_id' });
Module.hasMany(Topic, { foreignKey: 'module_id', onDelete: 'CASCADE' });
Topic.belongsTo(Module, { foreignKey: 'module_id' });

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Database sync disabled: using Supabase client instead of Sequelize
console.log('[DB] Using Supabase client; skipping Sequelize sync');

// Simple health check to verify Supabase connectivity at startup
app.get('/health', async (req, res) => {
  try {
    const { error } = await supabase.from('Modules').select('module_id', { count: 'exact', head: true });
    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
    return res.json({ status: 'ok' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e.message });
  }
});

// Auth routes
app.use('/api/auth', authRoutes);

// Modules routes
app.use('/api/modules', modulesRoutes);

// Topics routes (nested under modules)
app.use('/api/modules/:moduleId/topics', topicsRoutes);

// Articles routes (RSS, scraping, etc)
app.use('/api/articles', articlesRoutes);

// -----------------------------
// DeepSeek Chat Endpoint
// -----------------------------
app.post('/api/chat', async (req, res) => {
  const { message, moduleTitle, moduleDescription, selectedTopics } = req.body;

  if (!message) return res.status(400).json({ error: 'No message provided' });

  // Check if user is asking for case study
  const isCaseStudyRequest = /case\s*study|incident|example|latest|real[- ]?world|recent/i.test(
    message
  );

  // Check if user is asking for summary
  const isSummaryRequest = /^(summary|summarize|recap|overview|key\s*points|learning\s*points)/i.test(
    message.trim()
  );

  // Build context-aware system message
  let systemMessage = 'You are a helpful teacher assistant. Provide concise, well-organized answers for students.';
  
  if (moduleTitle) {
    systemMessage = `You are a teacher assistant for the module: "${moduleTitle}". Provide concise, well-organized summaries and explanations.`;
    
    if (moduleDescription) {
      systemMessage += `\n\nModule description: ${moduleDescription}`;
    }
    
    if (selectedTopics && selectedTopics.length > 0) {
      systemMessage += `\n\nCurrent topics being studied: ${selectedTopics.join(', ')}.`;
      systemMessage += '\n\nFocus your answers on these topics. When asked for a summary, provide key points in a structured format (use bullet points for lists). Keep explanations clear but concise to fit in a single response.';

      // If user asks for summary, add structured learning format
      if (isSummaryRequest) {
        systemMessage += 
          '\n\n**USER REQUESTING SUMMARY:** Provide a structured summary with:\n' +
          '📚 **Key Learning Points** (5-7 bullet points)\n' +
          '🎯 **Learning Objectives** (2-3 core concepts)\n' +
          '💡 **Key Takeaways** (practical insights)\n' +
          '🔗 **Real-World Applications** (how this applies in practice)\n' +
          '❓ **Common Questions** (FAQ format, 2-3 Q&As)\n' +
          'Format each section clearly with headers and use markdown formatting.';
      }

      // Add real-world case studies from mapped articles
      const mappedArticles = caseStudyService.getLatestMappedArticles();
      if (mappedArticles) {
        const topicArticles = caseStudyService.getArticlesForTopics(selectedTopics, mappedArticles);
        if (topicArticles.length > 0) {
          const articlesText = caseStudyService.formatArticlesForPrompt(topicArticles);
          systemMessage += articlesText;

          // If user asks for case study, add special instruction
          if (isCaseStudyRequest) {
            systemMessage +=
              '\n\n**USER IS REQUESTING CASE STUDIES:** Provide detailed analysis with ALL URLs included.';
          }
        }
      }
    }
  }

  try {
    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 800
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error('DeepSeek error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to get response from DeepSeek' });
  }
});

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  
  // Initialize RSS sync scheduler
  initScheduler();
});
