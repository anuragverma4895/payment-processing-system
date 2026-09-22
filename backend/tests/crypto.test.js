const assert = require('node:assert/strict');
const test = require('node:test');
const cryptoUtil = require('../utils/crypto');

test('hashCardNumber returns a stable SHA-256 hash without exposing the card number', () => {
  const cardNumber = '4111 1111 1111 1111';
  const hash = cryptoUtil.hashCardNumber(cardNumber);

  assert.equal(hash.length, 64);
  assert.notEqual(hash, cardNumber);
  assert.equal(hash, cryptoUtil.hashCardNumber(cardNumber));
});

test('maskCardNumber preserves only the last four digits', () => {
  assert.equal(cryptoUtil.maskCardNumber('4111 1111 1111 4242'), '**** **** **** 4242');
});

test('detectCardType recognizes supported card networks', () => {
  assert.equal(cryptoUtil.detectCardType('4111111111111111'), 'visa');
  assert.equal(cryptoUtil.detectCardType('5555555555554444'), 'mastercard');
  assert.equal(cryptoUtil.detectCardType('378282246310005'), 'amex');
  assert.equal(cryptoUtil.detectCardType('6011111111111117'), 'discover');
  assert.equal(cryptoUtil.detectCardType('9111111111111111'), 'unknown');
});

test('webhook signatures verify valid payloads and reject malformed signatures', () => {
  const payload = { event: 'payment.success', paymentId: 'PAY_TEST' };
  const secret = 'test_secret';
  const signature = cryptoUtil.generateWebhookSignature(payload, secret);

  assert.equal(cryptoUtil.verifyWebhookSignature(payload, signature, secret), true);
  assert.equal(cryptoUtil.verifyWebhookSignature(payload, 'not-a-valid-hex-signature', secret), false);
  assert.equal(cryptoUtil.verifyWebhookSignature(payload, null, secret), false);
});
