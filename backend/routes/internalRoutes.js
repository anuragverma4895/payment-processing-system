const express = require('express');
const router = express.Router();
const internalController = require('../controllers/internalController');
const { internalAuth } = require('../middlewares/internalAuth');

/**
 * Internal service-to-service routes.
 * Protected by x-internal-api-key header (not user JWT).
 * Used exclusively by the AI Revenue Recovery Agent.
 *
 * These routes do NOT replace existing user-facing routes.
 */
router.use(internalAuth);

router.post('/retry-payment', internalController.retryPayment);

module.exports = router;
