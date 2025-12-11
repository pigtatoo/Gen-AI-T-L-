const express = require('express');
const modulesController = require('../controllers/modulesController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', modulesController.getAllModules);
router.post('/', modulesController.createModule);
router.get('/:id', modulesController.getModule);
router.put('/:id', modulesController.updateModule);
router.delete('/:id', modulesController.deleteModule);

module.exports = router;
