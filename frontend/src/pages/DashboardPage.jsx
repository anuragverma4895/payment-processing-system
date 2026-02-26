import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderAPI, paymentAPI } from '../services/api';

const StatusBadge = ({ status }) => {
  const map = {
    success: 'badge-success', paid: 'badge-success',
    failed: 'badge-error', cancelled: 'badge-error',
    pending: 'badge-pending', processing: 'badge-pending', created: 'badge-pending',
    refunded: 'badge-warning',
  };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ordersRes, paymentsRes] = await Promise.all([
          orderAPI.getAll({ limit: 5 }),
          paymentAPI.getMyPayments({ limit: 5 }),
        ]);
        setOrders(ordersRes.data.data.orders);
        setPayments(paymentsRes.data.data.payments);

        // Compute local stats
        const allPayments = paymentsRes.data.data.payments;
        const successPays = allPayments.filter(p => p.status === 'success');
        setStats({
          totalOrders: ordersRes.data.data.pagination.total,
          totalPayments: paymentsRes.data.data.pagination.total,
          successCount: successPays.length,
          totalSpent: successPays.reduce((s, p) => s + p.amount, 0),
        });
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const formatCurrency = (amount, currency = 'INR') =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

  if (loading) return <div className="loading-inline"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">Welcome back, {user?.name} 👋</div>
      </div>

      <div className="page-body">
        <div className="grid grid-4" style={{ marginBottom: 32 }}>
          <div className="stat-card">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{stats?.totalOrders ?? 0}</div>
            <div className="stat-meta">All time</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Payments</div>
            <div className="stat-value">{stats?.totalPayments ?? 0}</div>
            <div className="stat-meta">Initiated</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Successful</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{stats?.successCount ?? 0}</div>
            <div className="stat-meta">Completed payments</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Amount Spent</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(stats?.totalSpent ?? 0)}</div>
            <div className="stat-meta">Successful transactions</div>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 600 }}>Recent Orders</div>
              <Link to="/orders/new" className="btn btn-primary btn-sm">+ New Order</Link>
            </div>
            {orders.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div className="empty-icon">◫</div>
                <div className="empty-title">No orders yet</div>
                <div className="empty-desc" style={{ marginBottom: 12 }}>Create your first order to get started</div>
                <Link to="/orders/new" className="btn btn-primary btn-sm">Create Order</Link>
              </div>
            ) : (
              <div>
                {orders.map(order => (
                  <div key={order._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div className="mono">{order.orderId}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{order.description || 'No description'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{formatCurrency(order.amount, order.currency)}</div>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 20 }}>Recent Payments</div>
            {payments.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div className="empty-icon">◈</div>
                <div className="empty-title">No payments yet</div>
                <div className="empty-desc">Payments will appear here after you checkout</div>
              </div>
            ) : (
              <div>
                {payments.map(pay => (
                  <div key={pay._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div className="mono">{pay.paymentId}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, textTransform: 'capitalize' }}>
                        {pay.method} {pay.cardDetails?.cardType && `· ${pay.cardDetails.cardType}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{formatCurrency(pay.amount, pay.currency)}</div>
                      <StatusBadge status={pay.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
