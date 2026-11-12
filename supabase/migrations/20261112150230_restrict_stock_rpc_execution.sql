BEGIN;

-- Stock mutations are server-only. RLS does not protect SECURITY DEFINER RPCs.
REVOKE EXECUTE ON FUNCTION public.reserve_product_stock(uuid, uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_stock_reservation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_stock_reservation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_reservations() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_product_stock(uuid, uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_stock_reservation(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_stock_reservation(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_reservations() TO service_role;

COMMIT;
