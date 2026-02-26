import { useState, useEffect } from 'react';
import { paymentAPI, transactionAPI } from '../services/api';

const StatusBadge = ({ status }) => {
  const map = { success: 'badge-success', paid: 'badge-success', failed: 'badge-error', pending: 'badge-pending', processing: 'badge-pending', refunded: 'badge-warning' };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
};

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
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);
  const formatDate = (d) => new Date(d).toLocaleString('en-IN');

  if (loading) return <div className="loading-inline"><div className="spinner" /></div>;

  const successRate = stats?.stats?.total > 0
    ? ((stats.stats.success / stats.stats.total) * 100).toFixed(1)
    : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-title">Admin Dashboard</div>
        <div className="page-subtitle">System-wide payment overview</div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="grid grid-4" style={{ marginBottom: 32 }}>
          <div className="stat-card">
            <div className="stat-label">Total Transactions</div>
            <div className="stat-value">{stats?.stats?.total ?? 0}</div>
            <div className="stat-meta">All time</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Successful</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{stats?.stats?.success ?? 0}</div>
            <div className="stat-meta">Success rate: {successRate}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Failed</div>
            <div className="stat-value" style={{ color: 'var(--error)' }}>{stats?.stats?.failed ?? 0}</div>
            <div className="stat-meta">Failure rate: {(100 - parseFloat(successRate)).toFixed(1)}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Revenue</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(stats?.stats?.totalRevenue)}</div>
            <div className="stat-meta">Successful payments</div>
          </div>
        </div>

        {/* Method Breakdown */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Payment Methods</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {stats?.methodBreakdown?.map(m => (
              <div key={m._id} style={{
                padding: '12px 20px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{m.count}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: 4 }}>{m._id}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['overview', 'logs'].map(t => (
            <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="table-wrap">
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
                {payments.map(p => (
                  <tr key={p._id}>
                    <td><span className="mono">{p.paymentId}</span></td>
                    <td>
                      <div style={{ fontSize: 13 }}>{p.userId?.name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.userId?.email}</div>
                    </td>
                    <td><strong>{formatCurrency(p.amount)}</strong></td>
                    <td style={{ textTransform: 'capitalize' }}>{p.method}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--error)', maxWidth: 200 }}>{p.failureReason || '—'}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'logs' && (
          <div className="table-wrap">
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
                {logs.map(log => (
                  <tr key={log._id}>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: log.status === 'success' ? 'var(--success)' : log.status === 'error' ? 'var(--error)' : 'var(--text-secondary)',
                      }}>
                        {log.event}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{log.userId?.email || '—'}</td>
                    <td style={{ fontSize: 12, maxWidth: 240 }}>{log.message}</td>
                    <td style={{ fontSize: 12 }}>{log.duration ? `${log.duration}ms` : '—'}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{log.ipAddress || '—'}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
