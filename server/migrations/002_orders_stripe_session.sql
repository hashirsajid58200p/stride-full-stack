-- Migration 002: Add stripe_session_id to orders table for idempotent webhook handling
-- Run this in your Supabase SQL Editor

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id 
ON orders(stripe_session_id);
