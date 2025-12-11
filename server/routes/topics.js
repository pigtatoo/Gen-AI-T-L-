const express = require('express');
const topicsController = require('../controllers/topicsController');
const { authenticate } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// Get all topics for a module
router.get('/', topicsController.getAllTopics);

// Create a new topic
router.post('/', topicsController.createTopic);

// Get a specific topic
router.get('/:topicId', topicsController.getTopic);

// Update a topic
router.put('/:topicId', topicsController.updateTopic);

// Delete a topic
router.delete('/:topicId', topicsController.deleteTopic);

module.exports = router;
