# Software Requirements Specification (SRS) Report
## Project Title: Stride — Premium Footwear E-Commerce Platform with Cognitive Support & Advanced Admin Controls

---

## 1. Introduction

### 1.1 Purpose
This document provides a highly detailed, comprehensive Software Requirements Specification (SRS) for the **Stride** e-commerce platform. It outlines the complete system specifications, functional and non-functional requirements, data dictionaries, and architectural guidelines established prior to the development of the client website and backend server.

### 1.2 Scope of the Project
Stride is designed as an advanced, visual-first online retail platform for high-end footwear. Unlike traditional e-commerce templates, Stride combines a premium consumer store with cognitive features and deep administrative controls. The project scope encompasses:
*   **A High-Performance Frontend**: Built on React 18 and Vite, running a single-page application (SPA) optimized for low latency, featuring light/dark layout modes, and customized scroll and animation layers.
*   **A Decoupled Express API Backend**: Running on Node.js to coordinate third-party APIs (Stripe, Cloudinary, Resend, WeatherAPI, Groq AI, and Gemini).
*   **A Hybrid Relational & Vector Database**: Powered by Supabase (PostgreSQL) with `pgvector` enabled to host structural tables and execute semantic catalog matching.
*   **Cognitive AI Integrations**:
    1.  *RAG-Assisted Support Agent*: An on-site chatbot that performs semantic catalog queries and streams answers using Server-Sent Events (SSE).
    2.  *Smart Logistics Officer*: An AI compiler that detects shipping destinations, retrieves local meteorological variables, and generates custom delivery updates under 50 words.
*   **Administrative Oversight (Super Admin Panel)**: An admin command center providing full catalog CRUD capabilities, bulk stock variant controllers, real-time customer chat management, and a sandboxed testing configuration lab.

### 1.3 Definitions, Acronyms, and Abbreviations
*   **SRS**: Software Requirements Specification.
*   **FYP**: Final Year Project.
*   **RAG**: Retrieval-Augmented Generation.
*   **SSE**: Server-Sent Events (unidirectional text streaming protocol over HTTP).
*   **RPC**: Remote Procedure Call.
*   **pgvector**: An open-source vector similarity search extension for PostgreSQL.
*   **JWT**: JSON Web Token (used in Firebase Auth authentication headers).
*   **CRUD**: Create, Read, Update, Delete.
*   **SPA**: Single Page Application.
*   **HMR**: Hot Module Replacement.
*   **CDN**: Content Delivery Network.

---

## 2. Overall Description

### 2.1 Product Perspective
Stride operates as a distributed web application. The client application communicates with the database directly using the Supabase client-side JS library for transactional operational reads and writes, while offloading secure actions (like generating Stripe payment sessions, executing LLM-based logistics calculations, sending transactional emails, and deleting Cloudinary assets) to the Express API server.

```
+-----------------------------------------------------------------------------+
|                               USER BROWSER                                  |
|                                                                             |
|  +--------------------+   +-----------------------+   +------------------+  |
|  |    React Client    |   | Firebase Auth SDK     |   | Supabase SDK     |  |
|  | (UI & Contexts)    |   | (Token generation)    |   | (Direct DB reads)|  |
|  +---------+----------+   +-----------+-----------+   +--------+---------+  |
+------------|--------------------------|------------------------|------------+
             |                          |                        |
     REST API|                          |Verify Token            |Queries
   & WebSockets                          v                        v
+------------|--------------------------|------------------------|------------+
|            v                          v                        v            |
|  +------------------------------------+----------------------------------+  |
|  |                      Express.js API Backend Server                    |  |
|  |                       (Routing, Logic, Socket.io)                     |  |
|  +-----+------------+-----------+------------+------------+-----------+--+  |
|        |            |           |            |            |           |     |
+--------|------------|-----------|------------|------------|-----------|-----+
         v            v           v            v            v           v
    +----+----+  +----+----+  +---+----+  +----+----+  +----+----+ +----+----+
    | Stripe  |  |Cloudinary| | Resend |  |Weather  |  |  Groq   | | Gemini  |
    | Gateway |  |  Server  | | Email  |  |   API   |  | (Llama) | | Embeds  |
    +---------+  +----------+  +--------+  +---------+  +---------+ +---------+
```

### 2.2 Product Functions

