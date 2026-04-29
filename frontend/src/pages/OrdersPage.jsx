import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../services/api';

const FILTERS = ['', 'created', 'processing', 'paid', 'failed', 'cancelled'];

const StatusBadge = ({ status }) => {
  const map = {
    paid: 'badge-success',
    failed: 'badge-error',
    cancelled: 'badge-error',
    processing: 'badge-pending',
    created: 'badge-pending',
    refunded: 'badge-warning',
  };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
};

const formatCurrency = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const getExpiryLabel = (expiry) => {
  const diffMinutes = Math.round((new Date(expiry).getTime() - Date.now()) / 60000);
  if (diffMinutes <= 0) return 'Expired';
  if (diffMinutes < 60) return `${diffMinutes} min left`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}h ${minutes}m left`;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await orderAPI.getAll({ page, limit: 10, status: statusFilter || undefined });
      setOrders(data.data.orders);
      setPagination(data.data.pagination);
    } catch {
      setOrders([]);
      setPagination({ page: 1, pages: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [statusFilter]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) =>
      order.orderId.toLowerCase().includes(query) ||
      (order.description || '').toLowerCase().includes(query)
    );
  }, [orders, search]);

  const summary = useMemo(() => ({
    active: orders.filter((order) => ['created', 'processing'].includes(order.status)).length,
    retryable: orders.filter((order) => order.status === 'failed' && order.attempts < order.maxAttempts).length,
    paid: orders.filter((order) => order.status === 'paid').length,
  }), [orders]);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <div className="page-title">Orders</div>
          <div className="page-subtitle">
            {pagination.total} total orders with searchable tracking, expiry visibility, and retry awareness.
          </div>
        </div>
        <Link to="/orders/new" className="btn btn-primary">Create order</Link>
      </div>

      <div className="page-body">
        <section className="grid grid-3" style={{ marginBottom: 22 }}>
          <div className="stat-card">
            <div className="stat-head">
              <div className="stat-label">Active Queue</div>
              <div className="stat-icon">AQ</div>
            </div>
            <div className="stat-value">{summary.active}</div>
            <div className="stat-meta">Orders currently open for processing.</div>
          </div>
          <div className="stat-card">
            <div className="stat-head">
              <div className="stat-label">Retryable</div>
              <div className="stat-icon">RT</div>
            </div>
            <div className="stat-value">{summary.retryable}</div>
            <div className="stat-meta">Failed orders that can still be attempted again.</div>
          </div>
          <div className="stat-card">
            <div className="stat-head">
              <div className="stat-label">Paid Orders</div>
              <div className="stat-icon">PD</div>
            </div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{summary.paid}</div>
            <div className="stat-meta">Successfully completed order journeys.</div>
          </div>
        </section>

        <section className="card hover-lift">
          <div className="toolbar">
            <div className="search-shell">
              <input
                className="form-input"
                placeholder="Search by order ID or description"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="pill-note">Live local search on current page results</div>
            </div>
            <div className="toolbar-cluster">
              {FILTERS.map((status) => (
                <button
                  key={status || 'all'}
                  className={`chip-filter ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status || 'all'}
                </button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Expires</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                      <div className="spinner" style={{ margin: 'auto' }} />
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-icon">OR</div>
                        <div className="empty-title">No orders found</div>
                        <div className="empty-desc">Try another filter or create a new order.</div>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.map((order) => (
                  <tr key={order._id}>
                    <td><span className="mono">{order.orderId}</span></td>
                    <td><strong>{formatCurrency(order.amount, order.currency)}</strong></td>
                    <td><StatusBadge status={order.status} /></td>
                    <td style={{ fontSize: '0.85rem' }}>{order.attempts}/{order.maxAttempts}</td>
                    <td style={{ fontSize: '0.85rem', color: order.isExpired ? 'var(--error)' : 'var(--text-secondary)' }}>
                      {getExpiryLabel(order.expiresAt)}
                    </td>
                    <td style={{ maxWidth: 240 }}>{order.description || '-'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{formatDate(order.createdAt)}</td>
                    <td>
                      {(order.status === 'created' || order.status === 'failed') && order.attempts < order.maxAttempts ? (
                        <Link to={`/pay/${order.orderId}`} className="btn btn-primary btn-sm">Pay now</Link>
                      ) : (
                        <span className="pill-note">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => load(pagination.page - 1)} disabled={pagination.page === 1}>{'<'}</button>
              {Array.from({ length: pagination.pages }, (_, index) => index + 1).map((page) => (
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
