# Final Year Project (FYP) Technical Report
## Project: Stride (Premium Footwear E-Commerce Platform)

---

## 1. Executive Summary
This report presents the physical architecture, data structures, and implementation outcomes of **Stride**, a modern footwear e-commerce platform. Stride is engineered to deliver a seamless shopping experience through high-performance client views, advanced back-office admin automation, and cognitive integrations. Key components include a vector-search catalog (RAG-assisted), a real-time WebSocket messaging layer, a weather-aware logistics notifier, and a highly customizable administrative panel.

---

## 2. System Architecture & Tech Stack

```
               +----------------------------------------+
               |           React Client (Vite)          |
               | (Authentication / State / Routing)     |
               +-------+--------------------+-----------+
                       |                    |
             HTTPS REST|                    |WebSocket (WS/WSS)
                       v                    v
        +--------------+--------------------+-----------+
        |                 Express API Server            |
        |       (Controllers / Services / Socket.io)     |
        +---+--------------+-----------+------------+---+
            |              |           |            |
            v              v           v            v
      +-----+----+   +-----+----+ +----+----+ +-----+-----+
      | Firebase |   | Supabase | |   Groq  | |Cloudinary |
      |   Auth   |   | (Postgre)| |  (LLM)  | |  (Images) |
      +----------+   +----------+ +---------+ +-----------+
```

### 2.1 Frontend Component Architecture
*   **React 18 & Vite**: Fast development server (HMR) and Rolldown-minified static builds.
*   **State Providers (React Context)**:
    *   `CartContext`: Manages cart additions, price modifications matching active coupons/flash sales, and local storage state persistence.
    *   `CurrencyContext`: Handles exchange rate state, symbols, and local storage values.
    *   `OfferContext`: Subscribes to offers from Supabase to globally apply discounts.
*   **Encapsulated Styling**: Uses HSL-tailored dark/light mode tokens in `index.css` combined with **CSS Modules** (e.g. `AdminDashboard.module.css`) to enforce styling scopes.

### 2.2 Backend Architecture
*   **Express (Node.js)**: Orchestrates REST routes and handles middleware configurations.
*   **Socket.io (Persistent Bidirectional WebSockets)**: Connects customers directly to admin agents for real-time customer care.
*   **External Service Integrations**:
    *   **Stripe**: Credit card billing using checkout sessions.
    *   **Cloudinary**: Image upload pipelines.
    *   **Resend**: Transactional emails.
    *   **WeatherAPI & IPAPI**: Geo-location weather details.

---

## 3. Database Schema Design (Physical Implementation)

The platform utilizes a relational PostgreSQL database hosted on Supabase, featuring 9 primary tables. Foreign key constraints ensure data consistency through cascade deletions.

### 3.1 Data Dictionary

#### 1. `products`
Stores the master catalog of footwear items.
*   `id` (text/UUID, PK): Unique identifier.
*   `brand` (text, Not Null): Brand name (e.g., Nike, Adidas).
*   `name` (text, Not Null): Sneaker model name.
*   `description` (text): Comprehensive item details.
*   `price` (numeric, Not Null): Base cost in USD.
*   `tags` (text): Comma-separated descriptors (e.g., "Men, Featured").
*   `main_image_url` (text, Not Null): Primary catalog image.
*   `embedding` (vector(384/768)): Dimensional vector for semantic search.
*   `created_at` (timestamp): Row creation date.

#### 2. `product_colors`
Handles secondary variant images and color configurations.
*   `id` (bigint, PK, Auto-increment)
*   `product_id` (text, FK -> `products.id` ON DELETE CASCADE)
*   `color_name` (text, Not Null): Name of the shade.
*   `image_url` (text, Not Null): Cloudinary image link for the variant.

#### 3. `product_sizes`
Holds inventory counts for specific sizes.
*   `id` (bigint, PK, Auto-increment)
*   `product_id` (text, FK -> `products.id` ON DELETE CASCADE)
*   `size` (numeric, Not Null): Footwear size (e.g., 7, 8, 9, 10, 11, 12).
*   `stock_quantity` (integer, Not Null): Units available.

