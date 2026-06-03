-- Migration: Optimize RLS Policies and Fix Performance Issues
-- This migration addresses auth RLS initplan issues and removes duplicate indexes

-- ============================================================================
-- FIX DUPLICATE INDEX
-- ============================================================================

-- Drop duplicate index on audit_log.actor_id
-- Keep idx_audit_log_actor_id (created by our migration) and drop idx_audit_log_actor
DROP INDEX IF EXISTS public.idx_audit_log_actor;

-- ============================================================================
-- OPTIMIZE AUTH RLS POLICIES - Wrap auth functions with SELECT
-- ============================================================================

-- Get all policies that use auth.uid() and need optimization
-- We'll recreate them with (SELECT auth.uid()) pattern

-- ORDERS TABLE - Optimize auth.uid() calls
DROP POLICY IF EXISTS "Users can view own orders, admins view all" ON public.orders;
CREATE POLICY "orders_select_policy" ON public.orders
    FOR SELECT
    TO public
    USING (
        user_id = (SELECT auth.uid()) OR 
        (SELECT public.is_admin())
    );

DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
CREATE POLICY "orders_insert_policy" ON public.orders
    FOR INSERT
    TO public
    WITH CHECK (
        user_id = (SELECT auth.uid()) AND
        (SELECT auth.role()) = 'authenticated'
    );

-- REVIEWS TABLE - Optimize auth.uid() calls
DROP POLICY IF EXISTS "Users can view all reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public Read Reviews" ON public.reviews;
CREATE POLICY "reviews_select_policy" ON public.reviews
    FOR SELECT
    TO public
    USING (true); -- Reviews are public

DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
CREATE POLICY "reviews_insert_policy" ON public.reviews
    FOR INSERT
    TO public
    WITH CHECK (
        user_id = (SELECT auth.uid()) AND
        (SELECT auth.role()) = 'authenticated'
    );

DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "reviews_update_policy" ON public.reviews
    FOR UPDATE
    TO public
    USING (
        user_id = (SELECT auth.uid()) OR
        (SELECT public.is_admin())
    );

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "reviews_delete_policy" ON public.reviews
    FOR DELETE
    TO public
    USING (
        user_id = (SELECT auth.uid()) OR
        (SELECT public.is_admin())
    );

-- PRODUCTS TABLE - Consolidate multiple permissive policies
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
CREATE POLICY "products_select_policy" ON public.products
    FOR SELECT
    TO public
    USING (true); -- Products are public

DROP POLICY IF EXISTS "Admin Update Products" ON public.products;
DROP POLICY IF EXISTS "Only admins can update products" ON public.products;
CREATE POLICY "products_update_policy" ON public.products
    FOR UPDATE
    TO public
    USING ((SELECT public.is_admin()));

-- ADDRESSES TABLE - Optimize auth.uid() calls
DROP POLICY IF EXISTS "Users can view own addresses" ON public.addresses;
CREATE POLICY "addresses_select_policy" ON public.addresses
    FOR SELECT
    TO public
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own addresses" ON public.addresses;
CREATE POLICY "addresses_insert_policy" ON public.addresses
    FOR INSERT
    TO public
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own addresses" ON public.addresses;
CREATE POLICY "addresses_update_policy" ON public.addresses
    FOR UPDATE
    TO public
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own addresses" ON public.addresses;
CREATE POLICY "addresses_delete_policy" ON public.addresses
    FOR DELETE
    TO public
    USING (user_id = (SELECT auth.uid()));