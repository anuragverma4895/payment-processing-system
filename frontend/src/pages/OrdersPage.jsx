import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../services/api';

const StatusBadge = ({ status }) => {
  const map = { paid: 'badge-success', failed: 'badge-error', cancelled: 'badge-error', processing: 'badge-pending', created: 'badge-pending', refunded: 'badge-warning' };
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await orderAPI.getAll({ page, limit: 10, status: statusFilter || undefined });
      setOrders(data.data.orders);
      setPagination(data.data.pagination);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(1); }, [statusFilter]);

  const formatCurrency = (amount, currency = 'INR') =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Orders</div>
          <div className="page-subtitle">{pagination.total} total orders</div>
        </div>
        <Link to="/orders/new" className="btn btn-primary">+ New Order</Link>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['', 'created', 'processing', 'paid', 'failed', 'cancelled'].map(s => (
            <button
              key={s}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Description</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: 'auto' }} /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-icon">◫</div>
                    <div className="empty-title">No orders found</div>
                    <div className="empty-desc">Create your first order to get started</div>
                  </div>
                </td></tr>
              ) : orders.map(order => (
                <tr key={order._id}>
                  <td><span className="mono">{order.orderId}</span></td>
                  <td><strong>{formatCurrency(order.amount, order.currency)}</strong></td>
                  <td><StatusBadge status={order.status} /></td>
                  <td>
                    <span style={{ fontSize: 12 }}>{order.attempts}/{order.maxAttempts}</span>
                  </td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {order.description || '-'}
                  </td>
                  <td style={{ fontSize: 12 }}>{formatDate(order.createdAt)}</td>
                  <td>
                    {(order.status === 'created' || order.status === 'failed') && order.attempts < order.maxAttempts ? (
                      <Link to={`/pay/${order.orderId}`} className="btn btn-primary btn-sm">Pay</Link>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="pagination">
            <button className="page-btn" onClick={() => load(pagination.page - 1)} disabled={pagination.page === 1}>‹</button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => load(p)}>{p}</button>
            ))}
            <button className="page-btn" onClick={() => load(pagination.page + 1)} disabled={pagination.page === pagination.pages}>›</button>
          </div>
        )}
      </div>
    </>
  );
}
