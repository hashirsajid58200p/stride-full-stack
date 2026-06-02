# Final Year Project (FYP) Implementation Report
## Project Title: Stride — Premium Footwear E-Commerce Platform with Cognitive Support & Advanced Admin Controls

---

## 1. Executive Summary & Objectives Met
This document presents the technical implementation details of **Stride**, a full-stack, footwear e-commerce platform. Stride combines high-performance storefront layouts with cognitive capabilities (vector search, RAG customer chatbot, weather-aware shipping alerts) and back-office administrative automation.

### Completed Milestones
*   **High-Speed E-Commerce Loop**: Developed responsive storefront views using React 18, Vite, and Vanilla CSS with dark/light themes.
*   **Decoupled Backend**: Configured a Node.js Express server to handle image uploads (Cloudinary), payment processing (Stripe), email routing (Resend), and AI model integration (Gemini and Groq).
*   **Semantic Search & RAG Support**: Embedded product descriptions using Gemini `text-embedding-004` (with a local Xenova transformer fallback) and matching queries in PostgreSQL using `pgvector`. Added an SSE-enabled chatbot.
*   **Smart Logistics**: Built a tracking notification system that detects customer locations via IP addresses and compiles weather-aware delivery alerts using LLaMA 3.1.
*   **Super Admin Control Panel**: Implemented stats charts via ChartJS, a variant product builder, a bulk inventory restocker, real-time live support over Socket.io, and a testing sandbox with content protection.

---

## 2. Codebase Directory Layout

The physical structure of the Stride repository is organized into frontend (`client/`) and backend (`server/`) environments:

```
stride-full-stack/
├── client/
│   ├── public/
│   │   └── images/                     # Static assets, branding logos, and avatars
│   ├── src/
│   │   ├── components/
│   │   │   ├── Admin/
│   │   │   │   ├── LiveChat/
│   │   │   │   │   ├── LiveChat.jsx    # Real-time WebSocket support desk for admins
│   │   │   │   │   └── LiveChat.module.css
│   │   │   │   └── AnalyticsCharts.jsx # Interactive charts (originally using Recharts)
│   │   │   ├── ECommerce/
│   │   │   │   ├── Cart/               # Cart drawer sliding panel
│   │   │   │   ├── ProfileSettings/    # User settings and profile updates
│   │   │   │   └── Reviews/            # Product rating and feedback modules
│   │   │   ├── Layout/
│   │   │   │   ├── Header/             # Responsive header
│   │   │   │   ├── Footer/             # Footer
│   │   │   │   └── Support/            # Persistent AI chat widget
│   │   │   └── UI/
│   │   │       ├── Loader/             # Global page transition spinner
│   │   │       ├── CustomScrollbar/    # Custom cross-browser scroll panels
│   │   │       ├── CustomCheckbox/     # Stylized form selection nodes
│   │   │       ├── Notification/       # Global toast/alert system
│   │   │       └── Pagination/         # Dynamic tables pagination component
│   │   ├── context/
│   │   │   ├── CartContext.jsx         # Context for cart state
│   │   │   ├── CurrencyContext.jsx     # Context for currency selection
│   │   │   └── OfferContext.jsx        # Context for offer updates
│   │   ├── pages/
│   │   │   ├── Home/                   # Hero video and landing page
│   │   │   ├── Products/               # Product grid with semantic filtering
│   │   │   ├── ProductDetail/          # Color selectors and sizing matrix
│   │   │   ├── ShoppingCart/           # Shopping cart summary page
│   │   │   ├── Checkout/               # Billing form and delivery options
│   │   │   ├── OrderConfirmation/      # Order success page
│   │   │   ├── Login/                  # Credentials authenticator
│   │   │   ├── Signup/                 # User registration form
│   │   │   ├── ForgotPassword/         # Password reset page
│   │   │   ├── UserDashboard/          # Customer dashboard
│   │   │   ├── AdminDashboard/         # Administrative dashboard
│   │   │   │   ├── AdminDashboard.jsx
│   │   │   │   ├── AdminDashboard.module.css
│   │   │   │   └── sections/
│   │   │   │       ├── OverviewSection.jsx
│   │   │   │       ├── ProductsSection.jsx
│   │   │   │       ├── InventorySection.jsx
│   │   │   │       ├── OffersSection.jsx
│   │   │   │       ├── OrdersSection.jsx
│   │   │   │       ├── DeliverySection.jsx
│   │   │   │       └── TestingLabSection.jsx
│   │   │   ├── About/                  # About page
│   │   │   ├── Contact/                # Contact form
│   │   │   ├── FAQ/                    # FAQ accordion
│   │   │   ├── PrivacyPolicy/          # Privacy policy page
│   │   │   └── ReturnExchange/         # Returns and exchanges policy page
│   │   ├── utils/
│   │   │   └── apiConfig.js            # Dynamic API endpoint resolver
│   │   ├── App.jsx                     # Route mappings and global contexts
│   │   ├── firebaseConfig.js           # Firebase Client SDK initializer
│   │   ├── index.css                   # Global styles and layout tokens
│   │   └── main.jsx                    # Entry point
│   ├── package.json
│   └── vite.config.js                  # Vite configuration file
├── server/
│   ├── config/
│   │   └── firebaseAdmin.js            # Firebase Admin SDK initializer
│   ├── controllers/
│   │   ├── aiController.js             # Logic for smart logistics tracking
│   │   ├── authController.js           # Logic for token verification
│   │   ├── chatController.js           # Logic for chatbot SSE operations
│   │   ├── currencyController.js       # Logic for rate conversions and IP locations
│   │   ├── paymentController.js        # Logic for Stripe checkout sessions
│   │   └── productController.js        # Logic for vector search and DB synch
│   ├── routes/
│   │   ├── aiRoutes.js                 # Routing for smart logistics
│   │   ├── authRoutes.js               # Routing for auth validation
│   │   ├── chatRoutes.js               # Routing for chat operations
│   │   ├── currencyRoutes.js           # Routing for exchange rates
│   │   ├── paymentRoutes.js            # Routing for Stripe sessions
│   │   └── productRoutes.js            # Routing for search operations
│   ├── services/
│   │   └── embeddingService.js         # Logic for Gemini/Transformers embeddings
│   ├── server.js                       # Express configurations and Socket.io handlers
│   ├── package.json
│   └── vercel.json                     # Vercel serverless deployment specifications
```

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

