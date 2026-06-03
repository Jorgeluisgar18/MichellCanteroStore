-- =====================================================
-- MIGRATION: Add Idempotency Key to Orders
-- =====================================================
-- This migration adds idempotency support to prevent duplicate orders
-- Date: 2026-01-29
-- =====================================================

-- Add idempotency_key column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key 
ON public.orders(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.orders.idempotency_key IS 'Unique key to prevent duplicate order creation from retries or double-clicks';

SELECT 'Idempotency key migration completed successfully' as status;