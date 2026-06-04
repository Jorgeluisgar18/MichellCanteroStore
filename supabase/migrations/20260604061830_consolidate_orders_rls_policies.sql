-- Consolidate historical order RLS policies and remove direct client writes.
-- Checkout/order creation must go through the Next.js API, where totals,
-- stock reservation, idempotency and payment parameters are validated.

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.orders FROM anon;
REVOKE ALL ON TABLE public.orders FROM authenticated;
REVOKE ALL ON TABLE public.order_items FROM anon;
REVOKE ALL ON TABLE public.order_items FROM authenticated;

GRANT SELECT ON TABLE public.orders TO authenticated;
GRANT SELECT ON TABLE public.order_items TO authenticated;

DROP POLICY IF EXISTS "Admin Delete Orders" ON public.orders;
DROP POLICY IF EXISTS "Admin Update Orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated Insert Orders" ON public.orders;
DROP POLICY IF EXISTS "Only admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Owner Read Orders" ON public.orders;
DROP POLICY IF EXISTS "Users and guests can create orders" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;

DROP POLICY IF EXISTS "Authenticated Insert Order Items" ON public.order_items;
DROP POLICY IF EXISTS "Order items viewable through orders" ON public.order_items;
DROP POLICY IF EXISTS "Owner Read Order Items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert items in own orders" ON public.order_items;

CREATE POLICY "orders_select_own_or_admin"
ON public.orders
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR is_admin()
);

CREATE POLICY "orders_update_admin"
ON public.orders
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "orders_delete_admin"
ON public.orders
FOR DELETE
TO authenticated
USING (is_admin());

CREATE POLICY "order_items_select_own_or_admin"
ON public.order_items
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.orders
        WHERE orders.id = order_items.order_id
            AND (
                orders.user_id = auth.uid()
                OR is_admin()
            )
    )
);
