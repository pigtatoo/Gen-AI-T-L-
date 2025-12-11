const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
require('dotenv').config();

// Suppress HuggingFace warnings
process.env.HF_HUB_DISABLE_IMPLICIT_TOKEN = '1';

const authRoutes = require('./routes/auth');
const modulesRoutes = require('./routes/modules');
const topicsRoutes = require('./routes/topics');
const chatRoutes = require('./routes/chat');

// Import models
const User = require('./models/User');
const Module = require('./models/Modules');
const Topic = require('./models/Topics');

// Define relationships
User.hasMany(Module, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Module.belongsTo(User, { foreignKey: 'user_id' });
Module.hasMany(Topic, { foreignKey: 'module_id', onDelete: 'CASCADE' });
Topic.belongsTo(Module, { foreignKey: 'module_id' });

const app = express();

// Use JSON middleware
app.use(express.json());

// CORS configuration
const corsOptions = {
	origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
	credentials: true
};
app.use(cors(corsOptions));

// Sync database
sequelize.sync({ alter: true }).then(() => {
	// eslint-disable-next-line no-console
	console.log('Database synced');
}).catch(err => {
	// eslint-disable-next-line no-console
	console.log('Database sync error:', err);
});

// Auth routes
app.use('/api/auth', authRoutes);

// Modules routes
app.use('/api/modules', modulesRoutes);

// Topics routes (nested under modules)
app.use('/api/modules/:moduleId/topics', topicsRoutes);

// Chat routes (Gemini integration)
app.use('/api', chatRoutes);

// Simple health route
app.get('/api/health', (req, res) => {
	res.json({ status: 'ok', timestamp: Date.now() });
});

// Error handling middleware
app.use((err, req, res, next) => {
	// eslint-disable-next-line no-console
	console.error('Error:', err);
	res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(`Server listening on port ${PORT}`);
});
