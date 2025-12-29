-- FIX RLS RECURSION using a Security Definer function

-- 1. Helper function to check admin role without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- This runs with elevated privileges (security definer), bypassing RLS
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Policies to use the function instead of direct subquery

-- PRODUCTS
DROP POLICY IF EXISTS "Admin Insert Products" ON "products";
CREATE POLICY "Admin Insert Products" ON "products" FOR INSERT WITH CHECK ( is_admin() );

DROP POLICY IF EXISTS "Admin Update Products" ON "products";
CREATE POLICY "Admin Update Products" ON "products" FOR UPDATE USING ( is_admin() );

DROP POLICY IF EXISTS "Admin Delete Products" ON "products";
CREATE POLICY "Admin Delete Products" ON "products" FOR DELETE USING ( is_admin() );

-- ORDERS
DROP POLICY IF EXISTS "Owner Read Orders" ON "orders";
CREATE POLICY "Owner Read Orders" ON "orders" FOR SELECT USING (
  auth.uid() = user_id OR is_admin()
);

-- PROFILES
DROP POLICY IF EXISTS "Read Own Profile" ON "profiles";
CREATE POLICY "Read Profiles" ON "profiles" FOR SELECT USING (
  auth.uid() = id OR is_admin()
);

-- Fix for Order Items read
DROP POLICY IF EXISTS "Owner Read Order Items" ON "order_items";
CREATE POLICY "Owner Read Order Items" ON "order_items" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR is_admin())
  )
);