#### 4. `orders`
Manages purchases and shipments.
*   `id` (text/UUID, PK): Unique order tracking ID.
*   `created_at` (timestamp): Timestamp of purchase.
*   `full_name` (text, Not Null): Customer shipping name.
*   `email` (text, Not Null): Customer email.
*   `phone` (text)
*   `address` (text, Not Null): Shipping address.
*   `postal_code` (text)
*   `items` (json, Not Null): Serialized array of products, containing names, images, selected size, color, quantity, and unit prices.
*   `total_amount` (numeric, Not Null): Final payment in USD.
*   `status` (text, Default: 'Pending'): Fulfill status ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled').
*   `is_manual_override` (boolean, Default: false): Flag to prevent automatic time-based status transitions.

#### 5. `delivery_options`
Defines shipping costs.
*   `id` (text, PK)
*   `name` (text, Not Null): Shipping tier name.
*   `cost` (numeric, Not Null): Cost in USD.
*   `is_free` (boolean): Flag for free shipping.
*   `time` (text): Estimated shipping duration.

#### 6. `offers`
Stores discounts, coupon codes, and flash sales.
*   `id` (bigint, PK, Auto-increment)
*   `type` (text, Not Null): Offer tier ('coupon' or 'flash').
*   `code` (text, Unique): Promo code string.
*   `discount_percentage` (integer, Not Null): Discount value (1-100%).
*   `target_product_id` (text, FK -> `products.id` ON DELETE CASCADE): Product scope (null if global).
*   `valid_until` (date): Expiration date.
*   `limit` (integer): Remaining redemptions.

#### 7. `platform_notifications`
System alerts for store admins.
*   `id` (bigint, PK, Auto-increment)
*   `type` (text, Not Null): Notification category.
*   `title` (text, Not Null): Brief header.
*   `message` (text, Not Null): Detailed body.
*   `related_id` (text): References entity (Product/Order/Offer).
*   `is_read` (boolean, Default: false)
*   `created_at` (timestamp)

#### 8. `reviews`
Stores customer ratings.
*   `id` (bigint, PK, Auto-increment)
*   `product_id` (text, FK -> `products.id` ON DELETE CASCADE)
*   `user_id` (text, Not Null): User UID.
*   `user_name` (text)
*   `rating` (integer): Star count (1 to 5).
*   `text` (text): Customer review text.
*   `created_at` (timestamp)

#### 9. `chat_messages`
Persists customer support chat transcripts.
*   `id` (bigint, PK, Auto-increment)
*   `user_id` (text, Not Null): User UID/Session ID.
*   `user_name` (text): Customer name.
*   `text` (text, Not Null): Chat content.
*   `sender` (text, Not Null): 'user', 'admin', or 'ai'.
*   `created_at` (timestamp)

---

## 4. Key Modules & Technical Implementation

### 4.1 RAG-Assisted Chatbot & Vector Search
The platform incorporates semantic vector matching using postgres pgvector.

1. **Embedding Generator (`embeddingService.js`)**:
   Generates dimensional embeddings. If the Gemini API key is present, it uses `text-embedding-004` (768 dimensions). If it fails, it runs Xenova's `@xenova/transformers` locally using `feature-extraction` pipeline with `Xenova/all-MiniLM-L6-v2` (384 dimensions) as a fallback.
2. **Semantic Search Matching (`productController.js`)**:
   Receives a query string, converts it to an embedding, and queries the database using Supabase RPC:
   ```sql
   CREATE OR REPLACE FUNCTION match_products(
     query_embedding vector,
     match_threshold float,
     match_count int
   ) RETURNS SETOF products AS $$
     SELECT * FROM products
     WHERE embedding <=> query_embedding < (1 - match_threshold)
     ORDER BY embedding <=> query_embedding ASC
     LIMIT match_count;
   $$ LANGUAGE SQL STABLE;
   ```
3. **SSE Text Streaming (`chatController.js`)**:
   Provides real-time answers by query-matching against products and injecting matching data context directly into Groq's System Prompt. Responses are streamed to the client using Server-Sent Events (SSE).

