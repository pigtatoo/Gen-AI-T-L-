const supabase = require('../config/supabase');

// Get all modules for logged-in user
exports.getAllModules = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Modules')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new module
exports.createModule = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('Modules')
      .insert({ user_id: req.user.id, title, description, created_at: now })
      .select('*')
      .limit(1);
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data && data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a specific module
exports.getModule = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Modules')
      .select('*')
      .eq('module_id', req.params.id)
      .eq('user_id', req.user.id)
      .limit(1);
    if (error) return res.status(500).json({ error: error.message });
    const module = data && data[0];

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json(module);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a module
exports.updateModule = async (req, res) => {
  try {
    const { title, description } = req.body;

    const { data: found, error: findErr } = await supabase
      .from('Modules')
      .select('*')
      .eq('module_id', req.params.id)
      .eq('user_id', req.user.id)
      .limit(1);
    if (findErr) return res.status(500).json({ error: findErr.message });
    const module = found && found[0];

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const updates = {
      title: title || module.title,
      description: description !== undefined ? description : module.description
    };
    const { data, error } = await supabase
      .from('Modules')
      .update(updates)
      .eq('module_id', req.params.id)
      .eq('user_id', req.user.id)
      .select('*')
      .limit(1);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data && data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a module
exports.deleteModule = async (req, res) => {
  try {
    const { data: found, error: findErr } = await supabase
      .from('Modules')
      .select('module_id')
      .eq('module_id', req.params.id)
      .eq('user_id', req.user.id)
      .limit(1);
    if (findErr) return res.status(500).json({ error: findErr.message });
    const module = found && found[0];

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const { error } = await supabase
      .from('Modules')
      .delete()
      .eq('module_id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
