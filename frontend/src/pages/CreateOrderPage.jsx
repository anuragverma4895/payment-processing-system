import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    amount: '',
    currency: 'INR',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await orderAPI.create({
        amount: parseFloat(form.amount),
        currency: form.currency,
        description: form.description,
      });
      toast.success(`Order ${data.data.order.orderId} created!`);
      navigate(`/pay/${data.data.order.orderId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const formatPreview = () => {
    if (!form.amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: form.currency,
    }).format(form.amount);
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Create Order</div>
        <div className="page-subtitle">Initiate a new payment order</div>
      </div>

      <div className="page-body" style={{ maxWidth: 560 }}>
        {error && <div className="alert alert-error">⚠ {error}</div>}

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Order Preview</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{formatPreview()}</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{form.description || 'No description'}</div>
            </div>
            <div style={{ fontSize: 32 }}>◫</div>
          </div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  className="form-select"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Order #12345, Subscription renewal..."
                maxLength={255}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/orders')}
              >Cancel</button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={loading}
              >
                {loading
                  ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Creating...</>
                  : '→ Create & Proceed to Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
