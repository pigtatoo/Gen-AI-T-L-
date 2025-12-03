const express = require('express');
const cors = require('cors');

const app = express();

// Use JSON middleware
app.use(express.json());

// Allow requests from Next dev server (default http://localhost:3000)
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }));

// Simple health route
app.get('/api/health', (req, res) => {
	res.json({ status: 'ok', timestamp: Date.now() });
});

// Example API route
app.get('/api/hello', (req, res) => {
	res.json({ message: 'Hello from server' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(`Server listening on port ${PORT}`);
});
