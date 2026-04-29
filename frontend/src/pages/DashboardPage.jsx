import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderAPI, paymentAPI } from '../services/api';

const StatusBadge = ({ status }) => {
  const map = {
    success: 'badge-success',
    paid: 'badge-success',
    failed: 'badge-error',
    cancelled: 'badge-error',
    pending: 'badge-pending',
    processing: 'badge-pending',
    created: 'badge-pending',
    refunded: 'badge-warning',
  };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
};

const formatCurrency = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount || 0);

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
          orderAPI.getAll({ limit: 6 }),
          paymentAPI.getMyPayments({ limit: 6 }),
        ]);

        const fetchedOrders = ordersRes.data.data.orders;
        const fetchedPayments = paymentsRes.data.data.payments;
        const successfulPayments = fetchedPayments.filter((payment) => payment.status === 'success');
        const activeOrders = fetchedOrders.filter((order) => ['created', 'processing', 'failed'].includes(order.status));

        setOrders(fetchedOrders);
        setPayments(fetchedPayments);
        setStats({
          totalOrders: ordersRes.data.data.pagination.total,
          totalPayments: paymentsRes.data.data.pagination.total,
          successCount: successfulPayments.length,
          totalSpent: successfulPayments.reduce((sum, payment) => sum + payment.amount, 0),
          activeOrders: activeOrders.length,
          conversionRate: fetchedPayments.length ? Math.round((successfulPayments.length / fetchedPayments.length) * 100) : 0,
        });
      } catch {
        setStats({
          totalOrders: 0,
          totalPayments: 0,
          successCount: 0,
          totalSpent: 0,
          activeOrders: 0,
          conversionRate: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const timelineData = useMemo(() => {
    const pendingRetry = orders.filter((order) => order.status === 'failed' && order.attempts < order.maxAttempts).length;
    return [
      { label: 'Orders active', value: stats?.activeOrders ?? 0, note: 'Open or retryable payment orders' },
      { label: 'Retry window', value: pendingRetry, note: 'Orders still eligible for another attempt' },
      { label: 'Success ratio', value: `${stats?.conversionRate ?? 0}%`, note: 'Current conversion across recent payments' },
    ];
  }, [orders, stats]);

  if (loading) {
    return <div className="loading-inline"><div className="spinner" /></div>;
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">
          {user?.name}, yahan se aap orders, payments, retries, aur transaction health sab ek jagah monitor kar sakte ho.
        </div>
      </div>

      <div className="page-body">
        <section className="hero-card hover-lift">
          <div className="hero-layout">
            <div>
              <span className="eyebrow">Gateway Overview</span>
              <h2>Modern payments with a sharper 3D command center.</h2>
              <p>
                Yeh view ab sirf summary nahi hai. Isme quick actions, live performance signals, active order visibility,
                aur payment flow understanding ko ek polished space me combine kiya gaya hai.
              </p>
              <div className="hero-actions">
                <Link to="/orders/new" className="btn btn-primary btn-lg">Create order</Link>
                <Link to="/transactions" className="btn btn-secondary btn-lg">Open transaction log</Link>
              </div>
            </div>

            <div className="hero-side">
              <div className="card orbit-card hover-lift">
                <div>
                  <div className="section-title">Session Intelligence</div>
                  <div className="section-subtitle">Fast read of your latest payment posture</div>
                </div>
                <div className="orbital-ring" />
                <div className="mini-metrics">
                  {timelineData.map((item) => (
                    <div key={item.label} className="mini-metric">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-4" style={{ marginBottom: 26 }}>
          <div className="stat-card">
            <div className="stat-head">
              <div className="stat-label">Total Orders</div>
              <div className="stat-icon">OR</div>
            </div>
            <div className="stat-value">{stats?.totalOrders ?? 0}</div>
            <div className="stat-meta">Every order created inside the gateway.</div>
          </div>

          <div className="stat-card">
            <div className="stat-head">
              <div className="stat-label">Payments Initiated</div>
              <div className="stat-icon">PY</div>
            </div>
            <div className="stat-value">{stats?.totalPayments ?? 0}</div>
            <div className="stat-meta">All payment attempts recorded in the system.</div>
          </div>

          <div className="stat-card">
            <div className="stat-head">
              <div className="stat-label">Successful</div>
              <div className="stat-icon">OK</div>
            </div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{stats?.successCount ?? 0}</div>
            <div className="stat-meta">Stable conversions from recent payment activity.</div>
          </div>

          <div className="stat-card">
            <div className="stat-head">
              <div className="stat-label">Amount Settled</div>
              <div className="stat-icon">IN</div>
            </div>
            <div className="stat-value" style={{ fontSize: '1.6rem' }}>{formatCurrency(stats?.totalSpent)}</div>
            <div className="stat-meta">Total successful collection across your recent payments.</div>
          </div>
        </section>

        <section className="grid grid-2">
          <div className="card hover-lift">
            <div className="panel-header">
              <div>
                <div className="section-title">Recent Orders</div>
                <div className="section-subtitle">Payable and newly created order queue</div>
              </div>
              <Link to="/orders/new" className="btn btn-primary btn-sm">New order</Link>
            </div>

            {orders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">OR</div>
                <div className="empty-title">No orders yet</div>
                <div className="empty-desc">Create your first order to begin the payment flow.</div>
              </div>
            ) : (
              <div className="stack-list">
                {orders.map((order) => (
                  <div key={order._id} className="stack-item">
                    <div>
                      <div className="list-title mono">{order.orderId}</div>
                      <div className="list-meta">{order.description || 'No description added yet'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{formatCurrency(order.amount, order.currency)}</div>
                      <div style={{ marginTop: 8 }}>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card hover-lift">
            <div className="panel-header">
              <div>
                <div className="section-title">Recent Payments</div>
                <div className="section-subtitle">Last recorded attempts across all methods</div>
              </div>
              <Link to="/transactions" className="btn btn-secondary btn-sm">Event trail</Link>
            </div>

            {payments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">TX</div>
                <div className="empty-title">No payments yet</div>
                <div className="empty-desc">Payments will appear here after a checkout attempt.</div>
              </div>
            ) : (
              <div className="stack-list">
                {payments.map((payment) => (
                  <div key={payment._id} className="stack-item">
                    <div>
                      <div className="list-title mono">{payment.paymentId}</div>
                      <div className="list-meta" style={{ textTransform: 'capitalize' }}>
                        {payment.method} {payment.cardDetails?.cardType ? `| ${payment.cardDetails.cardType}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{formatCurrency(payment.amount, payment.currency)}</div>
                      <div style={{ marginTop: 8 }}>
                        <StatusBadge status={payment.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
