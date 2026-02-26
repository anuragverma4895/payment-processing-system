const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { protect, restrictTo } = require('../middlewares/auth');

router.use(protect);

router.get('/my', transactionController.getMyLogs);
router.get('/', restrictTo('admin'), transactionController.getLogs);

module.exports = router;
