const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { syncRssWeekly } = require('../jobs/rssSync');

// Only staff users can access these admin endpoints
router.get('/users', authenticate, authorize(['staff']), adminController.getUsers);
router.put('/users/:id/role', authenticate, authorize(['staff']), adminController.updateUserRole);

// Manual RSS sync trigger (staff only)
router.post('/rss-sync', authenticate, authorize(['staff']), async (req, res) => {
  try {
    console.log('Manual RSS sync triggered by admin');
    // Run sync in background and return immediately
    syncRssWeekly().catch(err => {
      console.error('RSS sync error:', err);
    });
    res.json({ 
      success: true, 
      message: 'RSS sync started. Check server logs for progress.' 
    });
  } catch (error) {
    console.error('Failed to start RSS sync:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start RSS sync' 
    });
  }
});

module.exports = router;
