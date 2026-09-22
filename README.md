# Payment Processing System

> A full-stack **payment processing simulation** built with React, Node.js/Express, and MongoDB — demonstrating production-grade patterns like idempotency, webhook delivery, retry mechanisms, RBAC, and transaction logging **without processing real money**.

---

## Table of Contents

- [Project Overview](#1-project-overview)
- [Key Features](#2-key-features)
- [Technology Stack](#3-technology-stack)
- [High-Level Architecture](#4-high-level-architecture)
- [System Architecture Explanation](#5-system-architecture-explanation)
- [Complete Request Flow](#6-complete-request-flow)
- [Payment Flow](#7-payment-flow)
- [Payment State Machine](#8-payment-state-machine)
- [Order Lifecycle](#9-order-lifecycle)
- [Idempotency](#10-idempotency)
- [Retry Mechanism](#11-retry-mechanism)
- [Webhook System](#12-webhook-system)
- [Failure Handling](#13-failure-handling)
- [Database Design](#14-database-design)
- [Database Schema](#15-database-schema)
- [API Architecture](#16-api-architecture)
- [API Request/Response Examples](#17-api-requestresponse-examples)
- [Authentication & Authorization](#18-authentication--authorization)
- [Security](#19-security)
- [Payment Simulation](#20-payment-simulation)
- [Configuration](#21-configuration)
- [Project Directory Structure](#22-project-directory-structure)
- [Important Design Decisions](#23-important-design-decisions)
- [Trade-Offs](#24-trade-offs)
- [Scalability](#25-scalability)
- [Reliability](#26-reliability)
- [Observability / Logging](#27-observability--logging)
- [Testing](#28-testing)
- [Deployment](#29-deployment)
- [Complete Data Flow Diagram](#30-complete-data-flow-diagram)
- [Complete System Flow](#31-complete-system-flow)
- [Interview Questions & Answers](#32-interview-questions--answers)
- [Project-Specific Trick Questions](#33-project-specific-trick-questions)
- [Explain This Project in 60 Seconds](#34-explain-this-project-in-60-seconds)
- [Explain This Project in 2 Minutes](#35-explain-this-project-in-2-minutes)
- [Deep Dive — Follow-Up Answers](#36-deep-dive--follow-up-answers)
- [Common Mistakes / Things I Should NOT Claim](#37-common-mistakes--things-i-should-not-claim)
- [Future Improvements](#38-future-improvements)
- [Quick Interview Revision](#39-quick-interview-revision)

---

## 1. Project Overview

### What problem does it solve?

Payment systems are among the most complex software in production — they must handle concurrent requests safely, prevent duplicate charges, recover from failures, and maintain a complete audit trail. This project demonstrates how such a system is architected **end-to-end**, from user interface to database, using industry patterns.

### What the application does

- **Users** can register, log in, create payment orders, initiate payments (card / UPI / netbanking / wallet), retry failed payments, and view transaction history.
- **Admins** can view all orders, all payments, dashboard analytics (revenue, success rate, method breakdown), and full transaction logs.
- A **simulated payment engine** produces realistic success/failure outcomes with configurable success rates and processing delays.
- **Webhooks** are generated for every payment outcome and optionally forwarded to an external **AI Revenue Recovery Agent**.

### Why the project was built

To demonstrate understanding of:
- Payment lifecycle management (order → payment → success/failure → retry)
- Idempotency for safe duplicate-request handling
- Webhook-based event-driven communication
- Service-layer architecture with clean separation of concerns
- Security best practices (JWT, bcrypt, HMAC, card masking, rate limiting)
- Admin observability through dashboards and transaction logs

### Who can use it

Anyone studying payment system design, preparing for backend/full-stack interviews, or evaluating how production payment patterns work.

---

## 2. Key Features

| Feature | Status | Details |
|---|---|---|
| User registration & login | ✅ | Email/password with validation |
| JWT authentication | ✅ | Bearer token, 7-day expiry, httpOnly cookie |
| Role-based authorization | ✅ | `user` and `admin` roles via `restrictTo()` middleware |
| Order creation | ✅ | Amount, currency (INR/USD/EUR/GBP/AED), description, 30-min expiry |
| Payment initiation | ✅ | Card, UPI, netbanking, wallet methods |
| Payment processing (simulated) | ✅ | Configurable success rate, realistic delays, gateway responses |
| Payment status tracking | ✅ | pending → processing → success / failed |
| Payment retry | ✅ | Max 3 attempts per order, dedicated retry endpoint |
| Idempotency | ✅ | Header-based `Idempotency-Key`, dedup via MongoDB, cached responses |
| Transaction logging | ✅ | Every event (initiated, success, failed, retry, webhook) recorded |
| Webhook generation | ✅ | HMAC-signed payloads for payment.success / payment.failed |
| HMAC webhook signing | ✅ | SHA-256 HMAC with `WEBHOOK_SECRET` |
| Webhook receiver with signature verification | ✅ | Constant-time comparison via `crypto.timingSafeEqual` |
| Recovery Agent integration | ✅ | Fire-and-forget notification to external AI agent on payment.failed |
| Internal retry API | ✅ | API-key-authenticated endpoint for Recovery Agent to trigger retries |
| Admin dashboard | ✅ | Aggregated stats, method breakdown, recent payments, logs |
| Rate limiting | ✅ | Global (100/15min), auth (10/15min), payment (5/min) |
| Request validation | ✅ | express-validator for all inputs (card, UPI, order, auth) |
| Card masking | ✅ | `**** **** **** 4242` — only last 4 digits stored |
| Card hashing | ✅ | SHA-256 hash of full card number stored for identification |
| Card type detection | ✅ | Visa, Mastercard, Amex, Discover auto-detected |
| CVV never stored | ✅ | CVV is validated but never persisted — not even hashed |
| Password hashing | ✅ | bcrypt with salt rounds of 12 |
| Structured logging | ✅ | Winston with file + console transports |
| Swagger API docs | ✅ | Auto-generated OpenAPI 3.0 at `/api/docs` |
| Graceful shutdown | ✅ | SIGTERM handler for clean server shutdown |
| Privilege escalation prevention | ✅ | Signup rejects `role: 'admin'` from API |
| SPA deployment | ✅ | Production serves React from Express, SPA fallback |

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + Vite 5 | SPA with component-based UI, HMR in development |
| Routing (FE) | react-router-dom v6 | Client-side routing with protected/admin/public route guards |
| HTTP Client (FE) | Axios | API calls with interceptors for JWT injection and 401 redirect |
| Notifications (FE) | react-hot-toast | User feedback for payment success/failure/errors |
| Backend | Node.js + Express 4 | RESTful API server with middleware pipeline |
| Database | MongoDB + Mongoose 8 | Document store for orders, payments, users, logs, idempotency keys |
| Authentication | JSON Web Tokens (jsonwebtoken) | Stateless auth with role encoding |
| Password Security | bcryptjs | Password hashing with cost factor 12 |
| Validation | express-validator | Input sanitization and constraint validation |
| Rate Limiting | express-rate-limit | DDoS/abuse protection per IP+user |
| Security Headers | Helmet | HTTP security headers (CSP, X-Frame, etc.) |
| Logging | Winston + Morgan | Structured JSON logging to file; HTTP request logging |
| API Docs | swagger-jsdoc + swagger-ui-express | Interactive API documentation |
| Unique IDs | uuid (v4) + nanoid | Order IDs (`ORD_...`), Payment IDs (`PAY_...`) |
| Deployment | Render (render.yaml) | Backend as web service, frontend as static site |

---

## 4. High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        U["👤 User Browser"]
        RC["React SPA<br/>(Vite + React Router)"]
    end

    subgraph "API Gateway Layer"
        RL["Rate Limiter"]
        HE["Helmet Security"]
        CO["CORS"]
    end

    subgraph "Middleware Pipeline"
        AU["JWT Auth Middleware"]
        VA["Validators<br/>(express-validator)"]
        ID["Idempotency Middleware"]
        IA["Internal Auth<br/>(API Key)"]
    end

    subgraph "Controller Layer"
        AC["Auth Controller"]
        OC["Order Controller"]
        PC["Payment Controller"]
        TC["Transaction Controller"]
        WC["Webhook Controller"]
        IC["Internal Controller"]
    end

    subgraph "Service Layer"
        PS["Payment Service"]
        PE["Payment Engine<br/>(Simulator)"]
        WS["Webhook Service"]
        TL["Transaction Logger"]
    end

    subgraph "Data Layer"
        DB[("MongoDB")]
        UM["User Model"]
        OM["Order Model"]
        PM["Payment Model"]
        IK["IdempotencyKey Model"]
        TM["TransactionLog Model"]
    end

    subgraph "External"
        RA["AI Revenue<br/>Recovery Agent"]
    end

    U --> RC
    RC -->|Axios + JWT| RL
    RL --> HE --> CO --> AU
    AU --> VA --> ID
    IA -->|x-internal-api-key| IC
    VA --> AC & OC & PC & TC
    ID --> PC
    WC -->|Signature Verify| WC
    PC --> PS
    IC --> PS
    PS --> PE
    PS --> TL
    PS --> WS
    WS -->|HMAC Signed| U
    WS -->|payment.failed| RA
    RA -->|Internal Retry API| IA
    PS --> DB
    TL --> DB
    AC & OC --> DB
```

---

## 5. System Architecture Explanation

### Frontend (React + Vite)

- **8 pages**: Login, Signup, Dashboard, Orders, Create Order, Payment (checkout), Transactions, Admin
- **AuthContext** manages JWT token in localStorage, provides `user`, `isAdmin`, `login`, `signup`, `logout`
- **Protected routes**: `ProtectedRoute` (requires login), `AdminRoute` (requires `role: 'admin'`), `PublicRoute` (redirects if logged in)
- **API service** (`api.js`): Axios instance with base URL, 30s timeout, request interceptor for Bearer token, response interceptor for 401 auto-logout
- Generates unique `Idempotency-Key` per payment attempt client-side

### Backend (Express)

- Entry point `server.js` bootstraps middleware, routes, error handler, Swagger docs
- Body parsing: raw for webhooks, JSON (10kb limit) for everything else
- SPA fallback in production: serves `frontend/dist/index.html` for non-API routes

### Controllers

| Controller | Responsibility |
|---|---|
| `authController` | Signup (with privilege escalation prevention), login, getMe, logout |
| `orderController` | Create order, get user's orders (paginated), get by ID, admin get all |
| `paymentController` | Initiate payment, retry payment, get user's payments, get by ID, admin get all, admin dashboard stats |
| `transactionController` | Get user's transaction logs, admin get all logs (paginated, filterable) |
| `webhookController` | Receive incoming webhooks, verify HMAC signature, log event |
| `internalController` | Internal retry endpoint for Recovery Agent — validates order, reuses stored card/UPI details, calls `paymentService.retryPayment()` |

### Services

| Service | Responsibility |
|---|---|
| `paymentService` | Core business logic: validates order state, creates Payment record, updates Order status, calls payment engine, handles success/failure, triggers webhook |
| `paymentEngine` | **Simulates** payment processing — configurable success rate, random delay (500–3000ms), generates transaction IDs, RRNs, approval codes, failure reasons |
| `webhookService` | Builds webhook payload, generates HMAC signature, simulates async delivery, notifies Recovery Agent on failure |
| `transactionLogger` | Writes structured events to `TransactionLog` collection with IP, user-agent, duration |

### Middleware

| Middleware | Responsibility |
|---|---|
| `auth.protect` | Extracts JWT from `Authorization: Bearer`, verifies, loads user, checks password-changed-after |
| `auth.restrictTo` | Role-based access control — rejects if user's role not in allowed list |
| `idempotency` | Requires `Idempotency-Key` header (16–255 chars), checks for existing key, returns cached response or creates new record, overrides `res.json` to capture response |
| `internalAuth` | Validates `x-internal-api-key` header with constant-time comparison (`crypto.timingSafeEqual`) |
| `validators` | Input validation rules for signup, login, order creation, payment initiation |
| `rateLimiter` | Three tiers: global (100/15min), auth (10/15min), payment (5/min) |
| `errorHandler` | Catches all errors — handles CastError, duplicate key, validation, JWT errors differently in dev vs prod |

### Payment Engine (Simulator)

- **Card payments**: Random success based on `PAYMENT_SUCCESS_RATE` (default 85%), generates transaction ID, RRN, approval code, maps card type to network response
- **UPI payments**: Same success rate, generates UPI-specific transaction IDs and failure reasons
- **Netbanking/Wallet**: Falls through to card engine (generic simulation)
- Failure reasons are realistic: "Insufficient funds", "Card declined by issuing bank", "Suspected fraud", etc.

### Database (MongoDB)

- 5 collections: `users`, `orders`, `payments`, `idempotencykeys`, `transactionlogs`
- Compound indexes for query performance
- TTL index on idempotency keys (auto-delete after 24h)
- Virtual field `isExpired` on Order model

---

## 6. Complete Request Flow

```
User clicks "Pay ₹999"
  │
  ▼
React PaymentPage → builds payload + generates idempotency key
  │
  ▼
Axios POST /api/payments with:
  - Authorization: Bearer <JWT>
  - Idempotency-Key: idem_1695000000_abc123xyz
  - Body: { orderId, method, cardDetails }
  │
  ▼
Express receives request
  │
  ├─ Helmet (security headers)
  ├─ CORS (origin check)
  ├─ Rate Limiter (5/min for payments)
  ├─ Body parser (JSON, 10kb limit)
  │
  ▼
paymentRoutes.js
  │
  ├─ protect middleware → verifies JWT, loads user
  ├─ paymentLimiter → checks per-IP+user rate
  ├─ createPaymentValidator → validates orderId, method, card/UPI fields
  ├─ validate → returns 400 if validation fails
  ├─ idempotencyCheck → checks/creates idempotency record
  │
  ▼
paymentController.initiatePayment
  │
  ▼
paymentService.processPayment
  │
  ├─ 1. Fetch order, validate ownership and state
  ├─ 2. Mask card number, hash card, detect type
  ├─ 3. Create Payment record (status: pending)
  ├─ 4. Update Order status → processing, increment attempts
  ├─ 5. Log "payment.initiated" event
  ├─ 6. Set Payment status → processing
  ├─ 7. Call paymentEngine (simulated processing with delay)
  ├─ 8a. SUCCESS: Update Payment → success, Order → paid, log event, send webhook
  ├─ 8b. FAILURE: Update Payment → failed, Order → created/failed, log event, send webhook
  │
  ▼
webhookService.sendWebhook
  │
  ├─ Build payload with payment details
  ├─ Generate HMAC signature
  ├─ Simulate async delivery (setTimeout)
  ├─ If payment.failed → notify Recovery Agent (fire-and-forget)
  │
  ▼
Response returned to controller
  │
  ▼
Idempotency middleware captures response, saves to IdempotencyKey record
  │
  ▼
JSON response sent to React frontend
  │
  ▼
PaymentPage shows success/failure result card with retry option
```

---

## 7. Payment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React Frontend
    participant MW as Middleware Pipeline
    participant PS as Payment Service
    participant PE as Payment Engine
    participant DB as MongoDB
    participant WH as Webhook Service
    participant RA as Recovery Agent

    U->>FE: Click "Pay ₹999"
    FE->>MW: POST /api/payments + JWT + Idempotency-Key
    MW->>MW: Auth → Validate → Rate Limit → Idempotency Check
    MW->>PS: Call processPayment()

    PS->>DB: Fetch Order, validate state
    PS->>DB: Create Payment (pending)
    PS->>DB: Update Order → processing
    PS->>DB: Log "payment.initiated"

    PS->>PE: Process payment (simulated)
    PE-->>PE: Random delay (500-3000ms)
    PE-->>PS: Return success/failure

    alt Payment Success
        PS->>DB: Payment → success
        PS->>DB: Order → paid
        PS->>DB: Log "payment.success"
        PS->>WH: Send webhook (payment.success)
    else Payment Failure
        PS->>DB: Payment → failed
        PS->>DB: Order → created/failed
        PS->>DB: Log "payment.failed"
        PS->>WH: Send webhook (payment.failed)
        WH->>RA: Notify Recovery Agent
    end

    PS-->>MW: Return result
    MW-->>FE: JSON response
    FE-->>U: Show result + retry option
```

### Step-by-Step Payment Lifecycle

1. **User creates an order** — stored in MongoDB with status `created`, 30-min expiry, `maxAttempts: 3`
2. **User initiates payment** — selects method, enters card/UPI details
3. **Request validated** — express-validator checks all required fields
4. **Idempotency key checked** — if duplicate key found with completed response, cached response returned
5. **Payment record created** — status `pending`, card details masked/hashed
6. **Order updated** — status → `processing`, attempts incremented
7. **Payment engine processes** — simulated delay, random success/failure based on `PAYMENT_SUCCESS_RATE`
8. **On success** — Payment → `success`, Order → `paid`, `paidAt` timestamp set
9. **On failure** — Payment → `failed`, failure reason stored. If attempts < maxAttempts, Order → `created` (retryable). If attempts ≥ maxAttempts, Order → `failed`
10. **Transaction logged** — event recorded with duration, metadata, IP, user-agent
11. **Webhook dispatched** — HMAC-signed payload sent asynchronously
12. **Recovery Agent notified** — if payment failed and `RECOVERY_AGENT_URL` is configured
13. **Response returned** — includes payment details, order status, remaining attempts

---

## 8. Payment State Machine

### Payment States

```mermaid
stateDiagram-v2
    [*] --> pending : Payment created
    pending --> processing : Engine starts processing
    processing --> success : Engine returns success
    processing --> failed : Engine returns failure
    success --> [*] : Terminal
    failed --> [*] : Terminal (new Payment for retry)
```

**Actual states in code**: `pending`, `processing`, `success`, `failed`, `refunded`

| Transition | Trigger | Service |
|---|---|---|
| `→ pending` | Payment record created | `paymentService.processPayment()` |
| `pending → processing` | Engine begins simulated processing | `paymentService.processPayment()` |
| `processing → success` | Engine returns `{ success: true }` | `paymentService.processPayment()` |
| `processing → failed` | Engine returns `{ success: false }` | `paymentService.processPayment()` |

> **Note**: `refunded` is defined in the schema but not actively triggered in the current implementation.

### Order States

```mermaid
stateDiagram-v2
    [*] --> created : Order created
    created --> processing : Payment initiated
    processing --> paid : Payment succeeds
    processing --> created : Payment fails (retries remaining)
    processing --> failed : Payment fails (max attempts reached)
    created --> cancelled : Manual cancellation
    [*] --> refunded : Post-payment refund
```

**Actual states in code**: `created`, `processing`, `paid`, `failed`, `refunded`, `cancelled`

---

## 9. Order Lifecycle

```
User creates order (amount, currency, description)
        │
        ▼
  Order: status=created, attempts=0, maxAttempts=3, expiresAt=now+30min
        │
        ├── User initiates payment ──► Order: status=processing, attempts=1
        │                                     │
        │                              ┌──────┴──────┐
        │                              ▼              ▼
        │                         SUCCESS          FAILURE
        │                              │              │
        │                              ▼              ▼
        │                    Order: status=paid   attempts < 3?
        │                    paidAt = now           │       │
        │                                         YES      NO
        │                                          │       │
        │                                          ▼       ▼
        │                                  Order: created  Order: failed
        │                                  (retryable)     (terminal)
        │
        ├── Order expires (30 min) ──► isExpired virtual = true
        │                              Payment rejected with 410 Gone
        │
        └── Order cancelled ──► status=cancelled (terminal)
```

### Why Order and Payment are separate entities

- **One-to-Many relationship**: A single order can have multiple payment attempts (up to `maxAttempts`)
- **Different lifecycles**: Order tracks the business intent; Payment tracks each processing attempt
- **Audit trail**: Every failed attempt is preserved as a separate Payment record
- **Retry semantics**: New Payment created per retry while Order tracks overall attempt count

---

## 10. Idempotency

### What is idempotency?

Idempotency means that making the same request multiple times produces the same result as making it once. In payment systems, this prevents a user from being charged twice if they click "Pay" twice or if a network retry occurs.

### Why is it required in payment systems?

- Network timeouts may cause the client to retry a request that already succeeded on the server
- Users may double-click the pay button
- Load balancers may retry failed connections
- Without idempotency, each retry could create a new charge

### How this project implements it

```mermaid
flowchart TD
    A["Client sends request with<br/>Idempotency-Key header"] --> B{"Key exists in DB?"}
    B -->|No| C["Create IdempotencyKey record<br/>status: processing"]
    C --> D["Process payment normally"]
    D --> E{"Payment succeeded?<br/>(HTTP 2xx)"}
    E -->|Yes| F["Save response to IdempotencyKey<br/>status: completed"]
    E -->|No| G["Delete IdempotencyKey record<br/>(allow retry with same key)"]
    B -->|Yes| H{"Record status?"}
    H -->|processing| I["Return 409 Conflict<br/>IDEMPOTENCY_CONFLICT"]
    H -->|completed| J["Return cached response<br/>idempotencyHit: true"]
```

**Implementation details** (from `middlewares/idempotency.js`):

1. **Key validation**: Must be 16–255 characters, sent as `Idempotency-Key` header
2. **Request hash**: SHA-256 of `{ body, userId }` — ties the key to a specific request+user
3. **Duplicate detection**: Looks up `IdempotencyKey` by key + userId
4. **Processing state**: If key exists with `status: 'processing'`, returns `409 Conflict` to prevent concurrent execution
5. **Cached response**: If key exists with `status: 'completed'`, returns the stored response
6. **Response capture**: Overrides `res.json()` to intercept the response and save it to the IdempotencyKey record
7. **Failure cleanup**: If response is non-2xx, the IdempotencyKey record is deleted (allowing a fresh attempt with the same key)
8. **TTL auto-cleanup**: IdempotencyKey records auto-expire after 24 hours via MongoDB TTL index

### Interview Q&A

> **Q: "Why did you implement idempotency?"**
>
> **A**: In a payment system, the cost of processing a duplicate charge is very high. If a user clicks "Pay" and the network times out, the frontend doesn't know if the payment succeeded or not. Without idempotency, retrying the request could create a second charge. My implementation stores each idempotency key in MongoDB with a `processing` or `completed` state. If a duplicate key arrives while the first request is still processing, it returns a 409 Conflict. If the first request already completed, it returns the cached response. This guarantees that no matter how many times the same request is sent, the payment is processed exactly once.

---

## 11. Retry Mechanism

### How retry works

1. Payment fails → Order status returns to `created` (if attempts < maxAttempts)
2. User (or Recovery Agent) sends `POST /api/payments/retry` with the same orderId
3. `paymentService.retryPayment()` validates:
   - Order exists and belongs to user
   - Order not already paid
   - `order.attempts < order.maxAttempts` (default: 3)
   - Order status is `created` or `failed`
4. Logs `payment.retry` event with attempt number
5. Calls `processPayment()` — same flow as initial payment
6. A new Payment record is created for each retry attempt

### What happens after max retries

- Order status permanently set to `failed`
- Any further payment/retry attempts are rejected with HTTP 422: `"Maximum retry attempts (3) reached for this order."`
- The user must create a new order

### Recovery Agent integration

- When `RECOVERY_AGENT_URL` is configured, the webhook service sends a `payment.failed` notification
- The Recovery Agent can call `POST /api/internal/retry-payment` with `x-internal-api-key`
- Internal retry reuses stored (already masked/hashed) card/UPI details from the last failed payment
- Raw card details are explicitly rejected from the internal API
- Idempotency is handled via `recoveryActionId` → `recovery_${recoveryActionId}` as idempotency key

### Interview Q&A

> **Q: "How does your payment retry mechanism work?"**
>
> **A**: Each order has a `maxAttempts` field (default 3). When a payment fails, the order stays in `created` status so it's still retryable. Each retry creates a brand new Payment record — I preserve every attempt for auditing. The retry endpoint validates that the order hasn't exceeded its attempt limit and isn't already paid. If all 3 attempts fail, the order is permanently marked as `failed`. There's also an internal retry API for the AI Recovery Agent that reuses already-stored card details so the agent never handles raw payment credentials.

---

## 12. Webhook System

### How it works

```mermaid
flowchart TD
    A["Payment succeeds or fails"] --> B["webhookService.sendWebhook()"]
    B --> C["Build event payload<br/>(paymentId, orderId, amount, status, etc.)"]
    C --> D["Generate HMAC-SHA256 signature<br/>using WEBHOOK_SECRET"]
    D --> E["Simulate async delivery<br/>(setTimeout 500-2500ms)"]
    E --> F["Log webhook.sent event"]
    C --> G{"Payment failed?"}
    G -->|Yes| H["notifyRecoveryAgent()"]
    H --> I["Generate signature with<br/>RECOVERY_WEBHOOK_SECRET"]
    I --> J["POST to RECOVERY_AGENT_URL<br/>/api/webhooks/payment-failed"]
    J --> K{"Response OK?"}
    K -->|Yes| L["Log recovery.notified"]
    K -->|No| M["Log recovery.notification_failed"]
    G -->|No| N["Done"]
```

### Webhook payload structure

```json
{
  "event": "payment.success",
  "paymentId": "PAY_ABC123",
  "orderId": "ORD_XYZ789",
  "amount": 999,
  "currency": "INR",
  "status": "success",
  "method": "card",
  "failureReason": null,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "gatewayResponse": { "transactionId": "TXN123456789012", "rrn": "..." },
  "userId": "507f1f77bcf86cd799439011",
  "attempts": 1,
  "maxAttempts": 3,
  "remainingAttempts": 2
}
```

### HMAC signature generation

```javascript
crypto.createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');
```

### Webhook receiver verification

The `webhookController.receiveWebhook` endpoint:
1. Extracts signature from `x-webhook-signature` header
2. Regenerates HMAC using the shared secret
3. Compares using `crypto.timingSafeEqual` (constant-time comparison to prevent timing attacks)
4. Rejects with 401 if signature is missing or invalid

### Key characteristics

- **Asynchronous delivery**: Uses `setTimeout` to avoid blocking the payment response
- **Fire-and-forget**: Payment state never depends on webhook delivery success
- **Recovery Agent notifications**: Separate secret (`RECOVERY_WEBHOOK_SECRET`), separate timeout (`RECOVERY_WEBHOOK_TIMEOUT_MS`), with AbortController for timeout handling
- **Failure logging**: Every notification failure is logged to TransactionLog for observability

---

## 13. Failure Handling

| Failure Scenario | How the System Handles It |
|---|---|
| **Payment fails** | Payment → `failed` with failure reason. If attempts < max, Order → `created` (retryable). Webhook dispatched. Recovery Agent notified. |
| **Payment retry fails** | New Payment → `failed`. Attempt counter incremented. Same logic as above. |
| **Max retries reached** | Order → `failed` (terminal). All further payment/retry attempts rejected with 422. |
| **Webhook delivery fails** | Logged as `webhook.sent` with metadata. Payment state NOT affected — webhook is fire-and-forget. |
| **Recovery Agent unavailable** | Logged as `recovery.notification_failed`. Payment continues normally — no retry of the notification. |
| **Recovery Agent timeout** | `AbortController` cancels after `RECOVERY_WEBHOOK_TIMEOUT_MS` (default 5000ms). Logged as error. |
| **Database operation fails** | Transaction logger wraps in try/catch — logging failure doesn't crash the payment flow. |
| **Duplicate request (same idempotency key)** | If `processing` → 409 Conflict. If `completed` → cached response returned. |
| **Invalid payment request** | express-validator returns 400 with specific validation error messages. |
| **Expired order** | Rejected with 410 Gone: "Order has expired. Please create a new order." |
| **Already paid order** | Rejected with 409 Conflict: "Order has already been paid." |
| **Cancelled order** | Rejected with 409 Conflict: "Order has been cancelled." |
| **Payment engine crashes** | Caught in try/catch, treated as `{ success: false, failureReason: 'Payment gateway unavailable' }` |
| **Invalid JWT** | 401 with specific message (expired, invalid, user not found, password changed) |
| **Rate limit exceeded** | 429 with message specific to the limiter (global/auth/payment) |

### Preventing inconsistent states

- Order status transitions are controlled by the service layer — only valid transitions allowed
- Payment and Order updates happen in sequence (not parallel) to avoid race conditions
- Idempotency prevents concurrent duplicate processing
- Transaction logs provide audit trail for debugging inconsistent states

---

## 14. Database Design

```mermaid
erDiagram
    User ||--o{ Order : "creates"
    User ||--o{ Payment : "initiates"
    User ||--o{ TransactionLog : "generates"
    User ||--o{ IdempotencyKey : "owns"
    Order ||--o{ Payment : "has attempts"
    Order ||--o{ TransactionLog : "logged"
    Payment ||--o{ TransactionLog : "logged"

    User {
        ObjectId _id PK
        String name
        String email UK
        String password "bcrypt hashed"
        String role "user | admin"
        Boolean isActive
        Date lastLogin
        Date passwordChangedAt
    }

    Order {
        ObjectId _id PK
        String orderId UK "ORD_..."
        ObjectId userId FK
        Number amount
        String currency "INR|USD|EUR|GBP|AED"
        String status "created|processing|paid|failed|refunded|cancelled"
        String description
        Map metadata
        Number attempts "default 0"
        Number maxAttempts "default 3"
        Date paidAt
        Date expiresAt "now + 30min"
    }

    Payment {
        ObjectId _id PK
        String paymentId UK "PAY_..."
        ObjectId orderId FK
        ObjectId userId FK
        Number amount
        String currency
        String method "card|upi|netbanking|wallet"
        String status "pending|processing|success|failed|refunded"
        Object cardDetails "masked/hashed"
        Object upiDetails
        Object gatewayResponse
        String failureReason
        String idempotencyKey
        Number retryCount
        Boolean webhookSent
        Date processedAt
    }

    IdempotencyKey {
        ObjectId _id PK
        String key UK
        ObjectId userId FK
        String requestHash "SHA-256"
        Object response "cached"
        String status "processing | completed"
        Date expiresAt "TTL 24h"
    }

    TransactionLog {
        ObjectId _id PK
        ObjectId paymentId FK
        ObjectId orderId FK
        ObjectId userId FK
        String event
        String status "info|success|warning|error"
        String message
        Object metadata
        String ipAddress
        String userAgent
        Number duration "ms"
    }
```

---

## 15. Database Schema

### User

| Field | Type | Purpose |
|---|---|---|
| `name` | String | Display name (max 100 chars) |
| `email` | String | Login identifier, unique, lowercase |
| `password` | String | bcrypt hashed (cost 12), `select: false` |
| `role` | String (`user`/`admin`) | RBAC role |
| `isActive` | Boolean | Account deactivation flag |
| `lastLogin` | Date | Updated on each login |
| `passwordChangedAt` | Date | Used to invalidate JWTs after password change |

### Order

| Field | Type | Purpose |
|---|---|---|
| `orderId` | String | Human-readable ID: `ORD_<UUID_PREFIX>` |
| `userId` | ObjectId (ref: User) | Owner of the order |
| `amount` | Number | Payment amount (min: 1) |
| `currency` | String | `INR`, `USD`, `EUR`, `GBP`, `AED` |
| `status` | String | `created`, `processing`, `paid`, `failed`, `refunded`, `cancelled` |
| `description` | String | Order description (max 255) |
| `metadata` | Map<String, String> | Flexible key-value metadata |
| `attempts` | Number | Count of payment attempts (default 0) |
| `maxAttempts` | Number | Maximum allowed attempts (default 3) |
| `paidAt` | Date | Timestamp when payment succeeded |
| `expiresAt` | Date | Auto-set to `now + 30 minutes` |

**Indexes**: `{ userId: 1, createdAt: -1 }`, `{ status: 1, createdAt: -1 }`

### Payment

| Field | Type | Purpose |
|---|---|---|
| `paymentId` | String | Human-readable ID: `PAY_<UUID_PREFIX>` |
| `orderId` | ObjectId (ref: Order) | Associated order |
| `userId` | ObjectId (ref: User) | User who initiated payment |
| `amount` | Number | Payment amount |
| `currency` | String | Currency code |
| `method` | String | `card`, `upi`, `netbanking`, `wallet` |
| `status` | String | `pending`, `processing`, `success`, `failed`, `refunded` |
| `cardDetails.maskedNumber` | String | `**** **** **** 4242` |
| `cardDetails.cardHash` | String | SHA-256 hash of full card number |
| `cardDetails.cardType` | String | `visa`, `mastercard`, `amex`, `discover` |
| `cardDetails.expiryMonth` | String | Card expiry month |
| `cardDetails.expiryYear` | String | Card expiry year |
| `upiDetails.vpa` | String | UPI Virtual Payment Address |
| `gatewayResponse` | Object | Full simulated gateway response |
| `failureReason` | String | Reason for payment failure |
| `idempotencyKey` | String | Associated idempotency key |
| `retryCount` | Number | Which retry attempt this is |
| `webhookSent` | Boolean | Whether webhook was dispatched |
| `processedAt` | Date | When processing completed |

**Indexes**: `{ paymentId: 1 }`, `{ orderId: 1, status: 1 }`, `{ userId: 1, createdAt: -1 }`

### IdempotencyKey

| Field | Type | Purpose |
|---|---|---|
| `key` | String | Client-provided idempotency key (unique) |
| `userId` | ObjectId (ref: User) | Scoped to the user |
| `requestHash` | String | SHA-256 hash of request body + userId |
| `response` | Object | Cached response for completed requests |
| `status` | String | `processing` or `completed` |
| `expiresAt` | Date | Auto-expires after 24h (TTL index) |

### TransactionLog

| Field | Type | Purpose |
|---|---|---|
| `paymentId` | ObjectId (ref: Payment) | Associated payment |
| `orderId` | ObjectId (ref: Order) | Associated order |
| `userId` | ObjectId (ref: User) | Associated user |
| `event` | String | Event type (see below) |
| `status` | String | `info`, `success`, `warning`, `error` |
| `message` | String | Human-readable description |
| `metadata` | Object | Additional event data |
| `ipAddress` | String | Client IP address |
| `userAgent` | String | Client user-agent string |
| `duration` | Number | Processing duration in milliseconds |

**Event types**: `payment.initiated`, `payment.processing`, `payment.success`, `payment.failed`, `payment.retry`, `payment.refunded`, `order.created`, `order.status_changed`, `webhook.sent`, `webhook.failed`, `idempotency.hit`, `recovery.notified`, `recovery.notification_failed`, `recovery.retry_requested`

---

## 16. API Architecture

### Authentication APIs

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login, receive JWT |
| POST | `/api/auth/logout` | JWT | Clear session cookie |
| GET | `/api/auth/me` | JWT | Get current user profile |

### Order APIs

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/orders` | JWT | Create a new order |
| GET | `/api/orders` | JWT | Get user's orders (paginated, filterable) |
| GET | `/api/orders/:orderId` | JWT | Get single order by orderId |
| GET | `/api/orders/admin/all` | JWT + Admin | Get all orders (admin) |

### Payment APIs

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/payments` | JWT + Idempotency-Key | Initiate payment |
| POST | `/api/payments/retry` | JWT + Idempotency-Key | Retry failed payment |
| GET | `/api/payments/my` | JWT | Get user's payments |
| GET | `/api/payments/:paymentId` | JWT | Get single payment |
| GET | `/api/payments/admin/all` | JWT + Admin | Get all payments (admin) |
| GET | `/api/payments/admin/dashboard` | JWT + Admin | Dashboard statistics |

### Transaction APIs

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/transactions/my` | JWT | Get user's transaction logs |
| GET | `/api/transactions` | JWT + Admin | Get all transaction logs (admin) |

### Webhook APIs

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/webhooks/payment` | HMAC Signature | Receive webhook events |

### Internal APIs (Recovery Agent)

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/internal/retry-payment` | `x-internal-api-key` | Trigger payment retry from Recovery Agent |

### Other

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | ❌ | Health check (status, uptime, environment) |
| GET | `/api/docs` | ❌ | Swagger UI API documentation |

---

## 17. API Request/Response Examples

### POST `/api/auth/signup`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass1"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "data": {
    "user": {
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "_id": "507f1f77bcf86cd799439011"
    }
  }
}
```

### POST `/api/orders`

**Request:**
```json
{
  "amount": 999,
  "currency": "INR",
  "description": "Premium Plan subscription"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "orderId": "ORD_A1B2C3D4E5F6G7H8",
      "userId": "507f1f77bcf86cd799439011",
      "amount": 999,
      "currency": "INR",
      "status": "created",
      "description": "Premium Plan subscription",
      "attempts": 0,
      "maxAttempts": 3,
      "expiresAt": "2024-01-15T11:00:00.000Z"
    }
  }
}
```

### POST `/api/payments` (Card Payment)

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Idempotency-Key: idem_1705312200_a1b2c3d4e5f6
```

**Request:**
```json
{
  "orderId": "ORD_A1B2C3D4E5F6G7H8",
  "method": "card",
  "cardDetails": {
    "number": "4111111111111111",
    "expiryMonth": "12",
    "expiryYear": "2028",
    "cvv": "123"
  }
}
```

**Response (200 — Success):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "payment": {
      "paymentId": "PAY_X9Y8Z7W6V5U4T3S2",
      "status": "success",
      "amount": 999,
      "currency": "INR",
      "method": "card",
      "failureReason": null,
      "processedAt": "2024-01-15T10:31:02.500Z"
    },
    "order": {
      "orderId": "ORD_A1B2C3D4E5F6G7H8",
      "status": "paid",
      "attempts": 1,
      "remainingAttempts": 2
    }
  }
}
```

**Response (402 — Failure):**
```json
{
  "success": false,
  "message": "Payment failed",
  "data": {
    "payment": {
      "paymentId": "PAY_X9Y8Z7W6V5U4T3S2",
      "status": "failed",
      "amount": 999,
      "currency": "INR",
      "method": "card",
      "failureReason": "Insufficient funds",
      "processedAt": null
    },
    "order": {
      "orderId": "ORD_A1B2C3D4E5F6G7H8",
      "status": "created",
      "attempts": 1,
      "remainingAttempts": 2
    }
  }
}
```

### POST `/api/payments` (UPI Payment)

**Request:**
```json
{
  "orderId": "ORD_A1B2C3D4E5F6G7H8",
  "method": "upi",
  "upiDetails": {
    "vpa": "user@paytm"
  }
}
```

### POST `/api/internal/retry-payment` (Recovery Agent)

**Headers:**
```
x-internal-api-key: <shared_secret>
```

**Request:**
```json
{
  "orderId": "ORD_A1B2C3D4E5F6G7H8",
  "recoveryActionId": "rec_abc123"
}
```

---

## 18. Authentication & Authorization

```mermaid
flowchart TD
    A["User sends credentials"] --> B["POST /api/auth/login"]
    B --> C["Find user by email"]
    C --> D{"User exists?<br/>Password matches?"}
    D -->|No| E["401 Invalid credentials"]
    D -->|Yes| F{"Account active?"}
    F -->|No| G["401 Account deactivated"]
    F -->|Yes| H["Generate JWT<br/>(id + role, 7-day expiry)"]
    H --> I["Set httpOnly cookie + return token"]
    I --> J["Subsequent requests: Bearer token"]
    J --> K["auth.protect middleware"]
    K --> L["Verify JWT signature"]
    L --> M["Load user from DB"]
    M --> N{"Password changed<br/>after JWT issued?"}
    N -->|Yes| O["401 Please re-login"]
    N -->|No| P["req.user = currentUser"]
    P --> Q{"Route requires<br/>admin role?"}
    Q -->|Yes| R["restrictTo('admin')"]
    R --> S{"user.role === 'admin'?"}
    S -->|No| T["403 Forbidden"]
    S -->|Yes| U["✅ Access granted"]
    Q -->|No| U
```

### Key security measures

- **Privilege escalation prevention**: `authController.signup` rejects `role: 'admin'` — new users are always `user`
- **Password change invalidation**: JWT is rejected if `passwordChangedAt > jwt.iat`
- **Account deactivation**: `isActive: false` blocks login
- **Secure cookies**: `httpOnly`, `secure` in production, `sameSite: 'strict'`

---

## 19. Security

| Security Measure | What It Protects | Implementation |
|---|---|---|
| **Password hashing** | User credentials at rest | bcrypt with salt rounds 12 (pre-save hook) |
| **JWT authentication** | API access control | jsonwebtoken, 7-day expiry, Bearer scheme |
| **Role-based access** | Admin routes | `restrictTo('admin')` middleware |
| **Rate limiting** | DDoS / brute force | 3 tiers: global (100/15min), auth (10/15min), payment (5/min) |
| **Helmet** | Common web vulnerabilities | HTTP security headers (CSP, X-Frame-Options, etc.) |
| **CORS** | Cross-origin attacks | Configurable allowed origins via `CORS_ORIGINS` |
| **Input validation** | Injection / malformed data | express-validator: email format, credit card number, UPI VPA pattern |
| **Card masking** | Card number exposure | Only last 4 digits stored: `**** **** **** 4242` |
| **Card hashing** | Card identification without storing | SHA-256 hash of full card number |
| **CVV never stored** | PCI-adjacent best practice | CVV is validated by express-validator but never persisted to database |
| **Webhook HMAC** | Webhook payload integrity | SHA-256 HMAC with shared secret, constant-time comparison |
| **Internal API key auth** | Service-to-service security | `crypto.timingSafeEqual` for constant-time key comparison |
| **Environment variables** | Secret management | All secrets in `.env`, never committed (`.gitignore`) |
| **Body size limit** | Payload attacks | `express.json({ limit: '10kb' })` |
| **Privilege escalation prevention** | Admin role hijacking | Signup forces `role: 'user'` regardless of request body |
| **Password select: false** | Accidental password leaks | Password excluded from query results by default |
| **Graceful error handling** | Information leakage | Production errors don't expose stack traces |

> **⚠️ This project does NOT claim PCI-DSS compliance.** It demonstrates security best practices for educational purposes. A production system would require additional measures like encryption at rest, TLS enforcement, PCI audit, and real HSM-based key management.

---

## 20. Payment Simulation

> **⚠️ IMPORTANT: This project simulates payment processing. No real money is charged. No real payment gateway is integrated.**

### How success/failure is determined

```javascript
const isSuccess = Math.random() < SUCCESS_RATE; // default: 0.85 (85%)
```

### Configurable parameters

| Parameter | Default | Purpose |
|---|---|---|
| `PAYMENT_SUCCESS_RATE` | `0.85` | Probability of payment success (0.0 to 1.0) |
| `PAYMENT_MIN_DELAY_MS` | `500` | Minimum simulated processing delay |
| `PAYMENT_MAX_DELAY_MS` | `3000` | Maximum simulated processing delay |

### What is simulated

| Aspect | Details |
|---|---|
| **Processing delay** | Random delay between min and max to mimic network latency |
| **Transaction IDs** | Generated: `TXN<12-digit-number>` for card, `UPI<timestamp><random>` for UPI |
| **RRN (Retrieval Reference Number)** | Random 12-digit number |
| **Approval codes** | Random 6-character alphanumeric |
| **Card network responses** | Maps Visa → `VI`, Mastercard → `MC`, Amex → `AX` |
| **Failure reasons (card)** | "Insufficient funds", "Card declined by issuing bank", "Transaction limit exceeded", "Invalid card credentials", "Network timeout", "Card expired", "Suspected fraud", "Do not honor" |
| **Failure reasons (UPI)** | "Payment declined by user", "UPI PIN incorrect", "Debit account limit exceeded", "VPA not found" |
| **Response codes** | `00` (approved), `05` (declined), `ZM` (UPI failure) |

### What would be required for a real payment gateway

| Current (Simulated) | Production (Real) |
|---|---|
| `Math.random()` determines outcome | Real API call to Razorpay/Stripe/Juspay |
| Card details masked locally | Card details sent to PCI-certified gateway |
| No real network call | HTTPS with TLS 1.2+ to gateway API |
| No money movement | Real bank settlement and reconciliation |
| `PAYMENT_SUCCESS_RATE` config | Real bank approval/decline responses |
| No merchant ID | Merchant account, API keys, gateway credentials |
| No compliance | PCI-DSS Level 1 compliance required |

---

## 21. Configuration

### Backend Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `NODE_ENV` | Environment mode (`development`/`production`) | Optional (default: development) |
| `PORT` | Server port | Optional (default: 5000) |
| `MONGO_URI` | MongoDB connection string | ✅ Required |
| `JWT_SECRET` | Secret key for signing JWTs | ✅ Required |
| `JWT_EXPIRES_IN` | JWT expiration period | Optional (default: 7d) |
| `ENCRYPTION_KEY` | 32-character encryption key | ✅ Required |
| `WEBHOOK_SECRET` | HMAC secret for merchant webhook signing | ✅ Required |
| `WEBHOOK_URL` | URL to deliver merchant webhooks | Optional |
| `CORS_ORIGINS` | Comma-separated allowed origins | Optional (default: localhost:3000,5173) |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | Optional (default: 900000) |
| `RATE_LIMIT_MAX` | Max requests per window | Optional (default: 100) |
| `PAYMENT_SUCCESS_RATE` | Simulated success probability (0.0–1.0) | Optional (default: 0.85) |
| `PAYMENT_MIN_DELAY_MS` | Min simulated delay | Optional (default: 500) |
| `PAYMENT_MAX_DELAY_MS` | Max simulated delay | Optional (default: 3000) |
| `RECOVERY_AGENT_URL` | AI Recovery Agent base URL | Optional |
| `RECOVERY_WEBHOOK_SECRET` | HMAC secret for Recovery Agent webhooks | Required if RECOVERY_AGENT_URL set |
| `RECOVERY_WEBHOOK_TIMEOUT_MS` | Timeout for Recovery Agent notification | Optional (default: 5000) |
| `INTERNAL_API_KEY` | Shared API key for internal service auth | Required if RECOVERY_AGENT_URL set |
| `API_PUBLIC_URL` | Public API URL for Swagger docs | Optional |

### Frontend Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `VITE_API_BASE_URL` | Production API base URL | Optional (default: /api) |
| `VITE_DEV_PORT` | Dev server port | Optional (default: 3000) |
| `VITE_DEV_API_PROXY_TARGET` | Dev proxy target | Optional (default: http://localhost:5000) |

---

## 22. Project Directory Structure

```
payment-processing-system/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx              # Sidebar + topbar + route outlet
│   │   ├── context/
│   │   │   └── AuthContext.jsx          # Auth state, login/signup/logout
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx            # Login form
│   │   │   ├── SignupPage.jsx           # Registration form
│   │   │   ├── DashboardPage.jsx        # User dashboard with stats
│   │   │   ├── OrdersPage.jsx           # Order list with filters, pagination
│   │   │   ├── CreateOrderPage.jsx      # Order creation form
│   │   │   ├── PaymentPage.jsx          # Checkout page with card preview
│   │   │   ├── TransactionsPage.jsx     # Transaction log viewer
│   │   │   └── AdminPage.jsx            # Admin dashboard with analytics
│   │   ├── services/
│   │   │   └── api.js                   # Axios instance + API wrappers
│   │   ├── App.jsx                      # Routes, guards, Toaster
│   │   ├── main.jsx                     # React entry point
│   │   └── styles.css                   # Complete application styles
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── .env.example
│   └── .env
├── backend/
│   ├── config/
│   │   ├── database.js                  # MongoDB connection with reconnection
│   │   ├── logger.js                    # Winston logger setup
│   │   ├── payment.js                   # Payment simulation config parser
│   │   └── swagger.js                   # OpenAPI 3.0 spec generator
│   ├── controllers/
│   │   ├── authController.js            # Signup, login, getMe, logout
│   │   ├── orderController.js           # CRUD + admin endpoints
│   │   ├── paymentController.js         # Initiate, retry, dashboard stats
│   │   ├── transactionController.js     # Log retrieval endpoints
│   │   ├── webhookController.js         # Webhook receiver + verification
│   │   └── internalController.js        # Recovery Agent retry endpoint
│   ├── middlewares/
│   │   ├── auth.js                      # JWT protect + restrictTo
│   │   ├── idempotency.js               # Idempotency-Key processing
│   │   ├── internalAuth.js              # API key auth (timingSafeEqual)
│   │   ├── validators.js                # express-validator rules
│   │   ├── rateLimiter.js               # 3-tier rate limiting
│   │   └── errorHandler.js              # Global error handler (dev/prod)
│   ├── models/
│   │   ├── User.js                      # User schema + password hashing
│   │   ├── Order.js                     # Order schema + expiry virtual
│   │   ├── Payment.js                   # Payment schema + card details
│   │   ├── IdempotencyKey.js            # Idempotency with TTL index
│   │   └── TransactionLog.js            # Audit trail schema
│   ├── routes/
│   │   ├── authRoutes.js                # /api/auth/*
│   │   ├── orderRoutes.js               # /api/orders/*
│   │   ├── paymentRoutes.js             # /api/payments/*
│   │   ├── transactionRoutes.js         # /api/transactions/*
│   │   ├── webhookRoutes.js             # /api/webhooks/*
│   │   └── internalRoutes.js            # /api/internal/*
│   ├── services/
│   │   ├── paymentService.js            # Core payment business logic
│   │   ├── paymentEngine.js             # Simulated gateway processing
│   │   ├── webhookService.js            # Webhook + Recovery Agent
│   │   └── transactionLogger.js         # Structured event logging
│   ├── utils/
│   │   ├── AppError.js                  # Custom error class
│   │   ├── crypto.js                    # Card masking, hashing, HMAC
│   │   └── jwt.js                       # Token signing + sending
│   ├── logs/                            # Winston log output (gitignored)
│   ├── server.js                        # Express app entry point
│   ├── seed.js                          # Database seed script
│   ├── package.json
│   ├── .env.example
│   └── .env
├── render.yaml                          # Render deployment configuration
├── .gitignore
├── package.json                         # Root scripts (install:all, dev, seed)
└── README.md
```

---

## 23. Important Design Decisions

| Decision | Why |
|---|---|
| **Separate Order and Payment models** | An order can have multiple payment attempts. Each Payment is an immutable record of one attempt. Order tracks overall state; Payment tracks individual processing. |
| **Service layer** | Controllers handle HTTP concerns (request parsing, response formatting). Services contain business logic (validation, state transitions, engine calls). This separation makes the codebase testable and maintainable. |
| **Idempotency via middleware** | Applied only to payment routes (where duplicate processing is dangerous). The middleware pattern keeps this concern separate from business logic. |
| **Retry as a separate endpoint** | `POST /retry` explicitly signals intent, allowing different validation (e.g., checking that a previous attempt failed). |
| **MongoDB** | Document model maps naturally to payment objects with nested card details and gateway responses. Flexible schema allows different payment methods to have different sub-documents. |
| **JWT (stateless auth)** | No server-side session store needed. Token carries user ID and role. Works well with horizontal scaling. |
| **HMAC webhook signing** | Industry standard for webhook verification. SHA-256 HMAC with shared secret proves payload authenticity without exposing the secret. |
| **Fire-and-forget webhooks** | Payment state must not depend on webhook delivery. Webhooks are informational — if delivery fails, the payment is still recorded correctly. |
| **Transaction logs as separate collection** | Provides a complete audit trail independent of payment/order status changes. Every event is immutable and timestamped. |
| **Simulated payment engine** | Allows full end-to-end testing without real money. Configurable success rate enables stress-testing failure paths. |
| **Internal API with separate auth** | Recovery Agent uses API key auth (not JWT) because it's a service, not a user. Constant-time comparison prevents timing attacks. |

---

## 24. Trade-Offs

| Decision | Reason | Benefit | Limitation |
|---|---|---|---|
| **MongoDB over SQL** | Flexible schema for varied payment method data (card vs UPI vs wallet) | No rigid migrations, nested objects stored naturally | No built-in transactions for multi-document atomicity (Mongoose doesn't use transactions here) |
| **Simulated gateway over real** | Educational focus, no merchant account needed | Anyone can run the project, test failure paths | Cannot demonstrate real bank settlement or reconciliation |
| **Async webhook delivery via setTimeout** | Simple, no external dependencies | No message queue needed | If the server crashes, pending webhook deliveries are lost |
| **In-process idempotency (MongoDB)** | Single-server simplicity | Works without Redis or distributed cache | Race condition possible if two identical requests arrive simultaneously before the first creates the record |
| **File-based logging (Winston)** | Zero infrastructure overhead | Log rotation built-in (5MB, 5 files) | Not queryable like centralized logging (ELK, Datadog) |
| **Sequential Order/Payment updates** | Simplicity, avoids transaction complexity | Easier to reason about state | Not atomic — if server crashes between Payment update and Order update, states could be inconsistent |
| **No background job queue** | Fewer moving parts | Simpler deployment, no Redis/Bull dependency | Webhook delivery tied to request lifecycle, no guaranteed retry |

---

## 25. Scalability

### Current Implementation

- Single Express server process
- In-memory rate limiting (per-process)
- MongoDB as sole data store (including idempotency)
- File-based logging
- Webhook delivery via `setTimeout` in the main process

### Future Scaling Approach

| Challenge | Solution |
|---|---|
| **Handle 100K payments/day** | Horizontal scaling: multiple Express instances behind a load balancer |
| **Distributed rate limiting** | Redis-backed rate limiter (e.g., `rate-limit-redis`) shared across instances |
| **Distributed idempotency** | Redis with `SET NX EX` (set-if-not-exists with TTL) for atomic, cross-instance dedup |
| **Reliable webhook delivery** | Message queue (RabbitMQ / Kafka / Bull) with retry logic and dead-letter queue |
| **Background processing** | Worker processes for webhook delivery, Recovery Agent notifications |
| **Database performance** | MongoDB sharding on `userId`, read replicas for dashboard queries |
| **Centralized logging** | ELK stack (Elasticsearch, Logstash, Kibana) or Datadog for searchable, aggregated logs |
| **Caching** | Redis for frequently accessed data (order status, user sessions) |
| **Monitoring** | Prometheus + Grafana for payment latency, success rate, error rate metrics |
| **Real payment gateway** | Replace `paymentEngine.js` with Razorpay/Stripe SDK — service layer stays the same |

> **⚠️ None of these scaling solutions are currently implemented.** They are documented as future architectural improvements.

---

## 26. Reliability

### Current Reliability Measures

| Mechanism | How It Helps |
|---|---|
| **Idempotency** | Prevents duplicate charges from network retries or double-clicks |
| **Retry mechanism** | Failed payments can be retried up to `maxAttempts` times |
| **Transaction logging** | Every event is recorded — provides audit trail for debugging |
| **Graceful shutdown** | SIGTERM handler closes server connections cleanly |
| **Error boundaries** | Global error handler catches all unhandled errors, returns safe responses |
| **Database reconnection** | Mongoose auto-reconnects on disconnect |
| **Process crash handlers** | `unhandledRejection` and `uncaughtException` logged before exit |

### Production Reliability Improvements

- **Distributed locks**: Use Redis for idempotency to handle concurrent requests across multiple servers
- **Database transactions**: Use MongoDB transactions for atomic Order + Payment updates
- **Circuit breaker**: For Recovery Agent communication — stop sending after N failures
- **Webhook retry queue**: Persistent queue with exponential backoff for failed webhook deliveries
- **Health check endpoint**: Already implemented at `/health` — can be used by load balancers
- **Saga pattern**: For complex multi-step payment flows requiring rollback

---

## 27. Observability / Logging

### Current Implementation

**Winston Logger** — structured JSON logging with two file transports:

| Transport | File | Level | Rotation |
|---|---|---|---|
| Error log | `backend/logs/error.log` | error | 5MB, max 5 files |
| Combined log | `backend/logs/combined.log` | all levels | 5MB, max 5 files |
| Console | stdout | all (dev only) | Colorized dev format |

**Morgan** — HTTP request logging:
- Development: `dev` format (concise colored output)
- Production: `combined` format piped to Winston

### What Events Are Logged

| Event | Where Logged | Severity |
|---|---|---|
| User registration | Winston | info |
| User login | Winston | info |
| Payment initiated | TransactionLog + Winston | info |
| Payment success | TransactionLog + Winston | success |
| Payment failed | TransactionLog + Winston | error |
| Payment retry | TransactionLog | warning |
| Order created | TransactionLog | info |
| Webhook dispatched | TransactionLog | info |
| Webhook delivery failed | TransactionLog | warning/error |
| Recovery Agent notified | TransactionLog | success |
| Recovery Agent notification failed | TransactionLog | warning/error |
| Idempotency hit | TransactionLog | info |
| Rate limit exceeded | express-rate-limit | (client gets 429) |
| Unhandled errors | Winston + error handler | error |

### Admin Visibility

- **Admin Dashboard** (`/admin`) shows: total transactions, success/failed counts, total revenue, method breakdown, recent payments table, recent logs table
- Transaction logs are queryable by event type, status, userId, paymentId via the API

### What Is NOT Implemented

- ❌ Metrics collection (Prometheus/StatsD)
- ❌ Distributed tracing (Jaeger/OpenTelemetry)
- ❌ Alerting (PagerDuty/Slack notifications)
- ❌ Log aggregation service (ELK/Datadog)
- ❌ Real-time dashboards (Grafana)

---

## 28. Testing

### Current State

The repository has `"test": "jest --coverage"` configured in `backend/package.json`, but **no test files are present in the repository**. There are no automated unit tests, integration tests, or end-to-end tests.

### Manual Testing

The project can be tested manually through:
- The React frontend (full user flows)
- Swagger UI at `/api/docs` (API-level testing)
- Seed script (`npm run seed`) creates test users and sample orders

### Recommended Testing Strategy

| Test Type | What to Test | Tool |
|---|---|---|
| **Unit tests** | `paymentEngine` (success/failure rates), `crypto` (masking, hashing, HMAC), `validators`, `AppError` | Jest |
| **Integration tests** | Payment flow (create order → pay → verify status), retry flow, idempotency (duplicate request), auth flow | Jest + Supertest |
| **Middleware tests** | Auth middleware (valid/invalid/expired JWT), idempotency (processing/completed/new), rate limiter | Jest + Supertest |
| **E2E tests** | Full user journey: signup → login → create order → pay → view transaction → retry | Playwright or Cypress |
| **Load tests** | Payment endpoint under concurrent load, idempotency under race conditions | k6 or Artillery |

---

## 29. Deployment

### Current Setup (Render)

The project includes a `render.yaml` configuration file for deployment on [Render](https://render.com):

| Component | Type | Details |
|---|---|---|
| **Backend** | Web Service (Node) | `npm install` → `npm start` (node server.js) |
| **Frontend** | Static Site | `npm install && npm run build` → serves `dist/` |

### Environment Variables on Render

All secrets (`MONGO_URI`, `JWT_SECRET`, `ENCRYPTION_KEY`, `WEBHOOK_SECRET`, etc.) are configured via Render's environment variable management (`sync: false` = manual entry required).

### Local Development

```bash
# Install all dependencies
npm run install:all

# Seed the database
npm run seed

# Start backend (port 5000)
npm run dev:backend

# Start frontend (port 3000, proxies /api to backend)
npm run dev:frontend
```

### Seed Data

| Account | Email | Password | Role |
|---|---|---|---|
| Admin | admin@paygateway.io | Admin@1234 | admin |
| User | user@paygateway.io | User@1234 | user |
| Sample Orders | — | — | 3 orders (created, paid, failed) |

---

## 30. Complete Data Flow Diagram

```mermaid
flowchart LR
    subgraph "Client"
        Browser["React SPA"]
    end

    subgraph "API Layer"
        direction TB
        Helmet --> CORS --> RateLimit --> BodyParser
    end

    subgraph "Auth"
        JWT["JWT Verify"]
        RBAC["Role Check"]
    end

    subgraph "Validation"
        Validator["express-validator"]
        Idemp["Idempotency Check"]
    end

    subgraph "Business Logic"
        PayCtrl["Payment Controller"]
        PaySvc["Payment Service"]
        PayEng["Payment Engine<br/>(Simulator)"]
    end

    subgraph "Data Store"
        Mongo[("MongoDB")]
    end

    subgraph "Events"
        WebhookSvc["Webhook Service"]
        TxLogger["Transaction Logger"]
    end

    subgraph "External"
        RecoveryAgent["AI Recovery Agent"]
    end

    Browser -->|"Axios + JWT"| Helmet
    BodyParser --> JWT --> Validator --> Idemp --> PayCtrl
    JWT --> RBAC
    PayCtrl --> PaySvc
    PaySvc --> PayEng
    PaySvc <-->|"Read/Write"| Mongo
    PaySvc --> TxLogger -->|"Write"| Mongo
    PaySvc --> WebhookSvc
    WebhookSvc -->|"HMAC Signed"| Browser
    WebhookSvc -->|"payment.failed"| RecoveryAgent
    RecoveryAgent -->|"Internal API Key"| PaySvc
```

---

## 31. Complete System Flow

```mermaid
flowchart TB
    Start(["User opens app"]) --> Login["Login / Signup"]
    Login -->|JWT Token| Dash["Dashboard<br/>Stats + Quick Actions"]
    Dash --> CreateOrder["Create Order<br/>(amount, currency)"]
    CreateOrder --> OrderList["Orders Page<br/>(filter, search, paginate)"]
    OrderList -->|"Click Pay"| Checkout["Payment Page<br/>(select method, enter details)"]
    Checkout -->|"POST /api/payments"| Pipeline["Middleware Pipeline<br/>Auth → Validate → Idempotency"]
    Pipeline --> Service["Payment Service<br/>(validate order, create payment)"]
    Service --> Engine["Payment Engine<br/>(simulate 500-3000ms)"]
    Engine -->|"85% chance"| Success["✅ Success"]
    Engine -->|"15% chance"| Failure["❌ Failure"]
    Success --> UpdateDB1["Payment → success<br/>Order → paid"]
    Failure --> UpdateDB2["Payment → failed<br/>Order → created/failed"]
    UpdateDB1 --> Webhook["Webhook Service<br/>(HMAC signed)"]
    UpdateDB2 --> Webhook
    Webhook --> TxLog["Transaction Logger"]
    UpdateDB2 -->|"If RECOVERY_AGENT_URL set"| Recovery["Notify Recovery Agent"]
    Recovery -->|"POST /api/internal/retry-payment"| Service
    UpdateDB1 --> ResultUI["Result Page<br/>(success card)"]
    UpdateDB2 --> RetryUI["Result Page<br/>(failure + retry button)"]
    RetryUI -->|"Click Retry"| Checkout
    ResultUI --> OrderList
    Dash --> TxPage["Transactions Page<br/>(event timeline)"]
    Dash --> AdminDash["Admin Dashboard<br/>(revenue, method mix, logs)"]
```

---

## 32. Interview Questions & Answers

### Basic Project Questions

**Q1: Explain your project.**
> I built a full-stack payment processing system that simulates how real payment gateways like Razorpay or Juspay work. It has a React frontend for users to create orders and make payments, a Node.js/Express backend with a complete payment lifecycle including idempotency, retry mechanisms, webhook notifications, and an admin dashboard. The payment gateway is simulated with configurable success rates, but all the architectural patterns are production-grade.

**Q2: What problem does it solve?**
> It demonstrates how to build a reliable payment system that handles duplicate requests safely through idempotency, recovers from failures through retry mechanisms, notifies external systems through webhooks, and maintains a complete audit trail through transaction logging.

**Q3: Why did you build it?**
> To deeply understand payment system architecture — including the engineering challenges around reliability, consistency, and security that don't exist in typical CRUD applications.

**Q4: What technologies did you use?**
> React 18 with Vite for the frontend, Node.js with Express for the backend, MongoDB with Mongoose for the database, JWT for authentication, bcrypt for password hashing, HMAC-SHA256 for webhook signatures, and Winston for logging.

---

### Architecture Questions

**Q5: Explain the architecture.**
> It follows a layered architecture. The React frontend communicates with the Express API through Axios. Requests pass through a middleware pipeline — rate limiting, JWT authentication, input validation, and idempotency checking — before reaching controllers. Controllers handle HTTP concerns and delegate to services for business logic. The payment service orchestrates order validation, payment creation, engine processing, status updates, and webhook dispatch. Data is stored in MongoDB with 5 collections: Users, Orders, Payments, IdempotencyKeys, and TransactionLogs.

**Q6: Why Node.js?**
> Node.js is well-suited for I/O-heavy applications like payment processing. Its non-blocking event loop handles concurrent payment requests efficiently. The JavaScript ecosystem also provides excellent libraries for JWT, HMAC, and database operations.

**Q7: Why Express?**
> Express provides a clean middleware pipeline architecture which maps perfectly to payment processing — each concern (auth, validation, idempotency, rate limiting) is a separate middleware that can be composed declaratively per route.

**Q8: Why MongoDB?**
> Payment data is naturally document-shaped — a payment has nested card details, gateway responses, and different sub-objects for different payment methods. MongoDB's flexible schema handles this without complex joins or migrations.

**Q9: Why separate controllers and services?**
> Controllers handle HTTP-specific logic (parsing request params, setting status codes, formatting responses). Services contain pure business logic (validating order state, processing payments, triggering webhooks). This separation makes the business logic testable without HTTP concerns and allows the same service to be called from different entry points (user-facing API and internal Recovery Agent API both call `paymentService.retryPayment()`).

**Q10: Explain the request lifecycle.**
> A payment request goes through: Rate Limiter → Helmet → CORS → Body Parser → JWT Auth → Input Validation → Idempotency Check → Controller → Service → Payment Engine → Database Updates → Webhook Dispatch → Response. Each layer has a specific responsibility and can reject the request independently.

---

### Payment Questions

**Q11: Explain the payment flow.**
> User creates an order with an amount and currency. Then they initiate a payment by selecting a method and entering details. The request is validated, deduplicated via idempotency, and sent to the payment engine. The engine simulates processing with a configurable delay and success rate. On success, the payment is marked `success` and the order is marked `paid`. On failure, the payment is marked `failed` and the order returns to `created` if retries remain, or `failed` if max attempts are reached. A webhook is dispatched in both cases.

**Q12: How do you handle payment failure?**
> The payment record is marked `failed` with a specific failure reason (like "Insufficient funds" or "Card declined"). The order's attempt counter is incremented. If attempts < maxAttempts (3), the order status goes back to `created` so the user can retry. If all attempts are exhausted, the order is permanently `failed`. A webhook is sent, and if the Recovery Agent is configured, it's notified to potentially trigger an automated retry.

**Q13: How does retry work?**
> A dedicated `POST /api/payments/retry` endpoint validates that the order has remaining attempts and isn't already paid. It creates a brand new Payment record (preserving the history of all attempts) and goes through the same processing pipeline. Each retry requires a new idempotency key. The Recovery Agent has its own internal retry endpoint that reuses stored card details without requiring raw payment credentials.

**Q14: How do you prevent duplicate payments?**
> Through idempotency. Every payment request must include an `Idempotency-Key` header. The middleware checks if this key has been seen before. If it's currently processing, it returns 409 Conflict. If it's completed, it returns the cached response. This ensures that even if the client sends the same request 10 times, the payment is processed exactly once. *(CURRENT PROJECT)*

**Q15: What happens if the user clicks Pay twice?**
> The frontend generates a unique idempotency key per payment attempt. If the same key is sent twice, the backend's idempotency middleware catches it — either returning a conflict (if the first request is still processing) or the cached response (if it already completed). The user sees the same result both times, and they're only charged once. *(CURRENT PROJECT)*

**Q16: What happens if the network fails after payment succeeds?**
> The payment is already recorded as `success` in the database and the order is marked `paid`. When the user refreshes, the order shows as paid. If they retry with the same idempotency key, they get the cached success response. If they use a new key, the system rejects it because the order is already paid (409 Conflict). The webhook also serves as a backup notification. *(CURRENT PROJECT)*

---

### Idempotency Questions

**Q17: What is an idempotency key?**
> A unique string (16–255 chars) sent by the client in the `Idempotency-Key` header. It's typically a UUID or timestamp-based string. The server uses it to detect and deduplicate requests.

**Q18: How do you handle a request that arrives while the first one is still processing?**
> The idempotency record has a `status` field. When the first request starts processing, the record is created with `status: 'processing'`. If a second request arrives with the same key, the middleware finds the record in `processing` state and returns HTTP 409 with code `IDEMPOTENCY_CONFLICT`. The client knows to wait and retry later.

**Q19: What happens to the idempotency record if the payment fails?**
> If the response status code is not in the 2xx range (meaning the payment failed), the idempotency record is deleted. This allows the client to retry with the same key if desired. Only successful responses are cached.

**Q20: How long do idempotency keys last?**
> 24 hours. There's a MongoDB TTL index on the `expiresAt` field that automatically deletes expired records. This prevents the collection from growing indefinitely while still providing enough time for retry scenarios.

---

### Backend Questions

**Q21: How do you handle errors?**
> There's a custom `AppError` class for operational errors (bad request, not found, etc.) with specific status codes. A global error handler middleware catches all errors — in development it sends full stack traces; in production it only sends the message for operational errors and a generic "Something went wrong" for unexpected errors. Specific MongoDB errors (CastError, duplicate key, validation) are mapped to user-friendly messages.

**Q22: What HTTP status codes do you use?**
> 200 (success), 201 (created), 400 (validation error), 401 (authentication), 402 (payment failed), 403 (authorization), 404 (not found), 409 (conflict/idempotency/already paid), 410 (order expired), 422 (max retries reached), 429 (rate limited), 500 (server error).

**Q23: How does rate limiting work?**
> Three tiers: global (100 requests per 15 minutes for all API routes), auth (10 per 15 minutes for login/signup to prevent brute force), and payment (5 per minute to prevent payment abuse). The key generator uses IP + userId, so rate limits are per-user-per-IP.

---

### Database Questions

**Q24: Explain your schema design.**
> Five collections: Users (auth + profile), Orders (business intent with attempt tracking), Payments (individual processing attempts with card/gateway details), IdempotencyKeys (deduplication with TTL), TransactionLogs (audit trail). The key relationship is one-to-many between Order and Payment — each retry creates a new Payment while the Order tracks overall state.

**Q25: What indexes do you use?**
> Compound indexes optimized for common queries: `{ userId, createdAt }` for user-specific listing, `{ status, createdAt }` for status filtering, `{ orderId, status }` for payment lookups per order, `{ event, createdAt }` for log filtering. The IdempotencyKey has a unique index on `key` and a TTL index on `expiresAt`.

**Q26: Why not use SQL?**
> Payment data is document-shaped — a card payment has different nested fields than a UPI payment. MongoDB stores these naturally as sub-documents without null columns or separate join tables. The flexible schema also made it easier to iterate on the payment model without migrations.

---

### Security Questions

**Q27: How do you store passwords?**
> bcrypt with a cost factor of 12. Passwords are hashed in a Mongoose pre-save hook, so they're never stored in plain text. The password field has `select: false`, so it's excluded from queries by default.

**Q28: How do you handle card details?**
> The full card number is never stored. I store a masked version (`**** **** **** 4242`) for display and a SHA-256 hash for identification (detecting if the same card was used before). Card type is auto-detected from the number prefix. CVV is validated but never persisted — not even as a hash.

**Q29: How are webhooks secured?**
> Each webhook payload is signed with HMAC-SHA256 using a shared secret (`WEBHOOK_SECRET`). The receiver regenerates the signature and compares using `crypto.timingSafeEqual` — a constant-time comparison that prevents timing attacks from revealing the secret.

**Q30: How do you prevent the Recovery Agent from accessing raw card data?**
> The internal retry API explicitly rejects `cardDetails` and `upiDetails` from the request body. Instead, it looks up the last failed Payment record and reuses the already-masked/hashed card details. The Recovery Agent never needs or receives raw payment credentials.

---

### System Design Questions

**Q31: How would you scale this to handle 100K payments/day?**
> **PRODUCTION IMPROVEMENT**: First, I'd run multiple Express instances behind a load balancer. Idempotency would move from MongoDB to Redis (`SET NX EX`) for atomic, cross-instance dedup. Webhook delivery would move to a message queue (RabbitMQ or Kafka) with retry logic. I'd add MongoDB read replicas for the admin dashboard queries and shard by userId for write distribution.

**Q32: How would you guarantee idempotency across multiple servers?**
> **PRODUCTION IMPROVEMENT**: Replace MongoDB-based idempotency with Redis. Use `SET key value NX EX 86400` (set-if-not-exists with 24h expiry). This is atomic and works across all server instances. The in-memory check is faster than MongoDB and Redis handles the concurrency correctly.

**Q33: How would you make webhooks reliable?**
> **PRODUCTION IMPROVEMENT**: Use a persistent message queue (e.g., Bull with Redis, or SQS). Each webhook becomes a job with configurable retries and exponential backoff. Failed deliveries go to a dead-letter queue for manual inspection. Add a webhook status endpoint so receivers can check delivery status.

**Q34: How would you add a real payment gateway?**
> The service layer is already designed for this. I'd replace `paymentEngine.js` with a real gateway SDK (e.g., `razorpay` npm package). The `processCardPayment` and `processUPIPayment` functions would make real API calls instead of using `Math.random()`. The rest of the pipeline (idempotency, logging, webhooks, retry) stays the same. I'd also need PCI-DSS compliance, a merchant account, and API keys.

**Q35: How would you monitor the system?**
> **PRODUCTION IMPROVEMENT**: Add Prometheus metrics for payment latency (p50/p95/p99), success rate, error rate, and queue depth. Grafana dashboards for real-time monitoring. PagerDuty/Slack alerts for success rate drops below threshold. Distributed tracing with OpenTelemetry to trace a payment request across all services.

---

## 33. Project-Specific Trick Questions

**Q: Is this a real payment gateway?**
> No. The payment gateway is simulated. `paymentEngine.js` uses `Math.random()` to determine success/failure with a configurable success rate. No real money is charged, no real bank communication happens.

**Q: Are real transactions processed?**
> No. Every "transaction" is a simulated result generated within the application. The transaction IDs, RRNs, and approval codes are generated locally using random strings.

**Q: Why are payment results simulated?**
> To focus on the architecture and engineering patterns (idempotency, retry, webhooks, audit logging) without needing a merchant account, real bank integration, or PCI-DSS compliance. Anyone can clone and run the project immediately.

**Q: Why is payment success random/configurable?**
> The `PAYMENT_SUCCESS_RATE` (default 85%) allows testing both success and failure paths. Setting it to `0` tests pure failure/retry flows. Setting it to `1` tests pure success flows. This is useful for demonstrations and stress testing.

**Q: Where are payment credentials stored?**
> Card numbers are masked (`**** **** **** 4242`) and hashed (SHA-256). The original number is not stored. CVV is never stored. UPI VPAs are stored in plain text (they're not sensitive like card numbers). All secrets (JWT_SECRET, WEBHOOK_SECRET, etc.) are in environment variables.

**Q: Are card details stored?**
> Only masked and hashed versions. The full card number and CVV are never persisted. This follows the PCI-DSS principle of minimizing stored cardholder data.

**Q: What happens if the webhook fails?**
> Nothing changes for the payment. Webhook delivery is fire-and-forget — the payment is already recorded correctly in the database. The failure is logged to TransactionLog for observability, but no retry of the webhook delivery happens in the current implementation.

**Q: What happens if the Recovery Service is down?**
> The payment flow continues normally. Recovery Agent notification is wrapped in try/catch with a timeout (default 5 seconds). If it fails or times out, a `recovery.notification_failed` event is logged, but the payment state is not affected.

**Q: What happens if two identical requests arrive simultaneously?**
> In the current single-server setup, there's a small race condition window where both requests might not find an existing IdempotencyKey record. MongoDB's unique index on the `key` field would cause one to fail with a duplicate key error, which would be caught by the error handler. *(CURRENT LIMITATION — Redis would solve this in production.)*

**Q: What happens when the retry limit is reached?**
> The order is permanently marked as `failed`. Any subsequent payment or retry attempt returns HTTP 422: "Maximum retry attempts (3) reached for this order." The user must create a new order.

**Q: Why is webhook delivery asynchronous?**
> To avoid blocking the payment response. The user shouldn't wait for webhook delivery to see their payment result. `setTimeout` is used to simulate async delivery without blocking the main request-response cycle.

**Q: Why MongoDB?**
> Payment data is naturally document-shaped with nested objects (cardDetails, gatewayResponse). Different payment methods have different sub-documents. MongoDB handles this without complex joins or nullable columns.

---

## 34. Explain This Project in 60 Seconds

> "I built a full-stack payment processing system using React, Node.js, Express, and MongoDB. It simulates how payment gateways like Razorpay work. Users can create orders, pay using card or UPI, and retry failed payments. The backend has idempotency so duplicate requests don't cause double charges — every payment request needs a unique key, and if the same key is sent twice, it returns the cached response. There's a retry mechanism with a max of 3 attempts per order. When a payment succeeds or fails, a webhook is generated with an HMAC signature for verification. Security includes JWT authentication, bcrypt password hashing, card number masking, rate limiting, and role-based access control. There's also an admin dashboard with revenue analytics. The payment gateway itself is simulated with a configurable success rate, so no real money is involved — but all the architectural patterns are production-grade."

---

## 35. Explain This Project in 2 Minutes

> "I built a full-stack payment processing system to demonstrate production-grade payment architecture. Let me walk through it.
>
> **Architecture**: React frontend communicates with a Node.js/Express backend, which stores data in MongoDB. The backend follows a layered architecture — controllers handle HTTP, services handle business logic, and a separate payment engine handles the simulation.
>
> **Payment flow**: A user creates an order with an amount. Then they initiate a payment by selecting a method — card, UPI, netbanking, or wallet — and entering details. The backend validates the input, checks the idempotency key for duplicates, creates a Payment record, and sends it to the payment engine. The engine simulates processing with a realistic delay and returns success or failure.
>
> **Idempotency**: This is a key feature. Every payment request requires a unique `Idempotency-Key` header. The middleware stores this key with a `processing` or `completed` status. If the same key arrives again while processing, it returns 409 Conflict. If already completed, it returns the cached response. This guarantees exactly-once processing.
>
> **Retry mechanism**: Each order allows 3 payment attempts. When a payment fails, the order goes back to `created` status so the user can retry. Each retry creates a new Payment record for audit purposes.
>
> **Webhooks**: After every payment, a webhook payload is generated and signed with HMAC-SHA256. The receiver can verify the signature to ensure the payload wasn't tampered with. If a payment fails and a Recovery Agent URL is configured, it also notifies an AI recovery service that can trigger automated retries through an internal API.
>
> **Security**: Passwords are hashed with bcrypt, APIs are protected with JWT, card numbers are masked (only last 4 digits stored), CVV is never stored, there are 3 tiers of rate limiting, and all routes have input validation.
>
> The payment gateway is simulated — no real money — but the architecture, reliability patterns, and security measures are all production-grade."

---

## 36. Deep Dive — Follow-Up Answers

### Idempotency Deep Dive

> "The idempotency middleware intercepts requests before they reach the controller. It requires a key of 16–255 characters. First, it hashes the request body + userId with SHA-256 to create a request fingerprint. Then it checks MongoDB for an existing record with that key. If found in `processing` state — meaning another request is currently being handled — it returns 409 to prevent concurrent processing. If found in `completed` state, it returns the cached response without re-processing. If not found, it creates a new record with `processing` status and lets the request proceed. Here's the clever part: it overrides `res.json()` to intercept the response. If the response is 2xx, it saves it to the idempotency record and marks it `completed`. If it's an error, it deletes the record so the client can retry. Records auto-expire after 24 hours via a MongoDB TTL index."

### Webhook Deep Dive

> "Webhooks follow the industry pattern used by Stripe and Razorpay. After each payment, the service builds a standardized payload containing the event type, payment ID, amount, status, and gateway response. It generates an HMAC-SHA256 signature using a shared secret. The delivery is simulated asynchronously using setTimeout — I chose this over a real HTTP call to avoid needing an external server. The receiver endpoint verifies the signature using constant-time comparison (crypto.timingSafeEqual) to prevent timing attacks. For the Recovery Agent integration, there's a separate secret and a configurable timeout with AbortController. Critically, webhook delivery is fire-and-forget — payment state is never affected by webhook success or failure."

### Retry Deep Dive

> "The retry mechanism has two entry points: user-facing (`POST /api/payments/retry`) and internal (`POST /api/internal/retry-payment` for the Recovery Agent). Both ultimately call the same `paymentService.retryPayment()` function. The service validates the order isn't already paid, isn't cancelled, hasn't expired, and hasn't exceeded maxAttempts. It logs a `payment.retry` event with the attempt number. Then it calls `processPayment()` — which creates a brand new Payment record with an incremented retryCount. Every attempt is preserved for auditing. The internal API has an additional security measure: it looks up the last failed Payment and reuses the stored card/UPI details, so the Recovery Agent never handles raw payment credentials."

### Security Deep Dive

> "Security is layered. At the network level: Helmet sets security headers, CORS restricts origins, and body size is limited to 10KB. At the authentication level: JWTs are signed with a secret, expire in 7 days, and are invalidated if the user changes their password. At the authorization level: the `restrictTo` middleware checks the user's role against a whitelist. At the data level: passwords are bcrypt-hashed with cost 12, card numbers are SHA-256 hashed and masked, CVV is never stored. At the API level: express-validator validates all inputs including credit card format, UPI VPA pattern, and email format. At the communication level: webhooks are HMAC-signed, internal APIs use API key auth with constant-time comparison. At the rate limiting level: three separate limiters prevent brute force and abuse."

### Database Deep Dive

> "Five collections with a clean relationship model. User is the root entity. Orders belong to Users and represent payment intent. Payments belong to both Orders and Users — one Order can have multiple Payments (retry attempts). IdempotencyKeys belong to Users and are scoped per-user, with a TTL index for automatic cleanup. TransactionLogs reference all three entities and serve as an append-only audit trail. I use compound indexes for the most common query patterns: user+createdAt for listing, status+createdAt for filtering, orderId+status for finding the latest payment per order. The Order model has a virtual field `isExpired` that computes whether the 30-minute window has passed."

### Architecture Deep Dive

> "I chose a service-layer architecture specifically because of the dual-entry-point requirement. Both the user-facing payment API and the Recovery Agent's internal API need to process payments — but with different authentication, different validation, and different card detail handling. By putting the core logic in `paymentService`, I avoid duplicating it. The service doesn't know or care whether it was called from a JWT-authenticated user request or an API-key-authenticated internal request. The controller layer handles those concerns. The payment engine is a separate module because it's the one piece that would be swapped out for a real gateway integration — clean separation makes that replacement straightforward."

---

## 37. Common Mistakes / Things I Should NOT Claim

| ❌ Do NOT Say | ✅ Say Instead |
|---|---|
| "We process real payments" | "Payment processing is simulated — the architecture is production-grade" |
| "We integrated Razorpay/Stripe" | "The payment engine simulates gateway behavior — it can be replaced with a real SDK" |
| "PCI-DSS compliant" | "We follow PCI-adjacent best practices like not storing CVV and masking card numbers" |
| "Real-time webhook delivery" | "Webhooks are dispatched asynchronously via setTimeout — no message queue yet" |
| "Distributed system" | "Single-server architecture — designed to scale horizontally but currently single-process" |
| "We use Redis for idempotency" | "Idempotency uses MongoDB — Redis would be used in a distributed production setup" |
| "We use message queues for webhooks" | "Webhooks use setTimeout — a message queue would be added for reliability at scale" |
| "100% consistent" | "Sequential updates without database transactions — MongoDB transactions could be added for stronger consistency" |
| "Automated test coverage" | "Test infrastructure is configured (Jest) but automated tests haven't been written yet" |
| "We handle all edge cases" | "Common edge cases are handled — there's a known race condition window for concurrent idempotency checks on a single server" |
| "Real-time monitoring" | "Logging with Winston + Transaction Logs — no metrics/alerting/tracing yet" |
| "We encrypt card numbers" | "Card numbers are hashed (SHA-256) and masked — not encrypted. Encryption key exists but AES encryption is not applied to card data" |

---

## 38. Future Improvements

> **All items below are NOT currently implemented. They are documented as architectural improvements for production readiness.**

| Area | Improvement |
|---|---|
| **Payment Gateway** | Replace `paymentEngine.js` with Razorpay/Stripe SDK for real transaction processing |
| **Distributed Idempotency** | Redis with `SET NX EX` for atomic, cross-server idempotency |
| **Message Queue** | RabbitMQ/Kafka/Bull for reliable webhook delivery with retries and dead-letter queue |
| **Background Workers** | Separate processes for webhook delivery, Recovery Agent notifications |
| **Database Transactions** | MongoDB multi-document transactions for atomic Order + Payment updates |
| **Automated Tests** | Unit tests (Jest), integration tests (Supertest), E2E tests (Playwright) |
| **Monitoring** | Prometheus metrics + Grafana dashboards for payment latency, success rate |
| **Distributed Tracing** | OpenTelemetry / Jaeger for request tracing across services |
| **Alerting** | PagerDuty/Slack alerts for success rate drops, high error rates |
| **CI/CD Pipeline** | GitHub Actions for lint, test, build, deploy |
| **Payment Reconciliation** | Daily batch comparison of internal records vs gateway records |
| **Fraud Detection** | Rule-based or ML-based detection for suspicious payment patterns |
| **Refund Processing** | Full refund flow with gateway communication |
| **Multi-currency Support** | Real-time exchange rates, currency conversion |
| **Webhook Retry Queue** | Exponential backoff (1s, 2s, 4s, 8s...) with max retries |
| **API Versioning** | `/api/v1/` prefix for backward compatibility |
| **Rate Limiting (Redis)** | `rate-limit-redis` for distributed rate limiting across instances |

---

## 39. Quick Interview Revision

### Architecture
```
React SPA → Axios + JWT → Express → Middleware Pipeline → Controller → Service → MongoDB
```

### Payment Flow
```
Order (created) → Payment (pending → processing → success/failed) → Webhook → Recovery Agent
```

### Reliability Stack
```
Idempotency + Retry (3 attempts) + Transaction Logging + Fire-and-forget Webhooks
```

### Security Stack
```
JWT + bcrypt + RBAC + Rate Limiting (3 tiers) + HMAC-SHA256 + Card Masking + timingSafeEqual
```

### Key Numbers

| Metric | Value |
|---|---|
| Default success rate | 85% |
| Max retry attempts | 3 |
| Order expiry | 30 minutes |
| Idempotency key TTL | 24 hours |
| Rate limit (global) | 100 / 15 min |
| Rate limit (payment) | 5 / min |
| Rate limit (auth) | 10 / 15 min |
| JWT expiry | 7 days |
| bcrypt salt rounds | 12 |
| Body size limit | 10 KB |

### Top 8 Interview Questions

1. **Explain the payment flow** → Order → Payment → Engine → Success/Failure → Webhook
2. **Explain idempotency** → Key header → MongoDB check → cached response or new processing → TTL cleanup
3. **Explain retry** → 3 max attempts → new Payment per retry → order status tracking
4. **Explain webhook** → HMAC-SHA256 → async setTimeout → fire-and-forget → Recovery Agent notification
5. **Explain failure handling** → payment.failed → order stays created (retryable) or failed (terminal) → logged → webhook sent
6. **Explain security** → JWT + bcrypt + RBAC + rate limiting + HMAC + card masking + CVV never stored
7. **Explain database design** → 5 collections, Order→Payment (one-to-many), TTL on idempotency, compound indexes
8. **Explain scalability** → Currently single-server → Redis for idempotency + message queue for webhooks + horizontal scaling

### Quick Answers for Common Follow-ups

- **"Is this a real gateway?"** → No, simulated. Architecture is real, money is not.
- **"Why MongoDB?"** → Document model fits payment data (nested card details, flexible methods).
- **"What if server crashes mid-payment?"** → Payment record exists in DB. Order might be inconsistent → needs MongoDB transactions in production.
- **"How do you handle concurrent requests?"** → Idempotency middleware + MongoDB unique index. Redis would be better for distributed.
- **"Why not store CVV?"** → PCI-DSS says never store CVV post-authorization. We validate it, use it, discard it.
