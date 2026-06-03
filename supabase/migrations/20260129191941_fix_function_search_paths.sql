-- Migration: Fix Function Search Paths for Security
-- This migration fixes the mutable search_path security warnings
-- by setting search_path to empty string in all affected functions

-- Fix greater_than_zero function
CREATE OR REPLACE FUNCTION public.greater_than_zero(val integer)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
    IF val < 0 THEN
        RETURN 0;
    ELSE
        RETURN val;
    END IF;
END;
$function$;

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$function$;

-- Fix update_product_in_stock_status function
CREATE OR REPLACE FUNCTION public.update_product_in_stock_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
    IF NEW.stock_quantity <= 0 THEN
        NEW.in_stock := false;
    ELSE
        NEW.in_stock := true;
    END IF;
    RETURN NEW;
END;
$function$;

-- Fix ensure_single_admin function (if exists)
-- This function ensures there's always at least one admin
CREATE OR REPLACE FUNCTION public.ensure_single_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
    admin_count INTEGER;
BEGIN
    -- Count remaining admins
    SELECT COUNT(*) INTO admin_count
    FROM public.profiles
    WHERE role = 'admin' AND id != OLD.id;
    
    -- Prevent deletion/role change if this is the last admin
    IF admin_count = 0 THEN
        RAISE EXCEPTION 'Cannot remove the last admin user';
    END IF;
    
    RETURN NEW;
END;
$function$;