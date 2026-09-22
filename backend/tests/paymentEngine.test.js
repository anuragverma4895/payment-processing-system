const assert = require('node:assert/strict');
const test = require('node:test');

process.env.PAYMENT_FORCE_OUTCOME = 'success';
process.env.PAYMENT_SUCCESS_RATE = '1';
process.env.PAYMENT_MIN_DELAY_MS = '0';
process.env.PAYMENT_MAX_DELAY_MS = '0';

const logger = require('../config/logger');
logger.silent = true;

const paymentEngine = require('../services/paymentEngine');

test('processCardPayment includes Discover network metadata on success', async () => {
  const result = await paymentEngine.processCardPayment({
    amount: 100,
    currency: 'USD',
    orderId: 'ORD_TEST',
    cardDetails: { cardType: 'discover' },
  });

  assert.equal(result.success, true);
  assert.equal(result.gatewayResponse.responseCode, '00');
  assert.deepEqual(result.gatewayResponse.networkResponse, { code: 'DS', name: 'Discover' });
});

test('processUPIPayment returns a successful gateway response when configured success rate is 1', async () => {
  const result = await paymentEngine.processUPIPayment({
    amount: 250,
    currency: 'INR',
    orderId: 'ORD_UPI_TEST',
    upiDetails: { vpa: 'user@upi' },
  });

  assert.equal(result.success, true);
  assert.equal(result.gatewayResponse.responseCode, '00');
  assert.equal(result.gatewayResponse.vpa, 'user@upi');
});
