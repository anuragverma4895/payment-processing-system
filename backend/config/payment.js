const DEFAULT_PAYMENT_SUCCESS_RATE = 0.85;
const DEFAULT_PAYMENT_MIN_DELAY_MS = 500;
const DEFAULT_PAYMENT_MAX_DELAY_MS = 3000;

const parseOptionalNumber = (name, fallback) => {
  const rawValue = process.env[name];
  if (rawValue === undefined) return fallback;

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a valid number. Received: ${rawValue}`);
  }

  return parsed;
};

const parsePaymentSuccessRate = () => {
  const value = parseOptionalNumber('PAYMENT_SUCCESS_RATE', DEFAULT_PAYMENT_SUCCESS_RATE);

  if (value < 0 || value > 1) {
    throw new Error('PAYMENT_SUCCESS_RATE must be between 0 and 1.');
  }

  return value;
};

const parseDelay = (name, fallback) => {
  const value = parseOptionalNumber(name, fallback);

  if (value < 0) {
    throw new Error(`${name} must be greater than or equal to 0.`);
  }

  return value;
};

const successRate = parsePaymentSuccessRate();
const minDelayMs = parseDelay('PAYMENT_MIN_DELAY_MS', DEFAULT_PAYMENT_MIN_DELAY_MS);
const configuredMaxDelayMs = parseDelay('PAYMENT_MAX_DELAY_MS', DEFAULT_PAYMENT_MAX_DELAY_MS);
const maxDelayMs = Math.max(minDelayMs, configuredMaxDelayMs);

module.exports = {
  successRate,
  minDelayMs,
  maxDelayMs,
};