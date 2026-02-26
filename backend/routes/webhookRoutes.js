const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Webhooks don't require auth - they use signature verification
router.post('/payment', express.json(), webhookController.receiveWebhook);

module.exports = router;
