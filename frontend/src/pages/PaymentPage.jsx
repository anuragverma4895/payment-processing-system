import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI, paymentAPI } from '../services/api';
import toast from 'react-hot-toast';

const generateIdempotencyKey = () =>
  `idem_${Date.now()}_${Math.random().toString(36).substring(2, 18)}`;

const maskCard = (num) => {
  const cleaned = num.replace(/\s/g, '').replace(/\D/g, '');
  if (cleaned.length === 0) return '**** **** **** ****';
  const padded = cleaned.padEnd(16, '*');
  return `${padded.slice(0,4)} ${padded.slice(4,8)} ${padded.slice(8,12)} ${padded.slice(12,16)}`;
};

export default function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [method, setMethod] = useState('card');
  const [idempotencyKey] = useState(generateIdempotencyKey);

  const [cardForm, setCardForm] = useState({ number: '', expiryMonth: '', expiryYear: '', cvv: '', name: '' });
  const [upiForm, setUpiForm] = useState({ vpa: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    orderAPI.getById(orderId)
      .then(({ data }) => setOrder(data.data.order))
      .catch(() => { toast.error('Order not found'); navigate('/orders'); })
      .finally(() => setLoading(false));
  }, [orderId]);

  const formatCardNumber = (val) => {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  };

  const handleCardNumberChange = (e) => {
    setCardForm({ ...cardForm, number: formatCardNumber(e.target.value) });
  };

  const handlePay = async () => {
    setError('');
    setProcessing(true);

    try {
      const payload = { orderId, method };
      if (method === 'card') {
        payload.cardDetails = {
          number: cardForm.number.replace(/\s/g, ''),
          expiryMonth: cardForm.expiryMonth,
          expiryYear: cardForm.expiryYear,
          cvv: cardForm.cvv,
        };
      } else if (method === 'upi') {
        payload.upiDetails = { vpa: upiForm.vpa };
      }

      const { data } = await paymentAPI.initiate(payload, idempotencyKey);
      setResult(data);
      if (data.success) {
        toast.success('Payment successful! 🎉');
      } else {
        toast.error('Payment failed');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment processing failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleRetry = async () => {
    const newKey = generateIdempotencyKey();
    setError('');
    setResult(null);
    setProcessing(true);
    try {
      const payload = { orderId, method };
      if (method === 'card') {
        payload.cardDetails = {
          number: cardForm.number.replace(/\s/g, ''),
          expiryMonth: cardForm.expiryMonth,
          expiryYear: cardForm.expiryYear,
          cvv: cardForm.cvv,
        };
      } else if (method === 'upi') {
        payload.upiDetails = { vpa: upiForm.vpa };
      }
      const { data } = await paymentAPI.retry(payload, newKey);
      setResult(data);
      if (data.success) toast.success('Retry successful! 🎉');
      else toast.error('Retry failed');
    } catch (err) {
      setError(err.response?.data?.message || 'Retry failed');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount, currency = 'INR') =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

  if (loading) return <div className="loading-inline"><div className="spinner" /></div>;
  if (!order) return null;

  if (result) {
    return (
      <div className="page-body" style={{ maxWidth: 480, margin: '60px auto' }}>
        <div className="card animate-up" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>
            {result.success ? '✅' : '❌'}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            {result.success ? 'Payment Successful' : 'Payment Failed'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            {result.success
              ? `${formatCurrency(result.data.payment.amount, result.data.payment.currency)} processed successfully`
              : result.data?.payment?.failureReason || 'Transaction was declined'}
          </p>

          {result.data?.payment && (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>Transaction Details</div>
              {[
                ['Payment ID', result.data.payment.paymentId],
                ['Order ID', result.data.order?.orderId],
                ['Amount', formatCurrency(result.data.payment.amount, result.data.payment.currency)],
                ['Method', result.data.payment.method],
                ['Status', result.data.payment.status],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
                  <span className="mono" style={{ fontSize: 12 }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            {!result.success && (result.data?.order?.remainingAttempts > 0) && (
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleRetry} disabled={processing}>
                {processing ? 'Retrying...' : `↻ Retry (${result.data.order.remainingAttempts} left)`}
              </button>
            )}
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/orders')}>
              {result.success ? '→ View Orders' : 'Back to Orders'}
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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
            </div>
            <div className="processing-title">Processing Payment</div>
            <div className="processing-sub">Please wait while we securely process your payment...</div>
            <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>Do not close this window</div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div className="page-title">Checkout</div>
        <div className="page-subtitle">Complete your payment securely</div>
      </div>

      <div className="page-body" style={{ maxWidth: 560 }}>
        {error && <div className="alert alert-error">⚠ {error}</div>}

        {/* Order Summary */}
        <div className="card card-sm" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Order</div>
            <div className="mono" style={{ marginTop: 2 }}>{order.orderId}</div>
            {order.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{order.description}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{formatCurrency(order.amount, order.currency)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Attempt {order.attempts + 1} of {order.maxAttempts}</div>
          </div>
        </div>

        <div className="card">
          {/* Method Tabs */}
          <div className="payment-tabs">
            {[['card', '💳 Card'], ['upi', '⚡ UPI'], ['netbanking', '🏦 Net Banking'], ['wallet', '👝 Wallet']].map(([m, label]) => (
              <button key={m} className={`payment-tab ${method === m ? 'active' : ''}`} onClick={() => setMethod(m)}>
                {label}
              </button>
            ))}
          </div>

          {/* Card Form */}
          {method === 'card' && (
            <>
              <div className="card-display">
                <div className="card-chip" />
                <div className="card-number-display">
                  {maskCard(cardForm.number.replace(/\s/g, ''))}
                </div>
                <div className="card-footer">
                  <div>
                    <div className="card-label">Card Holder</div>
                    <div className="card-value">{cardForm.name || 'YOUR NAME'}</div>
                  </div>
                  <div>
                    <div className="card-label">Expires</div>
                    <div className="card-value">
                      {(cardForm.expiryMonth || 'MM')}/{(cardForm.expiryYear?.slice(-2) || 'YY')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Card Number</label>
                <input
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}
                  placeholder="0000 0000 0000 0000"
                  value={cardForm.number}
                  onChange={handleCardNumberChange}
                  maxLength={19}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cardholder Name</label>
                <input
                  className="form-input"
                  placeholder="As printed on card"
                  value={cardForm.name}
                  onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                />
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Month</label>
                  <select className="form-select" value={cardForm.expiryMonth} onChange={(e) => setCardForm({ ...cardForm, expiryMonth: e.target.value })}>
                    <option value="">MM</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={String(m).padStart(2, '0')}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select className="form-select" value={cardForm.expiryYear} onChange={(e) => setCardForm({ ...cardForm, expiryYear: e.target.value })}>
                    <option value="">YY</option>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">CVV</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="•••"
                    maxLength={4}
                    value={cardForm.cvv}
                    onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>
            </>
          )}

          {/* UPI Form */}
          {method === 'upi' && (
            <div className="form-group">
              <label className="form-label">UPI ID (VPA)</label>
              <input
                className="form-input"
                placeholder="yourname@upi"
                value={upiForm.vpa}
                onChange={(e) => setUpiForm({ vpa: e.target.value })}
              />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Examples: user@paytm, 9876543210@upi, name@oksbi
              </div>
            </div>
          )}

          {/* Other methods */}
          {(method === 'netbanking' || method === 'wallet') && (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{method === 'netbanking' ? '🏦' : '👝'}</div>
              <div>Simulated {method === 'netbanking' ? 'Net Banking' : 'Wallet'} payment</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>No additional input required for simulation</div>
            </div>
          )}

          <button
            className="btn btn-primary btn-block btn-lg"
            onClick={handlePay}
            disabled={processing || order.status === 'paid'}
            style={{ marginTop: 8 }}
          >
            {processing
              ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Processing...</>
              : `🔒 Pay ${formatCurrency(order.amount, order.currency)}`}
          </button>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
            🔒 256-bit SSL encryption · Idempotency protected
          </div>
        </div>
      </div>
    </>
  );
}
