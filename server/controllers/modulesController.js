const Module = require('../models/Modules');
const User = require('../models/User');

// Get all modules for logged-in user
exports.getAllModules = async (req, res) => {
  try {
    const modules = await Module.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(modules);
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

    const module = await Module.create({
      user_id: req.user.id,
      title,
      description
    });

    res.status(201).json(module);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a specific module
exports.getModule = async (req, res) => {
  try {
    const module = await Module.findOne({
      where: {
        module_id: req.params.id,
        user_id: req.user.id
      }
    });

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

    const module = await Module.findOne({
      where: {
        module_id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    await module.update({
      title: title || module.title,
      description: description !== undefined ? description : module.description
    });

    res.json(module);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a module
exports.deleteModule = async (req, res) => {
  try {
    const module = await Module.findOne({
      where: {
        module_id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    await module.destroy();

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
