-- Migration: Fix Remaining Audit/Logging Function Search Paths
-- Secures the final 4 audit and logging functions

-- Fix cleanup_old_idempotency_keys function
CREATE OR REPLACE FUNCTION public.cleanup_old_idempotency_keys()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
  UPDATE public.orders
  SET idempotency_key = NULL
  WHERE idempotency_key IS NOT NULL
    AND created_at < NOW() - INTERVAL '30 days';
END;
$function$;

-- Fix log_profile_changes function
CREATE OR REPLACE FUNCTION public.log_profile_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (entity_type, entity_id, action, actor_id, changes)
    VALUES (
      'profile',
      NEW.id,
      'update',
      auth.uid(),
      jsonb_build_object(
        'before', row_to_json(OLD),
        'after', row_to_json(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix log_order_changes function
CREATE OR REPLACE FUNCTION public.log_order_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (entity_type, entity_id, action, actor_id, changes)
    VALUES (
      'order',
      NEW.id,
      'create',
      NEW.user_id,
      jsonb_build_object('data', row_to_json(NEW))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (entity_type, entity_id, action, actor_id, changes)
    VALUES (
      'order',
      NEW.id,
      'update',
      auth.uid(),
      jsonb_build_object(
        'before', row_to_json(OLD),
        'after', row_to_json(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix log_product_changes function (if exists)
-- This function logs changes to products for audit purposes
CREATE OR REPLACE FUNCTION public.log_product_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (entity_type, entity_id, action, actor_id, changes)
    VALUES (
      'product',
      NEW.id,
      'update',
      auth.uid(),
      jsonb_build_object(
        'before', row_to_json(OLD),
        'after', row_to_json(NEW)
      )
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (entity_type, entity_id, action, actor_id, changes)
    VALUES (
      'product',
      NEW.id,
      'create',
      auth.uid(),
      jsonb_build_object('data', row_to_json(NEW))
    );
  END IF;
  RETURN NEW;
END;
$function$;