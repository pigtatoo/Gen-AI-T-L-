const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { generateNewsletter } = require('../controllers/newsletterController');

/**
 * POST /api/newsletters/generate
 * Generate and download newsletter as PDF for a module
 * Body: { 
 *   moduleId: number, 
 *   moduleTitle: string, 
 *   topicIds: [number], 
 *   topicTitles: [string],
 *   daysBack: 7|30|90 (optional)
 * }
 */
router.post('/generate', authenticate, async (req, res) => {
  await generateNewsletter(req, res);
});

module.exports = router;
