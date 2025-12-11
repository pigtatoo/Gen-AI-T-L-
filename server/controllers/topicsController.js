const Topic = require('../models/Topics');
const Module = require('../models/Modules');

// Get all topics for a specific module
exports.getAllTopics = async (req, res) => {
  try {
    const { moduleId } = req.params;

    // Verify module exists and belongs to user
    const module = await Module.findOne({
      where: {
        module_id: moduleId,
        user_id: req.user.id
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const topics = await Topic.findAll({
      where: { module_id: moduleId },
      order: [['created_at', 'DESC']]
    });

    res.json(topics);
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
    const module = await Module.findOne({
      where: {
        module_id: moduleId,
        user_id: req.user.id
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const topic = await Topic.create({
      module_id: moduleId,
      title
    });

    res.status(201).json(topic);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a specific topic
exports.getTopic = async (req, res) => {
  try {
    const { moduleId, topicId } = req.params;

    // Verify module exists and belongs to user
    const module = await Module.findOne({
      where: {
        module_id: moduleId,
        user_id: req.user.id
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const topic = await Topic.findOne({
      where: {
        topic_id: topicId,
        module_id: moduleId
      }
    });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

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
    const module = await Module.findOne({
      where: {
        module_id: moduleId,
        user_id: req.user.id
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const topic = await Topic.findOne({
      where: {
        topic_id: topicId,
        module_id: moduleId
      }
    });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    await topic.update({ title });

    res.json(topic);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a topic
exports.deleteTopic = async (req, res) => {
  try {
    const { moduleId, topicId } = req.params;

    // Verify module exists and belongs to user
    const module = await Module.findOne({
      where: {
        module_id: moduleId,
        user_id: req.user.id
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const topic = await Topic.findOne({
      where: {
        topic_id: topicId,
        module_id: moduleId
      }
    });

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    await topic.destroy();

    res.json({ message: 'Topic deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
