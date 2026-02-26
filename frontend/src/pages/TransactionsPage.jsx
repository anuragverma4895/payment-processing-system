import { useState, useEffect } from 'react';
import { transactionAPI } from '../services/api';

const EventBadge = ({ event }) => {
  const colors = {
    'payment.success': 'badge-success',
    'order.created': 'badge-pending',
    'payment.failed': 'badge-error',
    'payment.retry': 'badge-warning',
    'webhook.sent': 'badge-neutral',
    'payment.initiated': 'badge-pending',
  };
  return <span className={`badge ${colors[event] || 'badge-neutral'}`}>{event}</span>;
};

export default function TransactionsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await transactionAPI.getMyLogs({ page, limit: 15 });
      setLogs(data.data.logs);
      setPagination(data.data.pagination);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const formatDate = (d) => new Date(d).toLocaleString('en-IN');

  return (
    <>
      <div className="page-header">
        <div className="page-title">Transaction History</div>
        <div className="page-subtitle">{pagination.total} total events</div>
      </div>

      <div className="page-body">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Message</th>
                <th>Payment ID</th>
                <th>Order ID</th>
                <th>Duration</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-icon">◈</div>
                    <div className="empty-title">No transaction logs</div>
                    <div className="empty-desc">Your payment activity will appear here</div>
                  </div>
                </td></tr>
              ) : logs.map(log => (
                <tr key={log._id}>
                  <td><EventBadge event={log.event} /></td>
                  <td style={{ maxWidth: 280, fontSize: 12 }}>{log.message}</td>
                  <td><span className="mono">{log.paymentId?.paymentId || '—'}</span></td>
                  <td><span className="mono">{log.orderId?.orderId || '—'}</span></td>
                  <td style={{ fontSize: 12 }}>{log.duration ? `${log.duration}ms` : '—'}</td>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => load(pagination.page - 1)} disabled={pagination.page === 1}>‹</button>
            {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => load(p)}>{p}</button>
            ))}
            <button className="page-btn" onClick={() => load(pagination.page + 1)} disabled={pagination.page === pagination.pages}>›</button>
          </div>
        )}
      </div>
    </>
  );
}
