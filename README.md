# 💳 PayGateway — Production-Grade Payment System

A full-stack payment gateway inspired by Juspay/Razorpay, built with Node.js, Express, React, and MongoDB.

---

## 🏗️ Architecture Overview

```
payment-gateway-clone/
├── backend/
│   ├── config/           # DB, logger, swagger config
│   ├── controllers/      # Route handlers (auth, order, payment, webhook)
│   ├── middlewares/      # Auth, validation, rate-limit, idempotency
│   ├── models/           # Mongoose schemas (User, Order, Payment, Log, IdempotencyKey)
│   ├── routes/           # Express routers
│   ├── services/         # Business logic (paymentEngine, webhookService, logger)
│   ├── utils/            # AppError, JWT, crypto helpers
│   ├── seed.js           # Database seeder
│   └── server.js         # Entry point
└── frontend/
    └── src/
        ├── components/   # Layout component
        ├── context/      # AuthContext
        ├── pages/        # Login, Signup, Dashboard, Orders, Payment, Admin
        └── services/     # Axios API client
```

---

## 🚀 Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js + Express.js |
| Frontend | React 18 + Vite |
| Database | MongoDB + Mongoose |
| Auth | JWT (RS/HS256) |
| API Docs | Swagger/OpenAPI |
| Logging | Winston |
| Security | Helmet, CORS, Rate Limiting |

---

## ✨ Features

- **JWT Authentication** — Signup/login with role-based access (user/admin)
- **Order Management** — Create orders with unique IDs, expiry, and status tracking
- **Payment Processing** — Mock card & UPI with realistic delays (500ms–3s) and 85% success rate
- **Idempotency** — Prevents duplicate payments using header-based keys with TTL
- **Retry System** — Up to 3 configurable retry attempts per order
- **Transaction Logs** — Immutable audit trail for every event
- **Webhook Simulation** — Async delivery with HMAC-SHA256 signature verification
- **Admin Dashboard** — Real-time stats, all payments, full transaction logs
- **Security** — Card masking, SHA-256 hashing, input validation, rate limiting

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone & Install

```bash
git clone <repo-url>
cd payment-gateway-clone

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/payment_gateway
JWT_SECRET=your_super_secret_jwt_key_change_in_production
ENCRYPTION_KEY=your_32_char_encryption_key_here!!
WEBHOOK_SECRET=your_webhook_secret_key
PAYMENT_SUCCESS_RATE=0.85
```

### 3. Seed Database (Optional)

```bash
cd backend
node seed.js
```

This creates:
- Admin: `admin@paygateway.io` / `Admin@1234`
- User: `user@paygateway.io` / `User@1234`

### 4. Start Development Servers

**Backend (port 5000):**
```bash
cd backend
npm run dev
```

**Frontend (port 3000):**
```bash
cd frontend
npm run dev
```

Open: http://localhost:3000

---

## 📡 API Reference

Swagger UI: **http://localhost:5000/api/docs**

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | Get my orders |
| GET | `/api/orders/:orderId` | Get single order |
| GET | `/api/orders/admin/all` | [Admin] All orders |

### Payments

| Method | Endpoint | Auth Header | Description |
|--------|----------|-------------|-------------|
| POST | `/api/payments` | `Idempotency-Key: <key>` | Initiate payment |
| POST | `/api/payments/retry` | `Idempotency-Key: <key>` | Retry failed payment |
| GET | `/api/payments/my` | — | My payments |
| GET | `/api/payments/:id` | — | Get payment by ID |
| GET | `/api/payments/admin/all` | — | [Admin] All payments |
| GET | `/api/payments/admin/dashboard` | — | [Admin] Dashboard stats |

### Transaction Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions/my` | My transaction logs |
| GET | `/api/transactions` | [Admin] All logs |

---

## 🧪 API Testing Steps

### Step 1: Register & Login
```bash
# Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"Test@1234"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@1234"}'
```

Copy the `token` from the response.

### Step 2: Create an Order
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"amount":999,"currency":"INR","description":"Test order"}'
```

Copy the `orderId` from the response.

### Step 3: Initiate Payment (Card)
```bash
curl -X POST http://localhost:5000/api/payments \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique_key_$(date +%s)" \
  -d '{
    "orderId": "<ORDER_ID>",
    "method": "card",
    "cardDetails": {
      "number": "4111111111111111",
      "expiryMonth": "12",
      "expiryYear": "2028",
      "cvv": "123"
    }
  }'
```

### Step 4: Initiate Payment (UPI)
```bash
curl -X POST http://localhost:5000/api/payments \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: upi_$(date +%s)" \
  -d '{"orderId":"<ORDER_ID>","method":"upi","upiDetails":{"vpa":"test@upi"}}'
```

### Step 5: Test Idempotency (Same key, same request)
```bash
# Second call with same Idempotency-Key returns cached response
curl -X POST http://localhost:5000/api/payments \
  -H "Idempotency-Key: same_key_as_before" \
  ...
```

### Step 6: Admin Dashboard
```bash
# Login as admin first, then:
curl -X GET http://localhost:5000/api/payments/admin/dashboard \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

## 🔐 Security Notes

- **Cards**: Number is hashed with SHA-256, only last 4 digits stored as masked. CVV is NEVER persisted.
- **JWT**: Signed with HS256, checks password change timestamp
- **Rate Limiting**: 100 req/15min global, 10 auth attempts/15min, 5 payments/min
- **Helmet**: Sets 14 security headers
- **Input Validation**: express-validator on all endpoints
- **Idempotency TTL**: 24-hour MongoDB TTL index auto-expires keys

---

## 🎛️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYMENT_SUCCESS_RATE` | 0.85 | Probability of payment success (0–1) |
| `PAYMENT_MIN_DELAY_MS` | 500 | Min processing delay |
| `PAYMENT_MAX_DELAY_MS` | 3000 | Max processing delay |
| `RATE_LIMIT_MAX` | 100 | Requests per window |
| `JWT_EXPIRES_IN` | 7d | Token expiry |

---

## 📦 Production Deployment

```bash
# Backend
NODE_ENV=production npm start

# Frontend
npm run build
# Serve dist/ with nginx or a CDN
```

For production, also:
1. Use MongoDB Atlas with SSL
2. Set strong `JWT_SECRET` (64+ chars)
3. Configure CORS to your exact domain
4. Enable MongoDB Atlas IP whitelist
5. Use a process manager like PM2

---

## 📄 License

MIT — Built for educational and production use.
