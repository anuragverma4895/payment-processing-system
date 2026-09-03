const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');

const connectDB = require('./config/database');
const swaggerSpec = require('./config/swagger');
const logger = require('./config/logger');
const paymentConfig = require('./config/payment');
const { globalLimiter } = require('./middlewares/rateLimiter');
const errorHandler = require('./middlewares/errorHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const internalRoutes = require('./routes/internalRoutes');

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const app = express();

logger.info(`Payment configuration: PAYMENT_SUCCESS_RATE=${paymentConfig.successRate}, PAYMENT_MIN_DELAY_MS=${paymentConfig.minDelayMs}, PAYMENT_MAX_DELAY_MS=${paymentConfig.maxDelayMs}`);

connectDB();

// Security middleware
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Body parsing
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// Rate limiting
app.use('/api', globalLimiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/internal', internalRoutes);

// Swagger API documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Payment Gateway API Docs',
}));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
} else {
  // Health checks
  app.get('/', (req, res) => {
    res.send('Payment Gateway API is running');
  });
}

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
  });
});

// SPA fallback and 404 handler
app.all('*', (req, res) => {
  if (process.env.NODE_ENV === 'production' && !req.path.startsWith('/api')) {
    return res.sendFile(path.resolve(__dirname, '../frontend/dist', 'index.html'));
  }
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

// Crash handling
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;
