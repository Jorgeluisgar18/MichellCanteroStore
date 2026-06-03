-- Migration: Add Foreign Key Indexes for Performance
-- This migration adds covering indexes for all foreign key constraints
-- to improve query performance and resolve the 36 unindexed foreign key warnings

-- Indexes for order_items table
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id 
ON public.order_items(product_id);

-- Indexes for reviews table
CREATE INDEX IF NOT EXISTS idx_reviews_product_id 
ON public.reviews(product_id);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id 
ON public.reviews(user_id);

-- Indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_user_id 
ON public.orders(user_id);

-- Indexes for audit_log table
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id 
ON public.audit_log(actor_id);

-- Index for profiles table (foreign key to auth.users)
CREATE INDEX IF NOT EXISTS idx_profiles_id 
ON public.profiles(id);

-- Additional composite indexes for common query patterns
-- These help with JOIN operations and WHERE clauses

-- For order queries with user filtering
CREATE INDEX IF NOT EXISTS idx_orders_user_created 
ON public.orders(user_id, created_at DESC);

-- For product reviews with rating filtering
CREATE INDEX IF NOT EXISTS idx_reviews_product_rating 
ON public.reviews(product_id, rating DESC);

-- For audit log queries by entity
CREATE INDEX IF NOT EXISTS idx_audit_log_entity 
ON public.audit_log(entity_type, entity_id, created_at DESC);

-- For order items with product lookups
CREATE INDEX IF NOT EXISTS idx_order_items_order_product 
ON public.order_items(order_id, product_id);