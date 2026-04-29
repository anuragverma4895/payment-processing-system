import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const onboardingNotes = [
  ['CD', 'Card, UPI, wallet, and net banking simulation'],
  ['RB', 'Role-based access for user and admin journeys'],
  ['TL', 'Transaction logs for observability and audits'],
  ['WD', 'Webhook simulation for async gateway behaviour'],
];

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form);
      toast.success('Account created');
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
          <div className="brand-badge">
            <div className="logo-mark">PG</div>
            <div>
              <div className="logo-name">PayGateway</div>
              <div className="logo-sub">Production-style payment demo</div>
            </div>
          </div>

          <h1 className="auth-headline">
            Build your payment story
            <br />
            <span>from the first screen</span>
          </h1>
          <p className="auth-desc">
            Signup area ko bhi redesign kiya gaya hai taaki poora product modern lage aur onboarding screen se hi
            system ke core strengths visible ho jaayen.
          </p>

          <ul className="feature-list">
            {onboardingNotes.map(([badge, text]) => (
              <li key={badge} className="feature-item">
                <span className="feature-icon">{badge}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-right">
          <div className="auth-shell">
            <span className="eyebrow">Create Account</span>
            <div className="auth-form-title" style={{ marginTop: 16 }}>Start using the gateway</div>
            <div className="auth-form-sub">Registration creates a user account and immediately opens the product dashboard.</div>

            {error && <div className="alert alert-error">! {error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
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
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Minimum 8 chars with uppercase and number"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Creating account...</> : 'Create account'}
              </button>
            </form>

            <div style={{ marginTop: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
              Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
