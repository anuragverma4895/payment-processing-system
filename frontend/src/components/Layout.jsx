import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const NavItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
  >
    <span className="nav-icon">{icon}</span>
    {label}
  </NavLink>
);

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">P</div>
          <div>
            <div className="logo-name">PayGateway</div>
            <div className="logo-sub">Secure Payments</div>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-label">Main</div>
          <NavItem to="/dashboard" icon="⬡" label="Dashboard" />
          <NavItem to="/orders" icon="◫" label="Orders" />
          <NavItem to="/transactions" icon="◈" label="Transactions" />
        </div>

        {isAdmin && (
          <div className="nav-section" style={{ marginTop: 16 }}>
            <div className="nav-label">Admin</div>
            <NavItem to="/admin" icon="◉" label="Admin Panel" />
          </div>
        )}

        <div className="sidebar-bottom">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div className="user-role">{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}
              title="Logout"
            >↩</button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
