# Project Brief: Stride Full Stack E-Commerce

## Overview
Stride is a premium, full-stack footwear e-commerce web platform featuring dynamic catalog management, cognitive AI capabilities (semantic search, RAG support chatbot, weather-aware shipping logistics), multi-currency localization, real-time live support, and an administrative control panel.

## Core Tech Stack
- **Frontend**: React 19, Vite, React Router DOM v7, Vanilla CSS / CSS Modules, Firebase Client SDK, Socket.io Client, Supabase Client SDK.
- **Backend**: Node.js (v20), Express 5, Socket.io, Firebase Admin SDK, Stripe Node SDK, Cloudinary SDK, Resend SDK, Google Generative AI (`@google/generative-ai`), Xenova Transformers (`@xenova/transformers`), ioredis (Redis 7).
- **Database**: PostgreSQL on Supabase with `pgvector` extension for semantic vector search.
- **Cache**: Redis 7 for in-memory session/order cache and rate limiting.
- **Deployment / Cloud Target**: AWS enterprise infrastructure (AWS Organizations, Staging & Production isolated accounts, Docker, ECR, Terraform IaC, Auto Scaling Groups, Application Load Balancer, Route 53, Zero-Downtime GitHub Actions CI/CD).

## Multi-System Data Entity Mapping (Rule 9)
| Entity | Primary Storage | Secondary Storage & External Services | Create / Update / Delete Operation Scope |
|---|---|---|---|
| **Products** | Supabase `products`, `product_colors`, `product_sizes` tables | Cloudinary (product & variant images), Redis (query cache), Gemini/Xenova (vector embeddings) | Delete: Remove from Supabase (cascading), delete image assets on Cloudinary, invalidate Redis cache. Create/Update: Upsert Supabase record, re-calculate vector embedding in pgvector, update Cloudinary media, invalidate Redis cache. |
| **Users / Auth** | Firebase Authentication (UID, email, custom claims `role: admin`) | Supabase (`reviews`, `orders`, `chat_messages`), Cloudinary (user avatar image) | Delete: Remove from Firebase Auth, purge avatar on Cloudinary, clean/anonymize DB associations. |
| **Orders & Checkout** | Supabase `orders` table | Stripe (Checkout Session & Payment Intents), Redis (cached order confirmation payload) | Create: Initialize Stripe session, verify webhook, save order to Supabase, cache session details in Redis for zero-delay confirmation. |
| **Media / Assets** | Cloudinary CDN (`stride/*`) | Supabase references (`main_image_url`, `product_colors.image_url`, avatar URLs) | Delete: Destroy via Cloudinary Admin API, nullify or remove corresponding DB reference. |
| **Support Chat** | Supabase `chat_messages` table | Socket.io (in-memory room dispatch), Groq / Gemini (AI completions) | Create: Persist message in Supabase, broadcast via Socket.io room, invoke AI RAG stream if recipient is bot. |

## Responsive Breakpoint Standards (Rule 10)
- **Mobile Small / Phone**: `max-width: 480px` / `max-width: 576px`
- **Tablet**: `max-width: 768px` / `max-width: 900px` / `max-width: 992px`
- **Desktop / Laptop**: `min-width: 1024px` / `min-width: 1200px`
- **Ultra-Wide / 4K**: `min-width: 1920px` (fluid layout with container `max-width` bounds)
