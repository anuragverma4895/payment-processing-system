# PayGateway: Enterprise Payment Processing Simulation

PayGateway is a full-stack, production-styled payment processing system simulation. It is designed to demonstrate enterprise-grade engineering practices, robust architecture, and professional UI/UX design. The system simulates the core functionalities of a modern payment gateway (like Stripe or Razorpay) without connecting to real financial networks, making it a perfect showcase for system design, security patterns, and resilient asynchronous workflows.

---

## 🏗️ 1. Project & Architecture Documentation

PayGateway follows a standard decoupled **client-server architecture**, split between a React SPA (frontend) and a Node.js/Express API (backend), backed by MongoDB.

### Core Stack
* **Frontend:** React (Vite), React Router, Context API, CSS (Custom Design System).
* **Backend:** Node.js, Express.js.
* **Database:** MongoDB (Mongoose).
* **Security:** JWT (Authentication), Bcrypt (Password Hashing), Crypto (Data Encryption).
* **Tooling:** Prettier, ESLint, concurrently.

### System Architecture Highlights
* **Idempotency:** A critical pattern for payment systems. The backend uses `idempotencyKey` headers to ensure that duplicate payment requests (due to network retries or double-clicks) do not result in double charges.
* **State Machine:** Orders transition strictly through defined states (`created` -> `processing` -> `paid` | `failed`).
* **Retry Resilience:** The system allows retry logic with hard limits (e.g., maximum 3 attempts per order).
* **Webhook Simulation:** Simulates the asynchronous nature of financial networks where payment confirmation happens out-of-band via webhooks.

---

## 🛠️ 2. System Design & Data-Flow

### Order & Payment Data Flow
1. **Order Creation:** A merchant/user creates an `Order` containing the `amount`, `currency`, and `metadata`. An `orderId` is generated.
2. **Payment Intent:** The user initiates a payment checkout. The client securely sends the payment payload alongside a unique `idempotencyKey`.
3. **Idempotency Check:** The API intercepts the request. If the `idempotencyKey` has been processed before, it returns the cached result. Otherwise, it locks the key.
4. **Simulation Engine:** The payload is handed to the `PaymentEngine` which applies probabilistic success/failure delays based on configured `.env` thresholds.
5. **State Mutation:** If the engine succeeds, the `Payment` and `Order` models are updated to `paid` and `success`.
6. **Transaction Logging:** Every major boundary crossing creates an immutable record in the `Transaction` ledger.
7. **Webhook Dispatch:** A simulated webhook is queued for delivery, mimicking how third-party gateways notify the merchant backend.

---

## 📡 3. API Overview

The API is fully RESTful and protected using JWT Bearer authentication.

### Authentication (`/api/auth`)
* `POST /register`: Create a new user (Admin or User).
* `POST /login`: Authenticate and receive a JWT.
* `GET /me`: Get current user context.

### Orders (`/api/orders`)
* `POST /`: Create a new payable order.
* `GET /`: Retrieve paginated orders.
* `GET /:id`: Fetch a specific order.

### Payments (`/api/payments`)
* `POST /initiate`: Process a payment. Requires `Idempotency-Key` header.
* `POST /retry`: Retry a previously failed order. Requires `Idempotency-Key` header.
* `GET /my-payments`: View payment history for the user.
* `GET /admin/all`: (Admin only) System-wide payment logs.
* `GET /admin/dashboard`: (Admin only) Aggregate system KPIs.

### Webhooks (`/api/webhooks`)
* `POST /payment`: The endpoint that receives simulated async payment confirmations. Validates HMAC signatures.

---

## 🗄️ 4. Database Explanation

The system uses MongoDB with Mongoose ODMs, structurally enforcing schemas and relations.

