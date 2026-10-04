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

const demoCredentials = [
  {
    label: 'Admin',
    email: 'admin@paygateway.io',
    password: 'Admin@1234',
  },
  {
    label: 'User',
    email: 'user@paygateway.io',
    password: 'User@1234',
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    await submitLogin(form);
  };

  const submitLogin = async (credentials) => {
    setError('');
    setLoading(true);

    try {
      await login(credentials);
      toast.success('Welcome back');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (credentials) => {
    setForm({
      email: credentials.email,
      password: credentials.password,
    });

    await submitLogin({
      email: credentials.email,
      password: credentials.password,
    });
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

            <div
              className="auth-card-note"
              style={{
                marginTop: 18,
                padding: 16,
              }}
            >
              <div className="section-title" style={{ fontSize: '1rem' }}>Demo Credentials</div>
              <div
                style={{
                  display: 'grid',
                  gap: 10,
                  marginTop: 12,
                }}
              >
                {demoCredentials.map((credential) => (
                  <div
                    key={credential.email}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          marginBottom: 4,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {credential.label}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: '0.78rem',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {credential.email} / {credential.password}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDemoLogin(credential)}
                      disabled={loading}
                      style={{ flexShrink: 0 }}
                    >
                      {loading ? '...' : 'Use'}
                    </button>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 10,
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  textAlign: 'center',
                }}
              >
                Click <strong>Use</strong> to fill the credentials and sign in automatically.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
