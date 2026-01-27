const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// Only staff users can access these admin endpoints
router.get('/users', authenticate, authorize(['staff']), adminController.getUsers);
router.put('/users/:id/role', authenticate, authorize(['staff']), adminController.updateUserRole);

module.exports = router;
