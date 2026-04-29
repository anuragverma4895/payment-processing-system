import { useEffect, useMemo, useState } from 'react';
import { paymentAPI, transactionAPI } from '../services/api';

const StatusBadge = ({ status }) => {
  const map = {
    success: 'badge-success',
    paid: 'badge-success',
    failed: 'badge-error',
    pending: 'badge-pending',
    processing: 'badge-pending',
    refunded: 'badge-warning',
  };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

const formatDate = (value) => new Date(value).toLocaleString('en-IN');

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, paymentsRes, logsRes] = await Promise.all([
          paymentAPI.getDashboardStats(),
          paymentAPI.adminGetAll({ limit: 20 }),
          transactionAPI.adminGetLogs({ limit: 20 }),
        ]);
        setStats(statsRes.data.data);
        setPayments(paymentsRes.data.data.payments);
        setLogs(logsRes.data.data.logs);
      } catch {
        setStats({ stats: { total: 0, success: 0, failed: 0, pending: 0, totalRevenue: 0 }, methodBreakdown: [] });
        setPayments([]);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const successRate = useMemo(() => {
    if (!stats?.stats?.total) return 0;
    return ((stats.stats.success / stats.stats.total) * 100).toFixed(1);
  }, [stats]);

  if (loading) {
    return <div className="loading-inline"><div className="spinner" /></div>;
  }

  return (
    <>
      <div className="page-header">
        <div className="page-title">Admin Dashboard</div>
        <div className="page-subtitle">System-wide visibility for revenue, method mix, failures, and event activity.</div>
      </div>

      <div className="page-body">
        <section className="hero-card hover-lift">
          <div className="hero-layout">
            <div>
              <span className="eyebrow">Control Tower</span>
              <h2>Operational clarity for payment leadership.</h2>
              <p>
                Admin area ko ek polished overview me convert kiya gaya hai jahan aap revenue, failures, method mix, aur
                recent events ko clearly explain kar sako during demos or interviews.
              </p>
            </div>
            <div className="card hover-lift">
              <div className="section-title">Success Rate</div>
              <div className="stat-value" style={{ marginTop: 12 }}>{successRate}%</div>
              <div className="kpi-bar" style={{ marginTop: 14 }}>
                <div className="kpi-fill" style={{ width: `${Math.min(Number(successRate), 100)}%` }} />
              </div>
              <div className="section-subtitle" style={{ marginTop: 12 }}>Based on aggregated payment status counts.</div>
            </div>
          </div>
        </section>

        <section className="grid grid-4" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-head">
              <div className="stat-label">Total Transactions</div>
              <div className="stat-icon">TT</div>
            </div>
            <div className="stat-value">{stats?.stats?.total ?? 0}</div>
            <div className="stat-meta">All recorded payment attempts across users.</div>
          </div>
          <div className="stat-card">
            <div className="stat-head">
              <div className="stat-label">Successful</div>
              <div className="stat-icon">OK</div>
            </div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{stats?.stats?.success ?? 0}</div>
            <div className="stat-meta">Direct indicator of gateway throughput quality.</div>
          </div>
          <div className="stat-card">
            <div className="stat-head">
              <div className="stat-label">Failed</div>
              <div className="stat-icon">FL</div>
            </div>
            <div className="stat-value" style={{ color: 'var(--error)' }}>{stats?.stats?.failed ?? 0}</div>
            <div className="stat-meta">Useful when explaining retries and resilience.</div>
          </div>
          <div className="stat-card">
            <div className="stat-head">
              <div className="stat-label">Revenue</div>
              <div className="stat-icon">RV</div>
            </div>
            <div className="stat-value" style={{ fontSize: '1.6rem' }}>{formatCurrency(stats?.stats?.totalRevenue)}</div>
            <div className="stat-meta">Calculated from successful payments only.</div>
          </div>
        </section>

        <section className="grid grid-2" style={{ marginBottom: 24 }}>
          <div className="card hover-lift">
            <div className="section-title">Method Breakdown</div>
            <div className="section-subtitle">How users are choosing to pay</div>
            <div className="metrics-grid" style={{ marginTop: 18 }}>
              {stats?.methodBreakdown?.map((method) => (
                <div key={method._id} className="metric-panel">
                  <strong>{method.count}</strong>
                  <span style={{ textTransform: 'capitalize' }}>{method._id}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card hover-lift">
            <div className="section-title">Admin Talking Points</div>
            <div className="section-subtitle">Short bullets to remember during project explanation</div>
            <div className="timeline-list" style={{ marginTop: 18 }}>
              <div className="timeline-item">
                <div className="timeline-mark">01</div>
                <div>
                  <strong>Idempotency prevents duplicate charge attempts.</strong>
                  <p>Header-based keying protects the payment route from accidental re-submissions.</p>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-mark">02</div>
                <div>
                  <strong>Transaction logs create an audit trail.</strong>
                  <p>Every major event is stored for monitoring, debugging, and compliance-style storytelling.</p>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-mark">03</div>
                <div>
                  <strong>Dashboard aggregates ops metrics for admins.</strong>
                  <p>Revenue, method mix, success rate, and recent failures are all visible without manual querying.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="toolbar" style={{ marginBottom: 16 }}>
          <div className="toolbar-cluster">
            {['overview', 'logs'].map((item) => (
              <button
                key={item}
                className={`chip-filter ${tab === item ? 'active' : ''}`}
                onClick={() => setTab(item)}
                style={{ textTransform: 'capitalize' }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {tab === 'overview' && (
          <section className="card hover-lift">
            <div className="section-title">Recent Payments</div>
            <div className="section-subtitle">Latest system-wide payment activity</div>
            <div className="table-wrap" style={{ marginTop: 18 }}>
              <table>
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Failure Reason</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td><span className="mono">{payment.paymentId}</span></td>
                      <td>
                        <div>{payment.userId?.name || '-'}</div>
                        <div className="list-meta">{payment.userId?.email}</div>
                      </td>
                      <td><strong>{formatCurrency(payment.amount)}</strong></td>
                      <td style={{ textTransform: 'capitalize' }}>{payment.method}</td>
                      <td><StatusBadge status={payment.status} /></td>
                      <td style={{ maxWidth: 240 }}>{payment.failureReason || '-'}</td>
                      <td>{formatDate(payment.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'logs' && (
          <section className="card hover-lift">
            <div className="section-title">Recent Logs</div>
            <div className="section-subtitle">Operational events for troubleshooting and observability</div>
            <div className="table-wrap" style={{ marginTop: 18 }}>
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>User</th>
                    <th>Message</th>
                    <th>Duration</th>
                    <th>IP</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td><span className="mono">{log.event}</span></td>
                      <td>{log.userId?.email || '-'}</td>
                      <td style={{ maxWidth: 280 }}>{log.message}</td>
                      <td>{log.duration ? `${log.duration} ms` : '-'}</td>
                      <td><span className="mono">{log.ipAddress || '-'}</span></td>
                      <td>{formatDate(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
