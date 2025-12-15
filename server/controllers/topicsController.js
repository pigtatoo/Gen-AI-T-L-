const supabase = require('../config/supabase');

// Get all topics for a specific module
exports.getAllTopics = async (req, res) => {
  try {
    const { moduleId } = req.params;

    // Verify module exists and belongs to user
    const { data: module, error: modErr } = await supabase
      .from('Modules')
      .select('module_id,user_id')
      .eq('module_id', moduleId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (modErr) return res.status(500).json({ error: modErr.message });
    if (!module) return res.status(404).json({ error: 'Module not found' });

    const { data: topics, error } = await supabase
      .from('Topics')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(topics || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new topic
exports.createTopic = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Verify module exists and belongs to user
    const { data: module, error: modErr } = await supabase
      .from('Modules')
      .select('module_id,user_id')
      .eq('module_id', moduleId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (modErr) return res.status(500).json({ error: modErr.message });
    if (!module) return res.status(404).json({ error: 'Module not found' });

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('Topics')
      .insert([{ module_id: moduleId, title, created_at: now }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a specific topic
exports.getTopic = async (req, res) => {
  try {
    const { moduleId, topicId } = req.params;

    // Verify module exists and belongs to user
    const { data: module, error: modErr } = await supabase
      .from('Modules')
      .select('module_id,user_id')
      .eq('module_id', moduleId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (modErr) return res.status(500).json({ error: modErr.message });
    if (!module) return res.status(404).json({ error: 'Module not found' });

    const { data: topic, error } = await supabase
      .from('Topics')
      .select('*')
      .eq('topic_id', topicId)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    res.json(topic);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a topic
exports.updateTopic = async (req, res) => {
  try {
    const { moduleId, topicId } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Verify module exists and belongs to user
    const { data: module, error: modErr } = await supabase
      .from('Modules')
      .select('module_id,user_id')
      .eq('module_id', moduleId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (modErr) return res.status(500).json({ error: modErr.message });
    if (!module) return res.status(404).json({ error: 'Module not found' });

    const { data, error } = await supabase
      .from('Topics')
      .update({ title })
      .eq('topic_id', topicId)
      .eq('module_id', moduleId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Topic not found' });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a topic
exports.deleteTopic = async (req, res) => {
  try {
    const { moduleId, topicId } = req.params;

    // Verify module exists and belongs to user
    const { data: module, error: modErr } = await supabase
      .from('Modules')
      .select('module_id,user_id')
      .eq('module_id', moduleId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (modErr) return res.status(500).json({ error: modErr.message });
    if (!module) return res.status(404).json({ error: 'Module not found' });

    const { error } = await supabase
      .from('Topics')
      .delete()
      .eq('topic_id', topicId)
      .eq('module_id', moduleId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