#### 2.2.1 Customer Storefront Capabilities
1.  **Visual Catalog Navigation**: Multi-device grid views with filtering by category (Men, Women, Universal, New Arrival) and brand (Nike, Adidas, Puma, New Balance, Jordan).
2.  **Semantic Search**: Query input bar processing natural language searches (e.g., "blue sneakers for running in the rain") instead of keyword matching.
3.  **Local Price Conversion**: Automatic detection of customer location via IP mapping, triggering real-time exchange rate conversions (USD, EUR, GBP, PKR, etc.).
4.  **Cart & Checkout Loop**: Cart drawer displaying details (variant image, name, size, selected color block, quantity). Redirection to secure Stripe elements processing credit card transactions.
5.  **Smart Delivery Tracker**: Real-time status update compiler that combines delivery statuses with destination weather to generate custom logistics messages.
6.  **Interactive Support Chatbot**: Sticky bubble UI displaying a chat interface that responds instantly to product and support queries.
7.  **Review System**: Star ratings and text feedback blocks linked to authenticated users.

#### 2.2.2 Super Admin Dashboard Capabilities
1.  **Overview Analytics**: Real-time charts demonstrating revenue over time (Line Chart) and category inventory proportions (Doughnut Chart).
2.  **Product Variant Builder**: Visual creation form allowing admins to enter base details (brand, name, description, price, custom tags) and generate a variant matrix (assigning images to color blocks and configuring stock quantities per size).
3.  **Bulk Stock controller**: Spreadsheet interface listing sizes 7 to 12 across all products, allowing admins to adjust quantities simultaneously.
4.  **Promotional Planners**: Modules to launch coupon codes and flash sales.
5.  **Live Support Desk**: A multi-room chat window displaying user threads, allowing admins to reply directly over WebSockets.
6.  **Testing Lab Sandbox**: A debug console to toggle feature availability (`allowAddToCart`, `allowBuyNow`, `allowReviews`, `allowWishlist`, `enableChatbot`, `enableStripeCheckout`, `allowContentDownload`).

### 2.3 User Classes and Characteristics
*   **Anonymous Guest**: Can view pages, search products semantically, add items to the cart, and toggle currency options.
*   **Registered Customer**: Can proceed to checkout, view order histories, submit reviews, and persist support chats.
*   **Super Admin**: Elevated role requiring distinct authentication. Has access to all administrative modules.

### 2.4 Design and Implementation Constraints
1.  **Stateless API Design**: The Express server must not maintain local sessions; all requests must be authenticated via Firebase ID tokens validated on each request.
2.  **Database Decoupling**: Direct DB reads from the client are allowed for high-speed catalog display, but administrative database modifications must go through safety validation.
3.  **No Native Local Assets**: All images uploaded through the admin panel must be hosted on Cloudinary, and deleting products must delete the matching assets from Cloudinary.

---

## 3. System Features & Functional Requirements

### 3.1 Firebase User Authentication & Session Management
*   **Description**: Registration, login, password reset, and session handling.
*   **Requirements**:
    *   **FR-1.1**: The client must integrate Firebase Client SDK.
    *   **FR-1.2**: Backend endpoints must validate incoming Bearer tokens using `admin.auth().verifyIdToken()`.
    *   **FR-1.3**: Admin routes must verify that the user role matches `admin` (stored in local storage/custom claims).
    *   **FR-1.4**: Users must have the ability to permanently delete their authentication profile and associated local profile metadata.

### 3.3 Dynamic Product Catalog & Semantic Search
*   **Description**: Catalog representation and concept-based vector matching.
*   **Requirements**:
    *   **FR-2.1**: Products must be rendered using a grid layout with skeleton loaders.
    *   **FR-2.2**: The backend must expose a vector search API at `/api/products/search`.
    *   **FR-2.3**: The backend must convert incoming query strings into high-dimensional vectors via Gemini `text-embedding-004` (768 dimensions) or the local `@xenova/transformers` library (`all-MiniLM-L6-v2`, 384 dimensions) if the API key fails.
    *   **FR-2.4**: The system must execute vector distance calculations in Supabase via pgvector cosine distance:
        $$\text{distance} = 1 - (\text{embedding} \cdot \text{query\_embedding})$$
    *   **FR-2.5**: Semantic queries must return matches above a similarity threshold of 0.3.

