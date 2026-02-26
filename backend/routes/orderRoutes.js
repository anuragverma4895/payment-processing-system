const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, restrictTo } = require('../middlewares/auth');
const { createOrderValidator, validate } = require('../middlewares/validators');

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, example: 999.99 }
 *               currency: { type: string, example: "INR" }
 *               description: { type: string, example: "Product purchase" }
 *     responses:
 *       201: { description: Order created }
 */
router.use(protect);

router.post('/', createOrderValidator, validate, orderController.createOrder);
router.get('/', orderController.getMyOrders);
router.get('/:orderId', orderController.getOrderById);

// Admin routes
router.get('/admin/all', restrictTo('admin'), orderController.getAllOrders);

module.exports = router;
