-- Migration 001: Atomic stock decrement function to prevent overselling race conditions
-- Run this in your Supabase SQL Editor

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
