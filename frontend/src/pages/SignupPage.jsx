import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form);
      toast.success('Account created! Welcome aboard.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <div className="auth-brand">
            <div className="logo-mark" style={{ width: 48, height: 48, fontSize: 24 }}>P</div>
            <div>
              <div className="logo-name" style={{ fontSize: 22 }}>PayGateway</div>
              <div className="logo-sub">Enterprise Payment Infrastructure</div>
            </div>
          </div>
          <h1 className="auth-headline">
            Start accepting<br />
            <span>payments today</span>
          </h1>
          <p className="auth-desc">
            Join thousands of businesses using PayGateway to process payments securely and reliably.
          </p>
          <ul className="feature-list">
            <li className="feature-item"><span className="feature-icon">💳</span> Card & UPI payments</li>
            <li className="feature-item"><span className="feature-icon">🛡</span> PCI-DSS compliant processing</li>
            <li className="feature-item"><span className="feature-icon">📈</span> Analytics & reporting dashboard</li>
            <li className="feature-item"><span className="feature-icon">🔔</span> Real-time webhook notifications</li>
          </ul>
        </div>

        <div className="auth-right">
          <h2 className="auth-form-title">Create account</h2>
          <p className="auth-form-sub">Get started in minutes</p>

          {error && <div className="alert alert-error">⚠ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Min. 8 chars with uppercase & number"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Creating account...</> : 'Create account'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
