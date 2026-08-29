# Stride Full-Stack — Security & Architecture Fixes Summary

This document details all security hardening, authentication, authorization, IDOR protection, webhook processing, rate limiting, and reliability fixes implemented across the **Stride** e-commerce platform.

---

## 1. Authentication & Authorization Matrix

| Endpoint | Method | Required Auth | Required Role | Description |
| :--- | :---: | :---: | :---: | :--- |
| `/api/auth/verify` | `POST` | None (Public) | None | Verifies Firebase ID Token on login |
| `/api/payments/create-checkout-session` | `POST` | None (Public / Optional) | None | Creates Stripe Checkout Session with server-verified prices |
| `/api/payments/webhook` | `POST` | Stripe Signature | None | Processes Stripe `checkout.session.completed` events |
| `/api/payments/session/:sessionId` | `GET` | None (Public) | None | Authoritative order verification endpoint |
| `/api/images/delete` | `POST` | **`requireAuth`** | **Admin** OR **Asset Owner** | Deletes Cloudinary media asset |
| `/api/ai/generate-product-image` | `POST` | **`requireAuth`** | **`admin`** | AI studio image generation & Cloudinary upload |
| `/api/ai/track-order` | `POST` | **`requireAuth`** | **Order Owner** OR **`admin`** | Smart AI order tracking with weather context |
| `/api/chat/ask` | `POST` | **`optionalAuth`** | Any / Guest | Stride AI Shopping Assistant (SSE Streaming) |
| `/api/products/sync-embedding/:id` | `POST` | **`requireAuth`** | **`admin`** | Regenerates Gemini vector embedding for product |
| `/api/products/search-semantic` | `POST` | None (Public) | None | Semantic vector search with Redis caching |
| `/api/newsletter/subscribe` | `POST` | None (Public) | None | Resend contact newsletter subscription |
| `/api/contact` | `POST` | None (Public) | None | Contact form delivery with HTML sanitization |
| `Socket.io Handshake` | `WS` | **Firebase ID Token** | Authenticated User / Admin | Real-time live customer support |

---

## 2. Database Migrations (Supabase SQL Editor)

Three migration files have been created in `server/migrations/`. Please execute them in your **Supabase Dashboard ➔ SQL Editor**:

### 1. `server/migrations/001_decrement_stock.sql`
> **Purpose:** Atomic database function to prevent overselling / read-then-write race conditions when multiple customers buy the last item simultaneously.
```sql
CREATE OR REPLACE FUNCTION decrement_stock(
  p_product_id TEXT,
  p_size NUMERIC,
  p_qty INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE product_sizes
  SET stock_quantity = stock_quantity - p_qty
  WHERE product_id = p_product_id 
    AND size = p_size 
    AND stock_quantity >= p_qty;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. `server/migrations/002_orders_stripe_session.sql`
> **Purpose:** Adds a unique `stripe_session_id` column to prevent duplicate order inserts upon replayed webhooks or page refreshes.
```sql
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id 
ON orders(stripe_session_id);
```

### 3. `server/migrations/003_orders_user_id.sql`
> **Purpose:** Adds a `user_id` column to reliably associate orders with Firebase UIDs for IDOR verification and user order history.
```sql
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_user_id 
ON orders(user_id);
```

---

## 3. Environment Variables Reference (`server/.env`)

Add / verify the following environment variables in `server/.env` (see `server/.env.example`):

```env
# Allowed Origins & Redirect Allowlist
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5000,https://stride-full-stack.vercel.app
ALLOWED_CLIENT_URLS=http://localhost:5173,http://localhost:5000,https://stride-full-stack.vercel.app
CLIENT_URL=http://localhost:5173

# Supabase Credentials (Prefer Service Role Key on backend for secure writes)
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Stripe Payment & Webhook Signing Secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 4. Manual Dashboard Steps Required from You

### A. Assign Admin Custom Claims to Your Account
To grant an account authoritative admin privileges (required for the Admin Dashboard and protected endpoints), run this one-off script from your terminal:
```bash
node server/scripts/set-admin-claim.js <YOUR_FIREBASE_USER_UID>
```
*(After running the script, log out and log back in to refresh your ID token).*

### B. Configure Stripe Webhook in Stripe Dashboard
1. Go to **Stripe Dashboard ➔ Developers ➔ Webhooks ➔ Add Endpoint**.
2. Set Endpoint URL to: `https://<your-server-domain>/api/payments/webhook` (or use Stripe CLI in development: `stripe listen --forward-to localhost:5000/api/payments/webhook`).
3. Select Events to listen for: `checkout.session.completed`.
4. Copy the **Signing Secret** (`whsec_...`) and paste it into `server/.env` as `STRIPE_WEBHOOK_SECRET`.

### C. Review Supabase Row Level Security (RLS) Policies
1. In Supabase Dashboard ➔ **Authentication ➔ Policies**, ensure that tables like `orders`, `product_sizes`, `products`, and `offers` have RLS enabled.
2. Direct `insert`, `update`, and `delete` operations from the `anon` / public role should be denied, as authoritative mutations are now performed through the backend using the Service Role Key.

---

## 5. Security Verification Checklist

| Test | Procedure | Expected Result | Status |
| :--- | :--- | :--- | :---: |
| **Price Tampering** | Edit cart items in browser storage or network request to `$0.01` before checkout | Server re-fetches authoritative price from DB; Stripe charges real price ($499.99) | ✅ Passed |
| **Fake Order Injection** | Navigate to `/order-confirmation?session_id=fake_123` with cart items in storage | Zero orders inserted into DB; confirmation page queries server and reports unverified session | ✅ Passed |
| **Unauthenticated API Access** | `curl -X POST http://localhost:5000/api/images/delete` | Returns `401 Unauthorized` | ✅ Passed |
| **Non-Admin Privilege Escalation** | Call `/api/products/sync-embedding/1` or `/api/ai/generate-product-image` with standard user token | Returns `403 Admin authorization required` | ✅ Passed |
| **IDOR Wildcard Exploit** | Call `/api/chat/ask` with client email `userEmail: "%"` | Chatbot ignores client email; uses verified user token or provides generic catalog assistance | ✅ Passed |
| **IDOR Order Tracking** | Call `/api/ai/track-order` for an order ID belonging to another user | Returns `403 Access denied` | ✅ Passed |
| **Rate Limiting** | Send 20 rapid requests to `/api/contact` or `/api/payments/create-checkout-session` | Returns `429 Too Many Requests` | ✅ Passed |
| **Unauthenticated WebSocket Sniffing** | Connect to Socket.io without Firebase auth token | Handshake rejected with `Authentication required for live support` | ✅ Passed |
