const express = require('express');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Save or update chat history
router.post('/save', authenticate, async (req, res) => {
  try {
    const { moduleId, messages } = req.body;
    const userId = req.user.id;

    if (!moduleId || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'moduleId and messages array required' });
    }

    // Check if chat history exists for this user + module
    const { data: existing, error: selectError } = await supabase
      .from('ChatHistory')
      .select('id')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = not found, which is expected
      throw selectError;
    }

    let result;

    if (existing) {
      // Update existing
      result = await supabase
        .from('ChatHistory')
        .update({
          messages: JSON.stringify(messages),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select();
    } else {
      // Create new
      result = await supabase
        .from('ChatHistory')
        .insert([{
          user_id: userId,
          module_id: moduleId,
          messages: JSON.stringify(messages),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
    }

    if (result.error) throw result.error;

    res.json({ success: true, data: result.data[0] });
  } catch (err) {
    console.error('Error saving chat history:', err);
    res.status(500).json({ error: 'Failed to save chat history' });
  }
});

// Load chat history
router.get('/:moduleId', authenticate, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('ChatHistory')
      .select('*')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      return res.json({ messages: [] });
    }

    res.json({ 
      messages: JSON.parse(data.messages),
      lastUpdated: data.updated_at
    });
  } catch (err) {
    console.error('Error loading chat history:', err);
    res.status(500).json({ error: 'Failed to load chat history' });
  }
});

// Delete chat history
router.delete('/:moduleId', authenticate, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('ChatHistory')
      .delete()
      .eq('user_id', userId)
      .eq('module_id', moduleId);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting chat history:', err);
    res.status(500).json({ error: 'Failed to delete chat history' });
  }
});

module.exports = router;
