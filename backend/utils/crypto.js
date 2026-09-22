const crypto = require('crypto');

const serializeWebhookPayload = (payload) => {
  if (Buffer.isBuffer(payload) || typeof payload === 'string') return payload;
  return JSON.stringify(payload);
};

exports.hashCardNumber = (cardNumber) => {
  return crypto.createHash('sha256').update(String(cardNumber)).digest('hex');
};

exports.maskCardNumber = (cardNumber) => {
  const cleaned = String(cardNumber).replace(/\s/g, '');
  return `**** **** **** ${cleaned.slice(-4)}`;
};

exports.detectCardType = (cardNumber) => {
  const num = String(cardNumber).replace(/\s/g, '');
  if (/^4/.test(num)) return 'visa';
  if (/^5[1-5]/.test(num)) return 'mastercard';
  if (/^3[47]/.test(num)) return 'amex';
  if (/^6/.test(num)) return 'discover';
  return 'unknown';
};

exports.generateWebhookSignature = (payload, secret) => {
  return crypto
    .createHmac('sha256', secret)
    .update(serializeWebhookPayload(payload))
    .digest('hex');
};

exports.verifyWebhookSignature = (payload, signature, secret) => {
  if (!signature || typeof signature !== 'string') return false;

  const expected = exports.generateWebhookSignature(payload, secret);
  const receivedBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  return receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
};
