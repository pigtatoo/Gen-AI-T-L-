const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { generateQuizQuestion } = require('../services/quizService');

// Generate one quiz question for selected topics
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { selectedTopics } = req.body;
    const quiz = await generateQuizQuestion(selectedTopics || []);
    res.json({ quiz });
  } catch (err) {
    console.error('Quiz generation failed:', err.message);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

module.exports = router;
