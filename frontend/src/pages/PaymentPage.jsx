import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { orderAPI, paymentAPI } from '../services/api';
import toast from 'react-hot-toast';

const generateIdempotencyKey = () =>
  `idem_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`;

const maskCard = (value) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '**** **** **** ****';
  const padded = digits.padEnd(16, '*');
  return `${padded.slice(0, 4)} ${padded.slice(4, 8)} ${padded.slice(8, 12)} ${padded.slice(12, 16)}`;
};

const formatCurrency = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

const PAYMENT_METHODS = [
  { id: 'card', label: 'Card', note: 'Fast and familiar for checkout flows' },
  { id: 'upi', label: 'UPI', note: 'Popular low-friction instant payment method' },
  { id: 'netbanking', label: 'Net banking', note: 'Simulated bank redirect support' },
  { id: 'wallet', label: 'Wallet', note: 'Stored-value wallet simulation' },
];

export default function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [method, setMethod] = useState('card');
  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey());
  const [error, setError] = useState('');
  const [cardForm, setCardForm] = useState({ number: '', expiryMonth: '', expiryYear: '', cvv: '', name: '' });
  const [upiForm, setUpiForm] = useState({ vpa: '' });

  useEffect(() => {
    orderAPI.getById(orderId)
      .then(({ data }) => setOrder(data.data.order))
      .catch(() => {
        toast.error('Order not found');
        navigate('/orders');
      })
      .finally(() => setLoading(false));
  }, [navigate, orderId]);

  const methodSummary = useMemo(
    () => PAYMENT_METHODS.find((entry) => entry.id === method),
    [method]
  );

  const trustPoints = [
    'JWT protected user session',
    'Idempotency key generated per attempt',
    'Sensitive card data not stored in plain text',
    'Retry flow supported for failed orders',
  ];

  const handleCardNumberChange = (event) => {
    const formatted = event.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    setCardForm((current) => ({ ...current, number: formatted }));
  };

  const getPayload = () => {
    const payload = { orderId, method };
    if (method === 'card') {
      payload.cardDetails = {
        number: cardForm.number.replace(/\s/g, ''),
        expiryMonth: cardForm.expiryMonth,
        expiryYear: cardForm.expiryYear,
        cvv: cardForm.cvv,
      };
    }
    if (method === 'upi') {
      payload.upiDetails = { vpa: upiForm.vpa };
    }
    return payload;
  };

  const handlePay = async (isRetry = false) => {
    setError('');
    setProcessing(true);

    try {
      const payload = getPayload();
      const requestKey = isRetry ? generateIdempotencyKey() : idempotencyKey;
      if (isRetry) setIdempotencyKey(requestKey);
      const { data } = isRetry
        ? await paymentAPI.retry(payload, requestKey)
        : await paymentAPI.initiate(payload, requestKey);
      setResult(data);
      if (data.success) {
        toast.success(isRetry ? 'Retry successful' : 'Payment successful');
      } else {
        toast.error(isRetry ? 'Retry failed' : 'Payment failed');
      }
    } catch (err) {
      const message = err.response?.data?.message || (isRetry ? 'Retry failed' : 'Payment failed');
      setError(message);
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="loading-inline"><div className="spinner" /></div>;
  }

  if (!order) return null;

  if (result) {
    return (
      <div className="page-body">
        <div className="card result-card animate-up" style={{ textAlign: 'center' }}>
          <div className="logo-mark small" style={{ margin: '0 auto 18px', fontSize: '0.82rem' }}>
            {result.success ? 'OK' : 'NO'}
          </div>
          <div className="section-title" style={{ fontSize: '1.8rem' }}>
            {result.success ? 'Payment Successful' : 'Payment Failed'}
          </div>
          <div className="section-subtitle" style={{ maxWidth: 360, margin: '10px auto 22px' }}>
            {result.success
              ? `${formatCurrency(result.data.payment.amount, result.data.payment.currency)} processed successfully.`
              : result.data?.payment?.failureReason || 'The gateway declined this transaction.'}
          </div>

          <div className="soft-card" style={{ textAlign: 'left', marginBottom: 18 }}>
            <div className="section-title" style={{ fontSize: '1rem', marginBottom: 14 }}>Transaction Summary</div>
            <div className="mini-metrics">
              <div className="mini-metric"><span>Payment ID</span><strong>{result.data.payment.paymentId}</strong></div>
              <div className="mini-metric"><span>Order ID</span><strong>{result.data.order?.orderId}</strong></div>
              <div className="mini-metric"><span>Method</span><strong>{result.data.payment.method}</strong></div>
              <div className="mini-metric"><span>Status</span><strong>{result.data.payment.status}</strong></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {!result.success && result.data?.order?.remainingAttempts > 0 && (
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handlePay(true)} disabled={processing}>
                {processing ? 'Retrying...' : `Retry (${result.data.order.remainingAttempts} left)`}
              </button>
            )}
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/orders')}>
              Open orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {processing && (
        <div className="processing-overlay">
          <div className="processing-card">
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
            </div>
            <div className="processing-title">Processing payment</div>
            <div className="processing-sub">Secure gateway simulation is validating method, deduping the request, and recording the transaction.</div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div className="page-title">Checkout</div>
        <div className="page-subtitle">3D payment experience with trust signals, live card preview, and method guidance.</div>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error">! {error}</div>}

        <div className="grid grid-2">
          <section className="card hover-lift">
            <div className="split-header">
              <div>
                <div className="section-title">Order Snapshot</div>
                <div className="section-subtitle">Everything important before processing the payment</div>
              </div>
              <span className="badge badge-pending">Attempt {order.attempts + 1} / {order.maxAttempts}</span>
            </div>

            <div className="hero-card" style={{ marginBottom: 20 }}>
              <span className="eyebrow">Current order</span>
              <h2 style={{ fontSize: '2.4rem', marginTop: 16 }}>{formatCurrency(order.amount, order.currency)}</h2>
              <p>{order.description || 'No order description provided for this transaction.'}</p>
              <div className="mini-metrics" style={{ marginTop: 20 }}>
                <div className="mini-metric"><span>Order ID</span><strong>{order.orderId}</strong></div>
                <div className="mini-metric"><span>Status</span><strong>{order.status}</strong></div>
                <div className="mini-metric"><span>Request key</span><strong>{idempotencyKey.slice(-12)}</strong></div>
              </div>
            </div>

            <div className="card-display">
              <div className="card-chip" />
              <div className="card-number-display">{maskCard(cardForm.number)}</div>
              <div className="card-footer">
                <div>
                  <div className="card-label">Card holder</div>
                  <div className="card-value">{cardForm.name || 'YOUR NAME'}</div>
                </div>
                <div>
                  <div className="card-label">Expires</div>
                  <div className="card-value">{cardForm.expiryMonth || 'MM'}/{cardForm.expiryYear?.slice(-2) || 'YY'}</div>
                </div>
              </div>
            </div>

            <div className="soft-card">
              <div className="section-title" style={{ fontSize: '1rem', marginBottom: 12 }}>Why this flow feels stronger now</div>
              <div className="trust-list">
                {trustPoints.map((point) => (
                  <div key={point} className="trust-item">
                    <span className="tiny-dot" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card hover-lift">
            <div className="section-title">Payment Method</div>
            <div className="section-subtitle">Select a method and complete the secure checkout</div>

            <div className="payment-tabs" style={{ marginTop: 20 }}>
              {PAYMENT_METHODS.map((entry) => (
                <button
                  key={entry.id}
                  className={`payment-tab ${method === entry.id ? 'active' : ''}`}
                  onClick={() => setMethod(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <div className="soft-card" style={{ marginBottom: 18 }}>
              <div className="mini-metric">
                <span>Selected method</span>
                <strong>{methodSummary?.label}</strong>
              </div>
              <div className="section-subtitle" style={{ marginTop: 10 }}>{methodSummary?.note}</div>
            </div>

            {method === 'card' && (
              <>
                <div className="form-group">
                  <label className="form-label">Card Number</label>
                  <input
                    className="form-input mono"
                    placeholder="0000 0000 0000 0000"
                    value={cardForm.number}
                    maxLength={19}
                    onChange={handleCardNumberChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cardholder Name</label>
                  <input
                    className="form-input"
                    placeholder="Name on card"
                    value={cardForm.name}
                    onChange={(event) => setCardForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Month</label>
                    <select
                      className="form-select"
                      value={cardForm.expiryMonth}
                      onChange={(event) => setCardForm((current) => ({ ...current, expiryMonth: event.target.value }))}
                    >
                      <option value="">MM</option>
                      {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((month) => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <select
                      className="form-select"
                      value={cardForm.expiryYear}
                      onChange={(event) => setCardForm((current) => ({ ...current, expiryYear: event.target.value }))}
                    >
                      <option value="">YYYY</option>
                      {Array.from({ length: 10 }, (_, index) => String(new Date().getFullYear() + index)).map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVV</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="123"
                      value={cardForm.cvv}
                      maxLength={4}
                      onChange={(event) => setCardForm((current) => ({ ...current, cvv: event.target.value.replace(/\D/g, '') }))}
                    />
                  </div>
                </div>
              </>
            )}

            {method === 'upi' && (
              <div className="form-group">
                <label className="form-label">UPI ID</label>
                <input
                  className="form-input"
                  placeholder="name@upi"
                  value={upiForm.vpa}
                  onChange={(event) => setUpiForm({ vpa: event.target.value })}
                />
                <div className="inline-note">Examples: user@paytm, mobile@ibl, business@oksbi</div>
              </div>
            )}

            {(method === 'netbanking' || method === 'wallet') && (
              <div className="soft-card" style={{ marginBottom: 18 }}>
                <div className="section-title" style={{ fontSize: '1rem' }}>Simulation Ready</div>
                <div className="section-subtitle" style={{ marginTop: 8 }}>
                  This method uses the existing backend simulator, so no extra customer input is required.
                </div>
              </div>
            )}

            <div className="soft-card" style={{ marginBottom: 18 }}>
              <div className="section-title" style={{ fontSize: '1rem', marginBottom: 14 }}>Processing Timeline</div>
              <div className="timeline-list">
                <div className="timeline-item">
                  <div className="timeline-mark">01</div>
                  <div>
                    <strong>Validate payload</strong>
                    <p>Input and method-specific fields are validated before the request hits payment logic.</p>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-mark">02</div>
                  <div>
                    <strong>Check idempotency</strong>
                    <p>Duplicate requests with the same key are blocked or replayed safely.</p>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-mark">03</div>
                  <div>
                    <strong>Store payment outcome</strong>
                    <p>Payment record, order status update, and transaction logging complete the flow.</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={() => handlePay(false)}
              disabled={processing || order.status === 'paid'}
            >
              {processing ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Processing...</> : `Pay ${formatCurrency(order.amount, order.currency)}`}
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
