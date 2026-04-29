import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: 'DB', label: 'Dashboard', meta: 'Metrics and quick actions' },
  { to: '/orders', icon: 'OR', label: 'Orders', meta: 'Create, track, and retry' },
  { to: '/transactions', icon: 'TX', label: 'Transactions', meta: 'Full event timeline' },
];

const NavItem = ({ to, icon, label, meta }) => (
  <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
    <span className="nav-icon">{icon}</span>
    <span className="nav-copy">
      <strong>{label}</strong>
      <span>{meta}</span>
    </span>
  </NavLink>
);

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    toast.success('Session closed successfully');
    navigate('/login');
  };

  const currentTitle = location.pathname.startsWith('/admin')
    ? 'Control Tower'
    : location.pathname.startsWith('/transactions')
      ? 'Event Ledger'
      : location.pathname.startsWith('/orders')
        ? 'Payment Orders'
        : 'Payment Command Center';

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">PG</div>
          <div>
            <div className="logo-name">PayGateway</div>
            <div className="logo-sub">3D Payment Studio</div>
          </div>
        </div>

        <div className="sidebar-promo hover-lift">
          <span className="eyebrow">Smart Flow</span>
          <h4>Secure checkout with better visual depth</h4>
          <p>
            Explore orders, payment retries, analytics, and transaction events from a single polished workspace.
          </p>
          <div className="mini-metrics">
            <div className="mini-metric"><span>Idempotency</span><strong>Enabled</strong></div>
            <div className="mini-metric"><span>Processing</span><strong>Multi-method</strong></div>
            <div className="mini-metric"><span>View</span><strong>Realtime-ready</strong></div>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-label">Workspace</div>
          {navItems.map((item) => <NavItem key={item.to} {...item} />)}
        </div>

        {isAdmin && (
          <div className="nav-section">
            <div className="nav-label">Admin</div>
            <NavItem to="/admin" icon="AD" label="Admin Panel" meta="System-wide oversight" />
          </div>
        )}

        <div className="sidebar-bottom">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div className="user-role">{user?.role}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              OUT
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Current View</div>
            <div style={{ fontWeight: 700 }}>{currentTitle}</div>
          </div>
          <div className="topbar-right">
            <div className="signal-pill"><span className="signal-dot" />Gateway active</div>
            <div className="signal-pill">{isAdmin ? 'Admin access' : 'User session'}</div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
