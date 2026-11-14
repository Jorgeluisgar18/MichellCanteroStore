BEGIN;

CREATE TABLE public.wompi_checkout_attempts (
    order_id uuid PRIMARY KEY REFERENCES public.orders(id),
    issued_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.wompi_payment_exceptions (
    transaction_id text PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES public.orders(id),
    canonical_transaction_id text NOT NULL,
    reason text NOT NULL CHECK (reason = 'duplicate_approved_payment'),
    amount_in_cents bigint NOT NULL CHECK (amount_in_cents > 0),
    currency text NOT NULL CHECK (currency = 'COP'),
    detected_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wompi_checkout_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wompi_payment_exceptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wompi_checkout_attempts, public.wompi_payment_exceptions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.wompi_checkout_attempts, public.wompi_payment_exceptions TO service_role;

CREATE FUNCTION public.claim_wompi_checkout(order_id_param uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE current_order public.orders%ROWTYPE; demand record; held record; expected_variants jsonb;
BEGIN
    SELECT * INTO current_order FROM public.orders WHERE id=order_id_param FOR NO KEY UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('outcome','not_found'); END IF;
    IF current_order.payment_status <> 'pending' OR current_order.status <> 'pending' THEN
        RETURN jsonb_build_object('outcome','processed'); END IF;
    IF EXISTS (SELECT 1 FROM public.wompi_checkout_attempts WHERE order_id=order_id_param) THEN
        RETURN jsonb_build_object('outcome','existing'); END IF;
    PERFORM 1 FROM public.stock_reservations WHERE order_id=order_id_param FOR UPDATE;
    IF NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id=order_id_param)
        OR EXISTS (SELECT 1 FROM public.order_items WHERE order_id=order_id_param AND (product_id IS NULL OR quantity<=0)) THEN
        RETURN jsonb_build_object('outcome','reservation_invalid'); END IF;
    FOR demand IN SELECT product_id,sum(quantity) AS quantity FROM public.order_items
        WHERE order_id=order_id_param GROUP BY product_id LOOP
        IF (SELECT count(*) FROM public.stock_reservations WHERE order_id=order_id_param
            AND product_id=demand.product_id AND status='reserved' AND expires_at>now()) <> 1 THEN
            RETURN jsonb_build_object('outcome','reservation_invalid'); END IF;
        SELECT * INTO held FROM public.stock_reservations WHERE order_id=order_id_param
            AND product_id=demand.product_id AND status='reserved' AND expires_at>now();
        SELECT coalesce(jsonb_object_agg(v.variant_id,v.quantity),'{}'::jsonb) INTO expected_variants
            FROM (SELECT variant_id,sum(quantity) AS quantity FROM public.order_items
                WHERE order_id=order_id_param AND product_id=demand.product_id AND variant_id IS NOT NULL GROUP BY variant_id) v;
        IF held.quantity IS DISTINCT FROM demand.quantity
            OR coalesce(held.variant_quantities,'{}'::jsonb) IS DISTINCT FROM expected_variants THEN
            RETURN jsonb_build_object('outcome','reservation_invalid'); END IF;
    END LOOP;
    IF EXISTS (SELECT 1 FROM public.stock_reservations r WHERE r.order_id=order_id_param AND r.status='reserved'
        AND r.expires_at>now() AND NOT EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id=order_id_param AND i.product_id=r.product_id)) THEN
        RETURN jsonb_build_object('outcome','reservation_invalid'); END IF;
    INSERT INTO public.wompi_checkout_attempts(order_id) VALUES(order_id_param);
    RETURN jsonb_build_object('outcome','issued','total',current_order.total,'order_number',current_order.order_number);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_wompi_checkout(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_wompi_checkout(uuid) TO service_role;

ALTER FUNCTION public.finalize_wompi_payment(uuid,text,text,text,bigint,text) RENAME TO finalize_wompi_payment_before_attempt_guard;
REVOKE ALL ON FUNCTION public.finalize_wompi_payment_before_attempt_guard(uuid,text,text,text,bigint,text) FROM PUBLIC, anon, authenticated, service_role;
CREATE FUNCTION public.finalize_wompi_payment(order_id_param uuid,transaction_id_param text,transaction_status_param text,
    reference_param text,amount_in_cents_param bigint,currency_param text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE current_order public.orders%ROWTYPE;
BEGIN
    SELECT * INTO current_order FROM public.orders WHERE id=order_id_param FOR NO KEY UPDATE;
    IF FOUND AND current_order.payment_status='paid' AND transaction_status_param='APPROVED'
        AND current_order.wompi_transaction_id IS NOT NULL
        AND current_order.wompi_transaction_id IS DISTINCT FROM transaction_id_param
        AND length(transaction_id_param) BETWEEN 1 AND 200 AND reference_param=current_order.order_number
        AND amount_in_cents_param=current_order.total*100 AND currency_param='COP' THEN
        INSERT INTO public.wompi_payment_exceptions(transaction_id,order_id,canonical_transaction_id,reason,amount_in_cents,currency)
            VALUES(transaction_id_param,order_id_param,current_order.wompi_transaction_id,'duplicate_approved_payment',amount_in_cents_param,currency_param)
            ON CONFLICT(transaction_id) DO NOTHING;
        RETURN jsonb_build_object('outcome','conflict','changed',false,'reason','duplicate_approved_payment');
    END IF;
    RETURN public.finalize_wompi_payment_before_attempt_guard(order_id_param,transaction_id_param,transaction_status_param,
        reference_param,amount_in_cents_param,currency_param);
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_wompi_payment(uuid,text,text,text,bigint,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_wompi_payment(uuid,text,text,text,bigint,text) TO service_role;
COMMIT;
