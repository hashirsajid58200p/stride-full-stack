-- Migration 003: Add user_id column to orders table for reliable customer ownership verification
-- Run this in your Supabase SQL Editor

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_user_id 
ON orders(user_id);
