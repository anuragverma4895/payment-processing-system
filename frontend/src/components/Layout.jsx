import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: 'DB', label: 'Dashboard', meta: 'Metrics and quick actions' },
  { to: '/orders', icon: 'OR', label: 'Orders', meta: 'Create, track, and retry' },
  { to: '/transactions', icon: 'TX', label: 'Transactions', meta: 'Full event timeline' },
];

const NavItem = ({ to, icon, label, meta, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
  >
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
      {/* Mobile Backdrop */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header-row">
          <div className="sidebar-logo">
            <div className="logo-mark">PG</div>
            <div>
              <div className="logo-name">PayGateway</div>
              <div className="logo-sub">3D Payment Studio</div>
            </div>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>



        <div className="nav-section">
          <div className="nav-label">Workspace</div>
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} onClick={() => setSidebarOpen(false)} />
          ))}
        </div>

        {isAdmin && (
          <div className="nav-section">
            <div className="nav-label">Admin</div>
            <NavItem
              to="/admin"
              icon="AD"
              label="Admin Panel"
              meta="System-wide oversight"
              onClick={() => setSidebarOpen(false)}
            />
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
          <div className="topbar-left">
            <button
              className="menu-toggle-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <span className="menu-bar" />
              <span className="menu-bar" />
              <span className="menu-bar" />
            </button>
            <div>
              <div className="topbar-title">Current View</div>
              <div className="topbar-current">{currentTitle}</div>
            </div>
          </div>
          <div className="topbar-right">
            <div className="signal-pill active-status"><span className="signal-dot" />Gateway active</div>
            <div className="signal-pill role-status">{isAdmin ? 'Admin access' : 'User session'}</div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