### 4.2 Smart Logistics Officer
Instead of generic shipping status texts, this feature generates context-aware logistics messages:
*   **IP Detection**: Resolves the user's city via `ipapi.co` based on the request's IP address.
*   **Weather Retrieval**: Queries `weatherapi.com` to check local weather variables (rain, heat, snow).
*   **Logistics Inference**: Feeds the weather state, temperature, order status, and order ID to Groq (`llama-3.1-8b-instant`), producing a weather-aware logistics message under 50 words.
    *   *Example Output*: *"Logistics Alert: Your package is currently Processing. High precipitation and thunderstorms in Seattle may cause a slight delay. We are tracking your order #4029 closely to ensure safe arrival."*

### 4.3 Super Admin Dashboard Features
Admin Dashboard components are split into modular layouts to handle complex dashboards:
*   **Variant Product Builder**: Uploads images to Cloudinary, binds them to color variants, and populates size rows in `product_sizes`.
*   **Orders Management**: Displays order histories, showing customer profiles, checkout totals, and **purchased product names and quantities** in real-time.
*   **Live Chat WebSocket Suite**: Listens for Socket.io connections. When a customer messages the helpline, the message is stored in `chat_messages` and broadcasted via websocket to the active admin dashboard room for real-time customer care.
*   **Testing Lab Sandbox**: Manages store logic flags (`allowAddToCart`, `allowBuyNow`, etc.) via `localStorage`. When `allowContentDownload` is set to false, it attaches event listeners globally to disable right-click context menus and drag-starts on image/video nodes, preventing asset theft.

---

## 5. API & WebSocket Specifications

### 5.1 Rest Endpoints

| Endpoint | Method | Purpose | Input Payload | Output Payload |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/verify` | POST | Verifies Firebase ID Tokens | `{ idToken: "..." }` | `{ success: true, user: { uid, email } }` |
| `/api/payments/checkout` | POST | Generates Stripe Checkout sessions | `{ items: [], customerEmail }` | `{ id: "session_id", url: "stripe_url" }` |
| `/api/products/search` | POST | Returns semantically matched items | `{ query: "running shoes" }` | `[ { id, name, price, brand, ... } ]` |
| `/api/currency/rate` | GET | Fetches exchange rates based on target | Query: `?target=EUR` | `{ rate: 0.92 }` |
| `/api/currency/ip` | GET | Detects client geo-location | Query: `?ip=8.8.8.8` | `{ city: "...", country: "..." }` |
| `/api/ai/tracking` | POST | Generates smart shipping updates | `{ orderId, userCity }` | `{ success: true, update: "..." }` |

### 5.2 WebSocket Event Contract (Socket.io)
*   `join-room`: Sent by customer or admin to join the user's UID room.
*   `send-to-admin`: Sent by the client when submitting support tickets. Emits `new-customer-message` to active admin agents.
*   `send-to-user`: Emits replies from the admin dashboard to the user's UID room as `admin-message`.

---

## 6. Build and Validation Metrics

The production package compiling sequence using Vite reports successful outputs:

```bash
vite v8.0.10 building client environment for production...
transforming...✓ 221 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     1.16 kB │ gzip:   0.56 kB
dist/assets/index-ByjE1OZ0.css    232.89 kB │ gzip:  36.02 kB
dist/assets/index-B9yqcqju.js   1,058.23 kB │ gzip: 291.17 kB
✓ built in 1.08s
```

*   **HTML Payload**: `1.16 kB` (Optimized index head containing Google font loads).
*   **CSS Style Payload**: `232.89 kB` (Unified styles with dark theme definitions and responsive configurations).
*   **JS Application Bundle**: `1.05 MB` (Bundles Firebase, Stripe Elements, Socket.io client, and React DOM libraries).

---

## 7. Conclusion & Future Scope
The **Stride** e-commerce platform successfully combines modern layout design with cognitive capabilities. The vector search implementation provides reliable retrieval capabilities, and the websocket live chat enables active customer support.

Future improvements include:
1. Migrating to server-side vector search matching natively in PostgreSQL rather than calling client RPC endpoints.
2. Integrating native payment APIs to process checkout flows directly on-page, rather than redirecting to hosted Stripe sessions.
3. Implementing automatic database backfills to vectorize products upon creation or updates.
