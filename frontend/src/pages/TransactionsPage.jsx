import { useEffect, useMemo, useState } from 'react';
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

const formatDate = (value) => new Date(value).toLocaleString('en-IN');

export default function TransactionsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await transactionAPI.getMyLogs({ page, limit: 15 });
      setLogs(data.data.logs);
      setPagination(data.data.pagination);
    } catch {
      setLogs([]);
      setPagination({ page: 1, pages: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return logs;
    return logs.filter((log) =>
      log.event.toLowerCase().includes(query) ||
      (log.message || '').toLowerCase().includes(query) ||
      (log.paymentId?.paymentId || '').toLowerCase().includes(query) ||
      (log.orderId?.orderId || '').toLowerCase().includes(query)
    );
  }, [logs, search]);

  const summary = useMemo(() => ({
    success: logs.filter((log) => log.event === 'payment.success').length,
    failed: logs.filter((log) => log.event === 'payment.failed').length,
    webhook: logs.filter((log) => log.event === 'webhook.sent').length,
  }), [logs]);

  return (
    <>
      <div className="page-header">
        <div className="page-title">Transaction History</div>
        <div className="page-subtitle">Audit-friendly timeline of payment and order events with quick local search.</div>
      </div>

      <div className="page-body">
        <section className="grid grid-3" style={{ marginBottom: 22 }}>
          <div className="stat-card">
            <div className="stat-head">
              <div className="stat-label">Success Events</div>
              <div className="stat-icon">OK</div>
            </div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{summary.success}</div>
            <div className="stat-meta">How many success logs are visible on this page.</div>
          </div>
          <div className="stat-card">
            <div className="stat-head">
              <div className="stat-label">Failed Events</div>
              <div className="stat-icon">ER</div>
            </div>
            <div className="stat-value" style={{ color: 'var(--error)' }}>{summary.failed}</div>
            <div className="stat-meta">Failures are useful for explaining retry logic in interviews.</div>
          </div>
          <div className="stat-card">
            <div className="stat-head">
              <div className="stat-label">Webhooks Sent</div>
              <div className="stat-icon">WH</div>
            </div>
            <div className="stat-value">{summary.webhook}</div>
            <div className="stat-meta">Async communication records from the payment workflow.</div>
          </div>
        </section>

        <section className="card hover-lift">
          <div className="toolbar">
            <div>
              <div className="section-title">Event Ledger</div>
              <div className="section-subtitle">{pagination.total} total events captured by transaction logging</div>
            </div>
            <div className="search-shell">
              <input
                className="form-input"
                placeholder="Search event, payment ID, order ID, or message"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

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
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>
                      <div className="spinner" style={{ margin: 'auto' }} />
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-icon">TX</div>
                        <div className="empty-title">No matching logs</div>
                        <div className="empty-desc">Try changing the search text or generate more payment activity.</div>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.map((log) => (
                  <tr key={log._id}>
                    <td><EventBadge event={log.event} /></td>
                    <td style={{ maxWidth: 300 }}>{log.message}</td>
                    <td><span className="mono">{log.paymentId?.paymentId || '-'}</span></td>
                    <td><span className="mono">{log.orderId?.orderId || '-'}</span></td>
                    <td>{log.duration ? `${log.duration} ms` : '-'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => load(pagination.page - 1)} disabled={pagination.page === 1}>{'<'}</button>
              {Array.from({ length: Math.min(pagination.pages, 7) }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  className={`page-btn ${page === pagination.page ? 'active' : ''}`}
                  onClick={() => load(page)}
                >
                  {page}
                </button>
              ))}
              <button className="page-btn" onClick={() => load(pagination.page + 1)} disabled={pagination.page === pagination.pages}>{'>'}</button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
