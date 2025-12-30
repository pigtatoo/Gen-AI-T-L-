const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const supabase = require('../config/supabase');

// Get user's feeds
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('userfeeds')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching feeds:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Add new feed
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { url, name } = req.body;

    if (!url || !name) {
      return res.status(400).json({ error: 'URL and name required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Check if feed already exists for this user
    const { data: existing } = await supabase
      .from('userfeeds')
      .select('feed_id')
      .eq('user_id', userId)
      .eq('url', url)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'This feed already exists for your account' });
    }

    // Create new feed
    const { data: newFeed, error } = await supabase
      .from('userfeeds')
      .insert({
        user_id: userId,
        url: url,
        name: name,
        active: true
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(newFeed);
  } catch (err) {
    console.error('Error adding feed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete feed (soft delete - set active to false)
router.delete('/:feedId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { feedId } = req.params;

    const { error } = await supabase
      .from('userfeeds')
      .update({ active: false })
      .eq('feed_id', feedId)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting feed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
