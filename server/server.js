const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
require('dotenv').config();
const axios = require('axios'); // for DeepSeek API requests

// Routes
const authRoutes = require('./routes/auth');
const modulesRoutes = require('./routes/modules');
const topicsRoutes = require('./routes/topics');

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

// Database sync
sequelize.sync({ alter: true })
  .then(() => console.log('Database synced'))
  .catch(err => console.log('Database sync error:', err));

// Auth routes
app.use('/api/auth', authRoutes);

// Modules routes
app.use('/api/modules', modulesRoutes);

// Topics routes (nested under modules)
app.use('/api/modules/:moduleId/topics', topicsRoutes);

// -----------------------------
// DeepSeek Chat Endpoint
// -----------------------------
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) return res.status(400).json({ error: 'No message provided' });

  try {
    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful teacher assistant. Answer clearly and simply for students.'
          },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 400
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
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
