-- Migration: Consolidate RLS Policies for Performance
-- This migration consolidates multiple permissive RLS policies into single comprehensive policies
-- to improve performance by reducing the number of policy evaluations per query

-- ============================================================================
-- PROFILES TABLE - Consolidate RLS Policies
-- ============================================================================

-- Drop existing redundant SELECT policies
DROP POLICY IF EXISTS "Read Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Simple Read Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile, admins view all" ON public.profiles;

-- Create single comprehensive SELECT policy
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT
    TO public
    USING (
        -- Users can view their own profile OR admins can view all profiles
        auth.uid() = id OR is_admin()
    );

-- Drop existing redundant UPDATE policies
DROP POLICY IF EXISTS "Only admins can change roles" ON public.profiles;
DROP POLICY IF EXISTS "Simple Update Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Update Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create single comprehensive UPDATE policy with role protection
-- This policy allows users to update their own profile, but prevents role changes
-- Only admins can change roles
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE
    TO public
    USING (
        -- Users can update their own profile OR admins can update any profile
        auth.uid() = id OR is_admin()
    )
    WITH CHECK (
        -- Users can update their own profile but cannot change their role
        -- Admins can update any profile including roles
        (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
        OR is_admin()
    );