### 3.3 Shopping Cart, Coupons & Stripe Checkout
*   **Description**: Item collation, coupon deductions, and credit card transactions.
*   **Requirements**:
    *   **FR-3.1**: The client must persist cart details using `localStorage`.
    *   **FR-3.2**: Cart calculations must dynamically compute unit prices and totals while accounting for active flash sales and valid coupons.
    *   **FR-3.3**: The backend must process Stripe checkout requests via `/api/payments/checkout`, translating product lists into lines of Stripe metadata.
    *   **FR-3.4**: Once a payment completes, the success redirect route `/order-confirmation` must record the transaction details in the `orders` table.

### 3.4 Real-Time Cognitive Chatbot (RAG)
*   **Description**: Automated customer support using contextual retrieval and stream output.
*   **Requirements**:
    *   **FR-4.1**: The customer support panel must establish a connection to `/api/chat` using Server-Sent Events (SSE).
    *   **FR-4.2**: The chatbot must perform semantic lookups on incoming user messages, querying matching items in the database.
    *   **FR-4.3**: Matching item details (name, price, stock, description) must be injected into the LLM system prompt as context.
    *   **FR-4.4**: The LLM must output responses in real-time, streaming tokens to the client.
    *   **FR-4.5**: Conversations must be persisted in the `chat_messages` table under the corresponding user ID.

### 3.5 Smart Logistics Officer
*   **Description**: Weather-aware shipping tracking.
*   **Requirements**:
    *   **FR-5.1**: The backend must expose `/api/ai/tracking`.
    *   **FR-5.2**: The system must resolve the user's city via IP mapping.
    *   **FR-5.3**: The backend must fetch real-time weather indicators (temperature, rain levels, snow, extreme winds) for the resolved city.
    *   **FR-5.4**: The system must compile the order status (Pending, Shipped, Delivered) and local weather conditions, prompting Groq (`llama-3.1-8b-instant`) to generate a custom update under 50 words.

### 3.6 Super Admin Panel & Testing Lab
*   **Description**: Store management interface and debug environment.
*   **Requirements**:
    *   **FR-6.1**: The panel must include a Product Manager to add, edit, and delete products, uploading assets to Cloudinary.
    *   **FR-6.2**: The panel must include an Inventory module to manage sizes (7-12) and bulk update stock levels.
    *   **FR-6.3**: The panel must include a Live Chat module to manage WebSocket-based user support rooms.
    *   **FR-6.4**: The panel must include a Testing Lab module to manage system settings (`allowAddToCart`, `allowBuyNow`, etc.) via `localStorage`.
    *   **FR-6.5**: When `allowContentDownload` is set to false, the system must disable the context menu and drag actions on images and videos.

---

## 4. External Interface Requirements

### 4.1 User Interfaces
*   Premium light/dark theme toggles.
*   Encapsulated CSS Modules (e.g. `AdminDashboard.module.css`) to prevent style leaks.
*   Responsiveness supporting viewports from 320px (mobile) to 2560px (desktop).
*   Skeleton placeholders for loading states.

### 4.2 Software Interfaces
*   **Supabase PostgreSQL API**: For database CRUD operations.
*   **Firebase Authentication API**: For user registration and token verification.
*   **Stripe Elements / Hosted Checkout**: For credit card payments.
*   **Cloudinary Upload API**: For image hosting and management.
*   **WeatherAPI**: For real-time weather queries.
*   **Groq API**: For text generation using the LLaMA model.

### 4.3 Communication Interfaces
*   **HTTPS**: Secure REST communication.
*   **WebSockets (WS)**: Persistent bidirectional pipelines for real-time support chat.

---

## 5. Non-Functional Requirements

### 5.1 Performance
*   Page load time under 1.5 seconds under standard broadband conditions.
*   Vector search completion under 800ms.
*   WebSocket communication latency under 150ms.

### 5.2 Security
*   **Payment Processing**: Offloaded entirely to Stripe.
*   **Authentication**: Admin routes protected by Firebase ID token verification.
*   **Data Consistency**: Cascade deletion constraints on product variants.
*   **Asset Protection**: Optional prevention of image and video copying.

### 5.3 Quality Attributes
*   **Usability**: Smooth animations and clean layouts.
*   **Portability**: Node.js and static Vite output compatible with modern hosting platforms (Vercel, Render, AWS).
*   **Maintainability**: Standardized directory structure separating pages, components, and contexts.