### 3.2 SQL Setup Script for Vector Matching RPC
To support semantic search matching on the `products.embedding` column, the database runs this custom function:

```sql
CREATE OR REPLACE FUNCTION match_products(
  query_embedding vector,
  match_threshold float,
  match_count int
) RETURNS TABLE (
  id text,
  brand text,
  name text,
  description text,
  price numeric,
  tags text,
  main_image_url text,
  similarity float
) AS $$
  SELECT 
    id, brand, name, description, price, tags, main_image_url,
    1 - (embedding <=> query_embedding) AS similarity
  FROM products
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding ASC
  LIMIT match_count;
$$ LANGUAGE SQL STABLE;
```

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

```javascript
// server/controllers/chatController.js (Key Routing Segment)
const handleChat = async (req, res) => {
  try {
    const { message, userId, userEmail } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // 1. Fetch User Context (Recent purchases)
    let userContext = "No purchase history.";
    if (userEmail) {
      const orderRes = await fetch(`${supabaseUrl}/rest/v1/orders?email=ilike.${userEmail}&select=items&limit=1`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
      });
      const orderData = await orderRes.json();
      if (orderData && orderData[0]) userContext = JSON.stringify(orderData[0].items);
    }

    // 2. Fetch Semantic Catalog Context
    const queryVector = await embeddingService.generateEmbedding(message);
    let catalogContext = "";
    if (queryVector) {
      const matchRes = await fetch(`${supabaseUrl}/rest/v1/rpc/match_products`, {
        method: "POST",
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query_embedding: queryVector, match_threshold: 0.3, match_count: 3 })
      });
      const matchData = await matchRes.json();
      if (matchData) catalogContext = matchData.map(p => `Product: ${p.name}, Price: $${p.price}, Tags: ${p.tags}`).join("\n");
    }

    // 3. Compile System Prompt & Stream responses
    const systemPrompt = `You are Stride Helper. Customer purchase history:\n${userContext}\nCatalog details:\n${catalogContext}\nHelp the customer with their questions.`;
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
        stream: true,
      }),
    });

    // Stream SSE output chunks to client
    const reader = groqResponse.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 4.2 Smart Logistics Officer
Instead of generic shipping status texts, this feature generates context-aware logistics messages:
*   **IP Detection**: Resolves the user's city via `ipapi.co` based on the request's IP address.
*   **Weather Retrieval**: Queries `weatherapi.com` to check local weather variables (rain, heat, snow).
*   **Logistics Inference**: Feeds the weather state, temperature, order status, and order ID to Groq (`llama-3.1-8b-instant`), producing a weather-aware logistics message under 50 words.

```javascript
// server/controllers/aiController.js (Key Routing Segment)
const getSmartTrackingUpdate = async (req, res) => {
  const { orderId, userCity } = req.body;
  try {
    // Query Weather API
    const weatherResponse = await fetch(`http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${userCity}`);
    const weatherData = await weatherResponse.json();
    const weatherDesc = weatherData.current?.condition?.text || "Clear";
    const temp = weatherData.current?.temp_c || "N/A";

    // Query Order Status from Supabase
    const { data: orderData } = await window.supabase.from("orders").select("status").eq("id", orderId);
    const orderStatus = orderData[0]?.status || "Pending";

    // Prompts Groq for Weather-Aware Shipping Message
    const prompt = `You are the Stride Logistics Officer. Current weather in ${userCity} is ${weatherDesc} (${temp}°C). Order #${orderId} is ${orderStatus}. Generate a shipping update under 50 words.`;
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }]
      })
    });
    const aiData = await groqResponse.json();
    res.status(200).json({ success: true, update: aiData.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 4.3 Stripe Checkout Gateway & Cart Calculations
The platform handles checkout transactions securely, converting product details and amounts:

```javascript
// server/controllers/paymentController.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (req, res) => {
  try {
    const { items, customerEmail } = req.body;
    
    // Map items to Stripe line items format
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          images: [item.img],
          description: `Brand: ${item.brand} | Color: ${item.color} | Size: ${item.size}`,
        },
        unit_amount: Math.round(item.price * 100), // Converted to Cents
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: customerEmail,
      success_url: `${process.env.CLIENT_URL}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/checkout`,
    });

    res.status(200).json({ id: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 4.4 Socket.io Real-Time Support Desk
Supports multi-room WebSocket pipelines to connect active customers directly with admin agents:

```javascript
// server.js (WebSocket Management Segment)
io.on("connection", (socket) => {
  console.log("WebSocket connected:", socket.id);

  // Users and Admins join room matching User UID
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
  });

  // Client messages
  socket.on("send-to-admin", async (data) => {
    await saveMessageToDb(data.userId, data.message, "user", data.userName);
    // Broadcast notification to admin dashboard
    socket.broadcast.emit("new-customer-message", data);
  });

  // Admin replies
  socket.on("send-to-user", async (data) => {
    await saveMessageToDb(data.userId, data.message, "admin");
    // Emit reply to specific user room
    io.to(data.userId).emit("admin-message", {
      text: data.message,
      sender: "admin",
      timestamp: new Date()
    });
  });
});
```

### 4.5 Testing Lab & Content Theft Protection
The client handles sandbox overrides via administrative flag checks on DOM operations:

```javascript
// client/src/App.jsx (Content Protection Module)
useEffect(() => {
  const handleContextMenu = (e) => {
    const config = JSON.parse(localStorage.getItem("stride_admin_test_config") || "{}");
    // Protect media assets if allowContentDownload is false
    if (!config.allowContentDownload) {
      const isMedia = e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO' || e.target.closest('img') || e.target.closest('video');
      if (isMedia) e.preventDefault();
    }
  };

  const handleDragStart = (e) => {
    const config = JSON.parse(localStorage.getItem("stride_admin_test_config") || "{}");
    if (!config.allowContentDownload) {
      if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') e.preventDefault();
    }
  };

  window.addEventListener('contextmenu', handleContextMenu);
  window.addEventListener('dragstart', handleDragStart);
  return () => {
    window.removeEventListener('contextmenu', handleContextMenu);
    window.removeEventListener('dragstart', handleDragStart);
  };
}, []);
```

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

## 7. Challenges Overcome & Troubleshooting History

### 7.1 Vite & esbuild Variable Shadowing Collision
*   **Problem**: Minified production files crashed on page navigation, presenting a white screen. Investigations revealed that esbuild minification shadow-collided variables within dynamic imports.
*   **Solution**: Switched minifier in `vite.config.js` to **Terser** to ensure safe identifier replacement.

### 7.2 React 19 Dependency Conflicts in Recharts
*   **Problem**: Incompatibility between Recharts' dependency on older `react-is` versions and React 19.
*   **Solution**: Overrode the package mappings in `package.json` to resolve dependencies correctly.

### 7.3 Duplicate Orders in StrictMode
*   **Problem**: React 18 StrictMode rendered order completions twice, resulting in duplicate transactions in Supabase.
*   **Solution**: Implemented a global promise lock in the confirmation view to prevent concurrent submissions.
