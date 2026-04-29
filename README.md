# PayGateway

Production-style payment processing system inspired by Razorpay and Juspay.  
Built with `Node.js`, `Express`, `React`, `Vite`, and `MongoDB`.

## Overview

This project simulates a modern payment gateway where users can:

- sign up and log in
- create payment orders
- pay using card, UPI, net banking, or wallet simulation
- retry failed payments
- view transaction history
- access admin analytics and logs

It goes beyond a normal CRUD app by covering real payment-system concepts like:

- idempotency
- retry handling
- transaction logging
- webhook simulation
- rate limiting
- secure card masking and hashing

## What's New In This Version

- redesigned frontend with a more attractive 3D-style dashboard
- richer hover effects and layered visual cards
- improved checkout experience with trust/timeline sections
- better order insights, search, and retry visibility
- admin dashboard polished for demos and interviews
- interview guide generated in `docs/` and kept out of Git using `.gitignore`

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, React Router, Axios |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Auth | JWT |
| Security | Helmet, CORS, rate limiting, validators |
| Docs | Swagger / OpenAPI |
| Logging | Winston, custom transaction logs |

## Project Structure

```text
payment-processing-system/
|-- backend/
|   |-- config/
|   |-- controllers/
|   |-- middlewares/
|   |-- models/
|   |-- routes/
|   |-- services/
|   |-- utils/
|   |-- .env.example
|   |-- seed.js
|   `-- server.js
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- pages/
|   |   `-- services/
|   |-- index.html
|   `-- vite.config.js
|-- docs/
|-- package.json
`-- README.md
```

## Key Features

### User Features

- JWT-based signup and login
- protected dashboard and routes
- order creation with amount, currency, description, and metadata
- payment checkout with multiple simulated methods
- retry for failed payments within max attempt limit
- transaction history page

### Payment Features

- idempotency key required on payment operations
- mock payment engine with configurable delay and success rate
- card details masked and hashed
- UPI VPA support
- webhook simulation after payment result
- separate payment and order lifecycle tracking

### Admin Features

- overall payment stats
- revenue view
- payment method breakdown
- recent payments table
- transaction/event logs

## Backend Flow

1. User authenticates and receives JWT.
2. User creates an order.
3. Frontend sends payment request with `Idempotency-Key`.
4. Backend validates payload and checks idempotency.
5. Payment service processes payment through mock engine.
6. Payment and order statuses are updated.
7. Transaction logs are stored.
8. Webhook dispatch is simulated asynchronously.

## Order vs Payment

- `Order` means payment intent.
- `Payment` means an actual transaction attempt.

One order can have multiple payment attempts because retries are supported.

## Security Highlights

- JWT auth
- role-based admin protection
- Helmet security headers
- route-level rate limiting
- request validation with `express-validator`
- SHA-256 card hashing
- masked card storage
- CVV is never stored
- idempotency protection for duplicate payment requests

## API Summary

Swagger UI:

```text
http://localhost:5000/api/docs
```

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Orders

- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:orderId`
- `GET /api/orders/admin/all`

### Payments

- `POST /api/payments`
- `POST /api/payments/retry`
- `GET /api/payments/my`
- `GET /api/payments/:paymentId`
- `GET /api/payments/admin/all`
- `GET /api/payments/admin/dashboard`

### Transactions

- `GET /api/transactions/my`
- `GET /api/transactions`

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB local or Atlas
- npm

### 1. Install dependencies

From project root:

```bash
npm run install:all
```

Or manually:

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment

Copy:

```bash
cd backend
cp .env.example .env
```

Add values in `backend/.env`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/payment_gateway
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=your_32_char_encryption_key_here!!
WEBHOOK_SECRET=your_webhook_secret_key
WEBHOOK_URL=http://localhost:5000/api/webhooks/payment
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
PAYMENT_SUCCESS_RATE=0.85
PAYMENT_MIN_DELAY_MS=500
PAYMENT_MAX_DELAY_MS=3000
```

### 3. Seed demo users

```bash
npm run seed
```

Demo credentials:

- Admin: `admin@paygateway.io` / `Admin@1234`
- User: `user@paygateway.io` / `User@1234`

### 4. Run backend

```bash
npm run dev:backend
```

Backend runs on:

```text
http://localhost:5000
```

### 5. Run frontend

```bash
npm run dev:frontend
```

Frontend runs on:

```text
http://localhost:3000
```

Vite proxy is already configured to forward `/api` requests to backend `http://localhost:5000`.

## Build

Frontend production build:

```bash
npm run build:frontend
```

## Demo Testing Flow

### Create account or use seeded user

Login using demo credentials or register a new user.

### Create order

- go to Orders
- create a new order
- enter amount, currency, description

### Pay for order

- choose card, UPI, net banking, or wallet
- submit payment
- if failed, use retry when attempts remain

### Check logs

- open Transactions page for user events
- open Admin page for global analytics

## Interview Value

This project is strong for interviews because it demonstrates:

- full stack architecture
- modular backend design
- practical payment concepts
- authentication and authorization
- observability and audit logging
- security-aware data handling
- polished product UI, not just backend APIs

## Notes

- Generated interview docs in `docs/` are ignored from Git.
- Logs and build output are also ignored through `.gitignore`.
- There is a stray file `backend/1.py` in the repo which does not appear to be part of the main application flow.

## License

MIT
