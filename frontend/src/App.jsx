import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import CreateOrderPage from './pages/CreateOrderPage';
import PaymentPage from './pages/PaymentPage';
import TransactionsPage from './pages/TransactionsPage';
import AdminPage from './pages/AdminPage';
import Layout from './components/Layout';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="orders/new" element={<CreateOrderPage />} />
        <Route path="pay/:orderId" element={<PaymentPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
      </Route>
      <Route path="/admin" element={<AdminRoute><Layout /></AdminRoute>}>
        <Route index element={<AdminPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(7, 18, 32, 0.92)',
              color: '#edf4ff',
              border: '1px solid rgba(137, 183, 255, 0.16)',
              borderRadius: '18px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.32)',
              fontFamily: "'Outfit', sans-serif",
            },
          }}
        />
      </Router>
    </AuthProvider>
  );
}
