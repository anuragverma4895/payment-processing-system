import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
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
            Payments built for<br />
            <span>the modern web</span>
          </h1>
          <p className="auth-desc">
            Process payments at scale with enterprise-grade reliability, real-time webhooks, and comprehensive transaction analytics.
          </p>
          <ul className="feature-list">
            <li className="feature-item"><span className="feature-icon">🔒</span> End-to-end encrypted transactions</li>
            <li className="feature-item"><span className="feature-icon">⚡</span> Idempotent payment processing</li>
            <li className="feature-item"><span className="feature-icon">🔄</span> Automatic retry with exponential backoff</li>
            <li className="feature-item"><span className="feature-icon">📊</span> Real-time transaction monitoring</li>
            <li className="feature-item"><span className="feature-icon">🌐</span> Multi-currency support</li>
          </ul>
        </div>

        <div className="auth-right">
          <h2 className="auth-form-title">Sign in</h2>
          <p className="auth-form-sub">Access your payment dashboard</p>

          {error && <div className="alert alert-error">⚠ {error}</div>}

          <form onSubmit={handleSubmit}>
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
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</> : 'Sign in'}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link">Create account</Link>
          </div>

          <div style={{ marginTop: 32, padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>Demo Credentials</div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              admin@paygateway.io / Admin@1234<br />
              user@paygateway.io / User@1234
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
