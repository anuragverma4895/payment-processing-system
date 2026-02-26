const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middlewares/auth');
const { createPaymentValidator, validate } = require('../middlewares/validators');
const { idempotencyCheck } = require('../middlewares/idempotency');
const { paymentLimiter } = require('../middlewares/rateLimiter');

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Initiate a payment for an order
 *     tags: [Payments]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique key to prevent duplicate payments (min 16 chars)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, method]
 *             properties:
 *               orderId: { type: string, example: "ORD_XXXX" }
 *               method: { type: string, enum: [card, upi, netbanking, wallet] }
 *               cardDetails:
 *                 type: object
 *                 properties:
 *                   number: { type: string, example: "4111111111111111" }
 *                   expiryMonth: { type: string, example: "12" }
 *                   expiryYear: { type: string, example: "2028" }
 *                   cvv: { type: string, example: "123" }
 *               upiDetails:
 *                 type: object
 *                 properties:
 *                   vpa: { type: string, example: "user@upi" }
 *     responses:
 *       200: { description: Payment successful }
 *       402: { description: Payment failed }
 *       409: { description: Duplicate idempotency key }
 */
router.use(protect);

router.post('/', paymentLimiter, createPaymentValidator, validate, idempotencyCheck, paymentController.initiatePayment);
router.post('/retry', paymentLimiter, createPaymentValidator, validate, idempotencyCheck, paymentController.retryPayment);
router.get('/my', paymentController.getMyPayments);
router.get('/:paymentId', paymentController.getPaymentById);

// Admin routes
router.get('/admin/all', restrictTo('admin'), paymentController.getAllPayments);
router.get('/admin/dashboard', restrictTo('admin'), paymentController.getDashboardStats);

module.exports = router;
