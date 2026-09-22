const logger = require('../config/logger');
const paymentConfig = require('../config/payment');

const SUCCESS_RATE = paymentConfig.successRate;
const MIN_DELAY = paymentConfig.minDelayMs;
const MAX_DELAY = paymentConfig.maxDelayMs;
const FORCE_OUTCOME = paymentConfig.forceOutcome;

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

const UPI_FAILURE_REASONS = [
  'Payment declined by user',
  'UPI PIN incorrect',
  'Debit account limit exceeded',
  'VPA not found',
];

const NET_BANKING_FAILURE_REASONS = [
  'Bank declined the transaction',
  'Net banking session expired',
  'Bank service temporarily unavailable',
  'Transaction limit exceeded',
];

const WALLET_FAILURE_REASONS = [
  'Wallet payment declined',
  'Wallet balance insufficient',
  'Wallet service temporarily unavailable',
  'Wallet transaction limit exceeded',
];

const CARD_NETWORK_RESPONSES = {
  visa: { code: 'VI', name: 'Visa' },
  mastercard: { code: 'MC', name: 'Mastercard' },
  amex: { code: 'AX', name: 'American Express' },
  discover: { code: 'DS', name: 'Discover' },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomDelay = () => {
  const delay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1) + MIN_DELAY);
  return sleep(delay);
};

const generateRRN = () => Math.floor(Math.random() * 9e11 + 1e11).toString();

const generateApprovalCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const resolveOutcome = () =>
  FORCE_OUTCOME === 'success' || (FORCE_OUTCOME === 'auto' && Math.random() < SUCCESS_RATE);

const pick = (items) => items[Math.floor(Math.random() * items.length)];

const buildGatewayResponse = ({ transactionId, responseMessage, amount, currency, duration, extra = {} }) => ({
  transactionId,
  responseCode: responseMessage === 'Approved' || responseMessage === 'Payment Successful' ? '00' : '05',
  responseMessage,
  amount,
  currency,
  timestamp: new Date().toISOString(),
  processingTime: duration,
  ...extra,
});

exports.processCardPayment = async ({ amount, currency, cardDetails = {}, orderId }) => {
  const startTime = Date.now();
  await randomDelay();
  const isSuccess = resolveOutcome();
  const rrn = generateRRN();
  const duration = Date.now() - startTime;

  logger.debug(`Card payment processed for order ${orderId} | Success: ${isSuccess} | SuccessRate: ${SUCCESS_RATE} | Duration: ${duration}ms`);

  if (isSuccess) {
    return {
      success: true,
      gatewayResponse: buildGatewayResponse({
        transactionId: `TXN${rrn}`,
        responseMessage: 'Approved',
        amount,
        currency,
        duration,
        extra: {
          rrn,
          approvalCode: generateApprovalCode(),
          networkResponse: CARD_NETWORK_RESPONSES[cardDetails.cardType] || { code: 'UN', name: 'Unknown' },
        },
      }),
    };
  }

  const failureReason = pick(FAILURE_REASONS);
  return {
    success: false,
    failureReason,
    gatewayResponse: buildGatewayResponse({
      transactionId: `TXN${rrn}`,
      responseMessage: failureReason,
      amount,
      currency,
      duration,
      extra: { rrn },
    }),
  };
};

exports.processUPIPayment = async ({ amount, currency, upiDetails, orderId }) => {
  const startTime = Date.now();
  await randomDelay();
  const isSuccess = resolveOutcome();
  const transactionId = `UPI${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const duration = Date.now() - startTime;

  logger.debug(`UPI payment processed for order ${orderId} | VPA: ${upiDetails.vpa} | Success: ${isSuccess} | SuccessRate: ${SUCCESS_RATE}`);

  if (isSuccess) {
    return {
      success: true,
      gatewayResponse: buildGatewayResponse({
        transactionId,
        responseMessage: 'Payment Successful',
        amount,
        currency,
        duration,
        extra: { upiRefId: generateRRN(), vpa: upiDetails.vpa },
      }),
    };
  }

  const failureReason = pick(UPI_FAILURE_REASONS);
  return {
    success: false,
    failureReason,
    gatewayResponse: buildGatewayResponse({
      transactionId,
      responseMessage: failureReason,
      amount,
      currency,
      duration,
      extra: { vpa: upiDetails.vpa },
    }),
  };
};

exports.processNetBankingPayment = async ({ amount, currency, bank, orderId }) => {
  const startTime = Date.now();
  await randomDelay();
  const isSuccess = resolveOutcome();
  const transactionId = `NB${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const duration = Date.now() - startTime;

  logger.debug(`Net banking payment processed for order ${orderId} | Bank: ${bank} | Success: ${isSuccess} | SuccessRate: ${SUCCESS_RATE}`);

  if (isSuccess) {
    return {
      success: true,
      gatewayResponse: buildGatewayResponse({
        transactionId,
        responseMessage: 'Approved',
        amount,
        currency,
        duration,
        extra: { bank, bankReference: generateRRN() },
      }),
    };
  }

  const failureReason = pick(NET_BANKING_FAILURE_REASONS);
  return {
    success: false,
    failureReason,
    gatewayResponse: buildGatewayResponse({
      transactionId,
      responseMessage: failureReason,
      amount,
      currency,
      duration,
      extra: { bank },
    }),
  };
};

exports.processWalletPayment = async ({ amount, currency, wallet, orderId }) => {
  const startTime = Date.now();
  await randomDelay();
  const isSuccess = resolveOutcome();
  const transactionId = `WAL${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const duration = Date.now() - startTime;

  logger.debug(`Wallet payment processed for order ${orderId} | Wallet: ${wallet} | Success: ${isSuccess} | SuccessRate: ${SUCCESS_RATE}`);

  if (isSuccess) {
    return {
      success: true,
      gatewayResponse: buildGatewayResponse({
        transactionId,
        responseMessage: 'Approved',
        amount,
        currency,
        duration,
        extra: { wallet, walletReference: generateRRN() },
      }),
    };
  }

  const failureReason = pick(WALLET_FAILURE_REASONS);
  return {
    success: false,
    failureReason,
    gatewayResponse: buildGatewayResponse({
      transactionId,
      responseMessage: failureReason,
      amount,
      currency,
      duration,
      extra: { wallet },
    }),
  };
};
