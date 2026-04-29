import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../services/api';
import toast from 'react-hot-toast';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

const initialMetadata = [
  { key: 'customer_segment', value: 'retail' },
  { key: 'source', value: 'web-app' },
];

export default function CreateOrderPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    amount: '',
    currency: 'INR',
    description: '',
  });
  const [metadata, setMetadata] = useState(initialMetadata);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const previewAmount = useMemo(() => {
    if (!form.amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: form.currency,
    }).format(Number(form.amount));
  }, [form.amount, form.currency]);

  const metadataObject = useMemo(() => metadata.reduce((acc, row) => {
    if (row.key.trim() && row.value.trim()) acc[row.key.trim()] = row.value.trim();
    return acc;
  }, {}), [metadata]);

  const updateMetadata = (index, field, value) => {
    setMetadata((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [field]: value } : row
    )));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await orderAPI.create({
        amount: parseFloat(form.amount),
        currency: form.currency,
        description: form.description,
        metadata: metadataObject,
      });
      toast.success(`Order ${data.data.order.orderId} created`);
      navigate(`/pay/${data.data.order.orderId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-title">Create Order</div>
        <div className="page-subtitle">
          Amount, currency, description aur metadata ke saath ek clean order generate karo aur direct checkout flow me jao.
        </div>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error">! {error}</div>}

        <div className="grid grid-2">
          <section className="card hover-lift">
            <div className="section-title">Live Order Preview</div>
            <div className="section-subtitle">3D preview card that updates as you type</div>

            <div className="card" style={{ marginTop: 20, background: 'var(--gradient-highlight)' }}>
              <div className="order-preview">
                <div>
                  <span className="eyebrow">Preview</span>
                  <div style={{ fontSize: '2.4rem', fontWeight: 800, marginTop: 16 }}>{previewAmount}</div>
                  <div style={{ marginTop: 10, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {form.description || 'No description added yet. Use this to explain the order purpose clearly.'}
                  </div>
                  <div className="mini-metrics" style={{ marginTop: 18 }}>
                    <div className="mini-metric"><span>Currency</span><strong>{form.currency}</strong></div>
                    <div className="mini-metric"><span>Metadata fields</span><strong>{Object.keys(metadataObject).length}</strong></div>
                    <div className="mini-metric"><span>Expiry pattern</span><strong>30 min default</strong></div>
                  </div>
                </div>
                <div className="preview-orb" />
              </div>
            </div>

            <div className="soft-card" style={{ marginTop: 20 }}>
              <div className="section-title" style={{ fontSize: '1rem' }}>Why metadata matters</div>
              <div className="section-subtitle">
                Interview me aap bata sakte ho ki metadata future reconciliation, analytics, aur segment-based reporting ke liye helpful hota hai.
              </div>
            </div>
          </section>

          <section className="card hover-lift">
            <div className="section-title">Order Builder</div>
            <div className="section-subtitle">Structured input with extra metadata support</div>

            <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(event) => setForm({ ...form, amount: event.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select
                    className="form-select"
                    value={form.currency}
                    onChange={(event) => setForm({ ...form, currency: event.target.value })}
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Example: Subscription renewal for March billing cycle"
                  value={form.description}
                  maxLength={255}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              </div>

              <div className="form-group">
                <div className="split-header">
                  <div>
                    <label className="form-label" style={{ marginBottom: 0 }}>Metadata</label>
                    <div className="inline-note">Optional key value pairs for analytics or reconciliation</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setMetadata((current) => [...current, { key: '', value: '' }])}
                  >
                    Add field
                  </button>
                </div>

                <div style={{ marginTop: 12 }}>
                  {metadata.map((row, index) => (
                    <div key={`${row.key}-${index}`} className="metadata-row">
                      <input
                        className="form-input"
                        placeholder="key"
                        value={row.key}
                        onChange={(event) => updateMetadata(index, 'key', event.target.value)}
                      />
                      <input
                        className="form-input"
                        placeholder="value"
                        value={row.value}
                        onChange={(event) => updateMetadata(index, 'value', event.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => setMetadata((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                        disabled={metadata.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/orders')}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Creating...</> : 'Create and continue'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
