const logger = require('../config/logger');

const SUCCESS_RATE = parseFloat(process.env.PAYMENT_SUCCESS_RATE) || 0.85;
const MIN_DELAY = parseInt(process.env.PAYMENT_MIN_DELAY_MS) || 500;
const MAX_DELAY = parseInt(process.env.PAYMENT_MAX_DELAY_MS) || 3000;

const FAILURE_REASONS = [
  'Insufficient funds',
  'Card declined by issuing bank',
  'Transaction limit exceeded',
  'Invalid card credentials',
  'Network timeout',
  'Card expired',
  'Suspected fraud - transaction blocked',
  'Do not honor - issuer declined',
];

const CARD_NETWORK_RESPONSES = {
  visa: { code: 'VI', name: 'Visa' },
  mastercard: { code: 'MC', name: 'Mastercard' },
  amex: { code: 'AX', name: 'American Express' },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomDelay = () => {
  const delay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY);
  return sleep(delay);
};

const generateRRN = () => {
  return Math.floor(Math.random() * 9e11 + 1e11).toString();
};

const generateApprovalCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

/**
 * Simulates card payment processing with realistic delays and failure rates
 */
exports.processCardPayment = async ({ amount, currency, cardDetails, orderId }) => {
  const startTime = Date.now();
  
  // Simulate network delay
  await randomDelay();

  const isSuccess = Math.random() < SUCCESS_RATE;
  const rrn = generateRRN();
  const duration = Date.now() - startTime;

  logger.debug(`Card payment processed for order ${orderId} | Success: ${isSuccess} | Duration: ${duration}ms`);

  if (isSuccess) {
    return {
      success: true,
      gatewayResponse: {
        transactionId: `TXN${rrn}`,
        rrn,
        approvalCode: generateApprovalCode(),
        responseCode: '00',
        responseMessage: 'Approved',
        networkResponse: CARD_NETWORK_RESPONSES[cardDetails.cardType] || { code: 'UN', name: 'Unknown' },
        amount,
        currency,
        timestamp: new Date().toISOString(),
        processingTime: duration,
      },
    };
  }

  const failureReason = FAILURE_REASONS[Math.floor(Math.random() * FAILURE_REASONS.length)];
  return {
    success: false,
    failureReason,
    gatewayResponse: {
      transactionId: `TXN${rrn}`,
      rrn,
      responseCode: '05',
      responseMessage: failureReason,
      amount,
      currency,
      timestamp: new Date().toISOString(),
      processingTime: duration,
    },
  };
};

/**
 * Simulates UPI payment processing
 */
exports.processUPIPayment = async ({ amount, currency, upiDetails, orderId }) => {
  const startTime = Date.now();
  
  await randomDelay();

  const isSuccess = Math.random() < SUCCESS_RATE;
  const upiTransactionId = `UPI${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const duration = Date.now() - startTime;

  logger.debug(`UPI payment processed for order ${orderId} | VPA: ${upiDetails.vpa} | Success: ${isSuccess}`);

  if (isSuccess) {
    return {
      success: true,
      gatewayResponse: {
        transactionId: upiTransactionId,
        upiRefId: generateRRN(),
        vpa: upiDetails.vpa,
        responseCode: '00',
        responseMessage: 'Payment Successful',
        amount,
        currency,
        timestamp: new Date().toISOString(),
        processingTime: duration,
      },
    };
  }

  const failureReasons = ['Payment declined by user', 'UPI PIN incorrect', 'Debit account limit exceeded', 'VPA not found'];
  const failureReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];

  return {
    success: false,
    failureReason,
    gatewayResponse: {
      transactionId: upiTransactionId,
      vpa: upiDetails.vpa,
      responseCode: 'ZM',
      responseMessage: failureReason,
      amount,
      currency,
      timestamp: new Date().toISOString(),
      processingTime: duration,
    },
  };
};
