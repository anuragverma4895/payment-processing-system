const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

exports.hashCardNumber = (cardNumber) => {
  return crypto.createHash('sha256').update(cardNumber).digest('hex');
};

exports.maskCardNumber = (cardNumber) => {
  const cleaned = cardNumber.replace(/\s/g, '');
  return `**** **** **** ${cleaned.slice(-4)}`;
};

exports.detectCardType = (cardNumber) => {
  const num = cardNumber.replace(/\s/g, '');
  if (/^4/.test(num)) return 'visa';
  if (/^5[1-5]/.test(num)) return 'mastercard';
  if (/^3[47]/.test(num)) return 'amex';
  if (/^6/.test(num)) return 'discover';
  return 'unknown';
};

exports.generateWebhookSignature = (payload, secret) => {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
};

exports.verifyWebhookSignature = (payload, signature, secret) => {
  const expected = exports.generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
};
