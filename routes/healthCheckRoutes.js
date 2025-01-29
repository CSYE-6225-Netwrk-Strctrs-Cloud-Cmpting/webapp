const express = require('express');
const router = express.Router();
const healthCheckController = require('../controllers/healthCheckController');

// Health check route
router.all('/healthz', healthCheckController);  // Use `all` to handle different HTTP methods

module.exports = router;
