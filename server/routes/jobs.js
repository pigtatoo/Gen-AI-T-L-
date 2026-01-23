const express = require('express');
const router = express.Router();
const { sendAllNewsletters } = require('../jobs/newsletterScheduler');
const { authenticate: auth } = require('../middleware/auth');

/**
 * POST /api/jobs/send-newsletters
 * Manually trigger newsletter sending (for testing)
 * Requires authentication
 */
router.post('/send-newsletters', auth, async (req, res) => {
  try {
    console.log(`\n🔨 Manual newsletter trigger by: ${req.user.email}`);
    
    await sendAllNewsletters();
    
    res.json({ 
      message: 'Newsletter job triggered successfully',
      timestamp: new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })
    });
  } catch (err) {
    console.error('Error triggering newsletter job:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
