const assert = require('node:assert/strict');
const test = require('node:test');

const cryptoUtil = require('../utils/crypto');
const webhookController = require('../controllers/webhookController');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const transactionLogger = require('../services/transactionLogger');
const logger = require('../config/logger');

logger.silent = true;

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const withWebhookSecret = async (secret, fn) => {
  const originalSecret = process.env.WEBHOOK_SECRET;
  process.env.WEBHOOK_SECRET = secret;

  try {
    await fn();
  } finally {
    if (originalSecret === undefined) {
      delete process.env.WEBHOOK_SECRET;
    } else {
      process.env.WEBHOOK_SECRET = originalSecret;
    }
  }
};

test('receiveWebhook verifies and parses signed raw JSON buffers', async () => {
  await withWebhookSecret('webhook_test_secret', async () => {
    const originalPaymentFindOne = Payment.findOne;
    const originalOrderFindOne = Order.findOne;
    const originalLog = transactionLogger.log;
    let loggedEntry;

    Payment.findOne = async (query) => ({ _id: 'payment_doc_id', userId: 'user_doc_id', paymentId: query.paymentId });
    Order.findOne = async (query) => ({ _id: 'order_doc_id', orderId: query.orderId });
    transactionLogger.log = async (entry) => {
      loggedEntry = entry;
    };

    try {
      const payload = { event: 'payment.success', paymentId: 'PAY_TEST', orderId: 'ORD_TEST' };
      const body = Buffer.from(JSON.stringify(payload));
      const signature = cryptoUtil.generateWebhookSignature(body, process.env.WEBHOOK_SECRET);
      const res = createResponse();

      await webhookController.receiveWebhook({ headers: { 'x-webhook-signature': signature }, body }, res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, { success: true, message: 'Webhook received' });
      assert.equal(loggedEntry.event, 'webhook.sent');
      assert.equal(loggedEntry.userId, 'user_doc_id');
      assert.deepEqual(loggedEntry.metadata, payload);
    } finally {
      Payment.findOne = originalPaymentFindOne;
      Order.findOne = originalOrderFindOne;
      transactionLogger.log = originalLog;
    }
  });
});

test('receiveWebhook rejects invalid signatures before parsing', async () => {
  await withWebhookSecret('webhook_test_secret', async () => {
    const res = createResponse();
    const body = Buffer.from('{"event":"payment.success"}');

    await webhookController.receiveWebhook({ headers: { 'x-webhook-signature': 'bad-signature' }, body }, res);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { success: false, message: 'Invalid webhook signature' });
  });
});

test('receiveWebhook rejects malformed JSON after signature verification', async () => {
  await withWebhookSecret('webhook_test_secret', async () => {
    const body = Buffer.from('{not-valid-json');
    const signature = cryptoUtil.generateWebhookSignature(body, process.env.WEBHOOK_SECRET);
    const res = createResponse();

    await webhookController.receiveWebhook({ headers: { 'x-webhook-signature': signature }, body }, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { success: false, message: 'Invalid webhook payload' });
  });
});