### Key Collections
1. **User:** Stores authentication data. Passwords are hashed. Role-based access is defined (`user` vs `admin`).
2. **Order:** Represents the merchant's intent to collect money. Tracks `amount`, `currency`, `status`, `expiresAt`, and retry constraints (`attempts`, `maxAttempts`).
3. **Payment:** The execution of a payment against an Order. Tracks `method` (card, upi, netbanking), `status`, and masked payment metadata. Linked to both User and Order via Refs.
4. **Transaction:** An append-only audit log capturing `event` type, `duration`, `ipAddress`, and raw `message`. Essential for compliance.
5. **IdempotencyKey:** A temporary store for processed keys to ensure duplicate network calls are safely resolved.

---

## 🔒 5. Security Explanation

To simulate a real fintech environment, several security best-practices were implemented:
* **Idempotency:** Protects against accidental double-billing.
* **Sensitive Data Masking:** Card numbers are never stored in full. Only the last 4 digits are kept in the database for reference.
* **Webhook Signatures:** Simulated webhooks calculate an HMAC SHA-256 signature (`x-webhook-signature`). The receiving endpoint verifies this to prevent spoofing.
* **Rate Limiting:** `express-rate-limit` protects the API from brute-force and DDoS attacks (e.g., 100 requests / 15 minutes).
* **JWT & Roles:** Strict role-based middleware (`isAdmin`) segregates merchant operations from administrative oversight.

---

## ⚙️ 6. Payment & Webhook Simulation Engines

### Payment Engine (`paymentEngine.js`)
Since there is no actual bank connection, the backend uses a robust `simulateGateway` function.
* Introduces artificial latency (e.g., 500ms - 3000ms) to simulate bank processing.
* Uses probabilistic failure rates (configurable via `PAYMENT_SUCCESS_RATE` in `.env`).
* Validates simulated network rules (e.g., matching Discover cards, declining expired test cards).

### Webhook Engine (`webhookService.js`)
Payment systems rely on async communication.
* Upon payment completion, the backend schedules a webhook delivery.
* It signs the payload using `WEBHOOK_SECRET`.
* A mock endpoint (`/api/webhooks/payment`) receives the POST request, verifies the HMAC hash, and marks the delivery as `webhookSent = true`.

---

## 🎨 7. UI/UX Design Rationale (Improvements)

The frontend was entirely overhauled from a generic dark-mode UI to a **Premium Fintech Light-Mode Dashboard**.

**Core Improvements Implemented:**
1. **Aesthetic Shift:** Transitioned to a clean, high-contrast light theme (whites, light grays, stark borders) reflecting the professionalism of B2B platforms like Stripe or Adyen.
2. **Typography Update:** Swapped playful display fonts for **Inter**, ensuring maximum legibility for financial data, metrics, and tabular information.
3. **Color Palette:** Restricted the palette. Removed neon gradients in favor of subtle semantic colors (`var(--success)` green, `var(--error)` red, and a deep blue `var(--accent)`).
4. **Component Polish:** 
    * Replaced all text-based placeholders with **clean SVG icons**.
    * Replaced all casual/Hinglish copy with polished, professional English copywriting.
    * Added subtle micro-interactions (`hover-lift`, `transition: all 0.2s ease`) to make the interface feel responsive and alive without being flashy.
5. **Layout Refinement:** Re-engineered the Sidebar and Topbar into a traditional "Command Center" layout, ensuring quick access to metrics, orders, and admin controls.

---

## 🚀 8. Running Locally

### Prerequisites
* Node.js (v18+)
* MongoDB (Local instance or Atlas URI)

### Setup
1. **Install Dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configuration:**
   Ensure `backend/.env` is configured correctly (refer to `backend/.env.example`).
   Ensure `frontend/.env` is configured for API targeting.

3. **Run Application (Concurrently):**
   In the root directory, you can start both frontend and backend:
   ```bash
   npm run dev
   ```
   * Frontend runs on `http://localhost:5173`
   * Backend API runs on `http://localhost:5000`

---
*Developed as a demonstration of enterprise payment systems engineering and design.*
