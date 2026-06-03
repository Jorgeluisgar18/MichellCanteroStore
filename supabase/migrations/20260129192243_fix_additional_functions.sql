-- Migration: Fix Additional Function Search Paths
-- Fixes remaining 3 functions with mutable search paths

-- Fix ensure_single_default_address function
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.addresses
        SET is_default = false
        WHERE user_id = NEW.user_id
          AND id != NEW.id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$function$;

-- Fix update_product_rating_avg function
CREATE OR REPLACE FUNCTION public.update_product_rating_avg()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
    UPDATE public.products
    SET rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM public.reviews
        WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ),
    review_count = (
        SELECT COUNT(*)
        FROM public.reviews
        WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN NULL;
END;
$function$;

-- Fix decrement_product_stock function
CREATE OR REPLACE FUNCTION public.decrement_product_stock(product_id_param uuid, quantity_param integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  -- Lock the row for update to prevent race conditions
  UPDATE public.products
  SET 
    stock_quantity = stock_quantity - quantity_param,
    in_stock = CASE 
      WHEN stock_quantity - quantity_param <= 0 THEN false
      ELSE in_stock
    END,
    updated_at = NOW()
  WHERE id = product_id_param
    AND stock_quantity >= quantity_param -- Ensure sufficient stock
    AND in_stock = true;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock or product not available';
  END IF;
END;
$function$;