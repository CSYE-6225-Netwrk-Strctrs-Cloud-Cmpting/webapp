const express = require('express');
const router = express.Router();
const healthCheckController = require('../controllers/healthCheckController');

// Health check route - GET /healthz
router.get('/healthz', healthCheckController);

// Handle other HTTP methods for /healthz with 405 Method Not Allowed
router.post('/healthz', (req, res) => res.status(405).send());
router.put('/healthz', (req, res) => res.status(405).send());
router.delete('/healthz', (req, res) => res.status(405).send());
router.head('/healthz', (req, res) => res.status(405).send());
router.options('/healthz', (req, res) => res.status(405).send());
router.patch('/healthz', (req, res) => res.status(405).send());

module.exports = router;