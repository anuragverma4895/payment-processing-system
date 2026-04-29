import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const featurePoints = [
  ['EN', 'Encrypted transaction flow'],
  ['ID', 'Idempotent requests for safe retries'],
  ['LG', 'Event logging for every major payment step'],
  ['AN', 'Clean dashboards for users and admins'],
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      toast.success('Welcome back');
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
          <div className="brand-badge">
            <div className="logo-mark">PG</div>
            <div>
              <div className="logo-name">PayGateway</div>
              <div className="logo-sub">Enterprise payment infrastructure</div>
            </div>
          </div>

          <h1 className="auth-headline">
            Payments built with
            <br />
            <span>security, depth, and control</span>
          </h1>
          <p className="auth-desc">
            Login screen ko bhi ab product story ka hissa banaya gaya hai, taaki first impression professional lage
            aur aap interview demo me confidently flow explain kar sako.
          </p>

          <ul className="feature-list">
            {featurePoints.map(([badge, text]) => (
              <li key={badge} className="feature-item">
                <span className="feature-icon">{badge}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-right">
          <div className="auth-shell">
            <span className="eyebrow">Sign In</span>
            <div className="auth-form-title" style={{ marginTop: 16 }}>Access your gateway workspace</div>
            <div className="auth-form-sub">Use your account to open user dashboards, orders, and checkout flows.</div>

            {error && <div className="alert alert-error">! {error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Signing in...</> : 'Sign in'}
              </button>
            </form>

            <div className="auth-divider"><span>or</span></div>

            <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              Need an account? <Link to="/signup" className="auth-link">Create one</Link>
            </div>

            <div className="auth-card-note" style={{ marginTop: 24 }}>
              <div className="section-title" style={{ fontSize: '1rem' }}>Demo Credentials</div>
              <div className="section-subtitle" style={{ marginTop: 10 }}>
                admin@paygateway.io / Admin@1234
                <br />
                user@paygateway.io / User@1234
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
