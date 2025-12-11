const express = require('express');
const router = express.Router();
const { syncRssWeekly } = require('../jobs/rssSync');
const { authenticate } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

/**
 * POST /api/articles/sync-rss
 * Manually trigger RSS sync (admin only)
 */
router.post('/sync-rss', authenticate, async (req, res) => {
  try {
    // Optional: Add admin check here
    // if (!isAdmin(req.user)) return res.status(403).json({ error: 'Admin only' });

    console.log(`Manual RSS sync triggered by user ${req.user?.id || 'unknown'}`);

    const result = await syncRssWeekly();

    if (result.success) {
      res.json({
        message: 'RSS sync completed successfully',
        ...result
      });
    } else {
      res.status(500).json({
        error: 'RSS sync failed',
        ...result
      });
    }
  } catch (err) {
    console.error('Error triggering RSS sync:', err);
    res.status(500).json({
      error: 'Failed to trigger RSS sync',
      details: err.message
    });
  }
});

/**
 * POST /api/articles/sync-rss/test
 * Test RSS sync without authentication (for testing only)
 * Remove this in production!
 */
router.post('/sync-rss/test', async (req, res) => {
  try {
    console.log('Test RSS sync triggered');

    const result = await syncRssWeekly();

    res.json({
      message: 'Test RSS sync completed',
      ...result
    });
  } catch (err) {
    console.error('Error in test RSS sync:', err);
    res.status(500).json({
      error: 'Test RSS sync failed',
      details: err.message
    });
  }
});

/**
 * GET /api/articles/mapped-results
 * Get the latest mapped articles by topic
 */
router.get('/mapped-results', (req, res) => {
  try {
    const tempDir = process.env.ARTICLE_OUTPUT_DIR || './temp';

    if (!fs.existsSync(tempDir)) {
      return res.json({
        message: 'No mapped articles found yet',
        results: []
      });
    }

    // Find latest mapped results file
    const files = fs.readdirSync(tempDir).filter((f) => f.startsWith('articles_mapped_'));
    if (files.length === 0) {
      return res.json({
        message: 'No mapped articles found yet',
        results: []
      });
    }

    // Sort by filename (descending) to get latest
    files.sort().reverse();
    const latestFile = files[0];
    const filePath = path.join(tempDir, latestFile);

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    res.json({
      message: 'Latest mapped articles',
      file: latestFile,
      topicCount: data.length,
      results: data
    });
  } catch (err) {
    console.error('Error fetching mapped results:', err);
    res.status(500).json({
      error: 'Failed to fetch mapped results',
      details: err.message
    });
  }
});

/**
 * GET /api/articles/case-study-status
 * Check if case studies are available
 */
router.get('/case-study-status', (req, res) => {
  try {
    const tempDir = process.env.ARTICLE_OUTPUT_DIR || './temp';
    let status = {
      available: false,
      file: null,
      topicCount: 0,
      message: ''
    };

    if (!fs.existsSync(tempDir)) {
      status.message = 'No case studies available yet. Run RSS sync first.';
      return res.json(status);
    }

    const files = fs.readdirSync(tempDir).filter((f) => f.startsWith('articles_mapped_'));
    if (files.length === 0) {
      status.message = 'No mapped articles found. Run RSS sync to generate case studies.';
      return res.json(status);
    }

    files.sort().reverse();
    const latestFile = files[0];
    const filePath = path.join(tempDir, latestFile);

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    status.available = true;
    status.file = latestFile;
    status.topicCount = data.length;
    status.message = `✅ Case studies available! ${data.length} topics with articles.`;

    // Show preview
    if (data.length > 0) {
      status.preview = data.slice(0, 2).map((t) => ({
        topic: t.topicTitle,
        articles: t.articleCount
      }));
    }

    res.json(status);
  } catch (err) {
    console.error('Error checking case study status:', err);
    res.status(500).json({
      available: false,
      message: 'Error checking status',
      error: err.message
    });
  }
});

module.exports = router;
