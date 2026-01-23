const express = require('express');
const router = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const supabase = require('../config/supabase');

/**
 * GET /api/user/newsletter-subscriptions
 * Get all newsletter subscriptions for the current user
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: subscriptions, error } = await supabase
      .from('user_newsletter_subscriptions')
      .select(`
        id,
        module_id,
        topic_ids,
        email,
        is_active,
        last_sent,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(subscriptions || []);
  } catch (err) {
    console.error('Error fetching subscriptions:', err);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

/**
 * POST /api/user/newsletter-subscriptions
 * Create or update a newsletter subscription
 */
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { module_id, topic_ids, email, is_active } = req.body;

    // Validate input
    if (!module_id || !Array.isArray(topic_ids) || topic_ids.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid fields. Required: module_id, topic_ids (non-empty array)'
      });
    }

    // Use provided email or fallback to user email
    const subscriptionEmail = email || req.user.email;

    // Upsert subscription using Supabase
    const { data, error } = await supabase
      .from('user_newsletter_subscriptions')
      .upsert({
        user_id: userId,
        module_id: module_id,
        topic_ids: topic_ids,
        email: subscriptionEmail,
        is_active: is_active !== undefined ? is_active : true
      }, { onConflict: 'user_id,module_id' })
      .select();

    if (error) throw error;

    res.json({ message: 'Subscription saved successfully', subscription: data?.[0] });
  } catch (err) {
    console.error('Error saving subscription:', err);
    res.status(500).json({ error: err.message || 'Failed to save subscription' });
  }
});

/**
 * PUT /api/user/newsletter-subscriptions/:id
 * Update a specific subscription
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptionId = parseInt(req.params.id);
    const { topic_ids, email, is_active } = req.body;

    // Verify subscription belongs to user
    const { data: subscription, error: fetchError } = await supabase
      .from('user_newsletter_subscriptions')
      .select()
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Build update object
    const updates = {};
    if (topic_ids !== undefined) {
      if (!Array.isArray(topic_ids) || topic_ids.length === 0) {
        return res.status(400).json({ error: 'topic_ids must be a non-empty array' });
      }
      updates.topic_ids = topic_ids;
    }
    if (email !== undefined) updates.email = email;
    if (is_active !== undefined) updates.is_active = is_active;

    // Update subscription
    const { data, error } = await supabase
      .from('user_newsletter_subscriptions')
      .update(updates)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Subscription updated successfully', subscription: data });
  } catch (err) {
    console.error('Error updating subscription:', err);
    res.status(500).json({ error: err.message || 'Failed to update subscription' });
  }
});

/**
 * DELETE /api/user/newsletter-subscriptions/:id
 * Delete a subscription
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptionId = parseInt(req.params.id);

    // Verify subscription belongs to user
    const { data: subscription, error: fetchError } = await supabase
      .from('user_newsletter_subscriptions')
      .select()
      .eq('id', subscriptionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Delete subscription
    const { error } = await supabase
      .from('user_newsletter_subscriptions')
      .delete()
      .eq('id', subscriptionId);

    if (error) throw error;

    res.json({ message: 'Subscription deleted successfully' });
  } catch (err) {
    console.error('Error deleting subscription:', err);
    res.status(500).json({ error: err.message || 'Failed to delete subscription' });
  }
});

/**
 * GET /api/user/newsletter-subscriptions/module/:moduleId
 * Get subscription status for a specific module
 */
router.get('/module/:moduleId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const moduleId = parseInt(req.params.moduleId);

    const { data: subscription, error } = await supabase
      .from('user_newsletter_subscriptions')
      .select()
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json(subscription || null);
  } catch (err) {
    console.error('Error fetching subscription:', err);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

module.exports = router;
