BEGIN;

ALTER TABLE public.orders
    ADD COLUMN inventory_status text NOT NULL DEFAULT 'unverified'
        CHECK (inventory_status IN ('unverified', 'confirmed', 'review_required')),
    ADD COLUMN inventory_review_reason text;

CREATE FUNCTION public.guard_order_inventory_hold()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    -- Existing advanced legacy orders may be flagged, but held orders cannot advance.
    IF NEW.inventory_status = 'review_required'
        AND NEW.status IN ('processing', 'shipped', 'delivered')
        AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
        RAISE EXCEPTION 'Order inventory requires resolution before fulfillment' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER guard_order_inventory_hold
    BEFORE INSERT OR UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.guard_order_inventory_hold();
REVOKE ALL ON FUNCTION public.guard_order_inventory_hold() FROM PUBLIC, anon, authenticated;

-- Call only after server-side provider verification. All terminal writers share this lock boundary.
CREATE FUNCTION public.finalize_wompi_payment(
    order_id_param uuid,
    transaction_id_param text,
    transaction_status_param text,
    reference_param text,
    amount_in_cents_param bigint,
    currency_param text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    current_order public.orders%ROWTYPE;
    item record;
    reason text;
    demand_count integer;
    confirmed_count integer;
    matching_confirmations boolean;
    changed boolean;
    result_outcome text;
BEGIN
    SELECT * INTO current_order FROM public.orders WHERE id = order_id_param FOR NO KEY UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('outcome', 'not_found', 'changed', false); END IF;
    IF transaction_id_param IS NULL OR length(transaction_id_param) NOT BETWEEN 1 AND 200
        OR reference_param IS DISTINCT FROM current_order.order_number
        OR currency_param IS DISTINCT FROM 'COP'
        OR amount_in_cents_param IS NULL OR amount_in_cents_param <> current_order.total * 100 THEN
        RETURN jsonb_build_object('outcome', 'conflict', 'changed', false);
    END IF;
    IF transaction_status_param IS NULL OR transaction_status_param NOT IN ('APPROVED', 'DECLINED', 'ERROR', 'VOIDED') THEN
        RETURN jsonb_build_object('outcome', 'ignored', 'changed', false);
    END IF;
    IF current_order.payment_status = 'refunded'
        OR (current_order.payment_status = 'paid' AND current_order.wompi_transaction_id IS DISTINCT FROM transaction_id_param) THEN
        RETURN jsonb_build_object('outcome', 'conflict', 'changed', false);
    END IF;
    IF current_order.payment_status = 'paid' AND transaction_status_param <> 'APPROVED' THEN
        RETURN jsonb_build_object('outcome', 'ignored', 'changed', false);
    END IF;
    IF current_order.payment_status = 'paid' AND current_order.inventory_status = 'confirmed' THEN
        RETURN jsonb_build_object('outcome', 'already_finalized', 'changed', false,
            'payment_status', 'paid', 'inventory_status', 'confirmed');
    END IF;

    IF transaction_status_param <> 'APPROVED' THEN
        IF current_order.payment_status = 'failed' AND current_order.wompi_transaction_id = transaction_id_param THEN
            RETURN jsonb_build_object('outcome', 'already_finalized', 'changed', false);
        END IF;
        -- Do not cancel a historically deducted order on a contradictory failure event.
        IF EXISTS (SELECT 1 FROM public.stock_reservations WHERE order_id = order_id_param AND status = 'confirmed') THEN
            RETURN jsonb_build_object('outcome', 'conflict', 'changed', false);
        END IF;
        UPDATE public.stock_reservations SET status = 'released', updated_at = now()
            WHERE order_id = order_id_param AND status = 'reserved';
        UPDATE public.orders SET payment_status = 'failed', status = 'cancelled',
            wompi_transaction_id = transaction_id_param, payment_id = transaction_id_param, updated_at = now()
            WHERE id = order_id_param;
        RETURN jsonb_build_object('outcome', 'finalized', 'changed', true,
            'payment_status', 'failed', 'inventory_status', current_order.inventory_status);
    END IF;

    -- Product-first, stable ordering matches reservation creation and avoids cross-product deadlocks.
    PERFORM p.id FROM public.products p
        WHERE p.id IN (SELECT oi.product_id FROM public.order_items oi WHERE oi.order_id = order_id_param)
        ORDER BY p.id FOR UPDATE;
    PERFORM sr.id FROM public.stock_reservations sr WHERE sr.order_id = order_id_param
        ORDER BY sr.id FOR UPDATE;
    SELECT count(*) INTO demand_count FROM public.order_items WHERE order_id = order_id_param;
    IF demand_count = 0 OR EXISTS (
        SELECT 1 FROM public.order_items oi LEFT JOIN public.products p ON p.id = oi.product_id
        WHERE oi.order_id = order_id_param AND (p.id IS NULL OR oi.quantity IS NULL OR oi.quantity <= 0)
    ) THEN reason := 'invalid_order_items'; END IF;

    SELECT count(*) INTO confirmed_count FROM public.stock_reservations
        WHERE order_id = order_id_param AND status = 'confirmed';
    SELECT NOT EXISTS (
        SELECT 1 FROM
            (SELECT product_id, sum(quantity) quantity FROM public.order_items
                WHERE order_id = order_id_param GROUP BY product_id) demand
            FULL JOIN (SELECT product_id, sum(quantity) quantity FROM public.stock_reservations
                WHERE order_id = order_id_param AND status = 'confirmed' GROUP BY product_id) confirmed
            USING (product_id)
        WHERE demand.quantity IS DISTINCT FROM confirmed.quantity
    ) INTO matching_confirmations;
    IF reason IS NULL AND confirmed_count > 0 AND NOT matching_confirmations THEN
        reason := 'partial_legacy_confirmation';
    END IF;
    IF reason IS NULL AND confirmed_count = 0
        AND current_order.payment_status = 'paid'
        AND (current_order.inventory_status = 'unverified'
            OR current_order.inventory_review_reason IN ('legacy_payment_inventory_unverified', 'partial_legacy_confirmation')) THEN
        -- A retry is not new accounting evidence. Preserve legacy uncertainty until confirmation exists.
        reason := CASE WHEN current_order.inventory_review_reason = 'partial_legacy_confirmation'
            THEN 'partial_legacy_confirmation' ELSE 'legacy_payment_inventory_unverified' END;
    END IF;

    -- Validate the entire basket before making any deductions. Own expired/active holds are not demand.
    IF reason IS NULL AND confirmed_count = 0 THEN
        FOR item IN
            SELECT oi.product_id, sum(oi.quantity) quantity, p.stock_quantity,
                COALESCE((SELECT sum(sr.quantity) FROM public.stock_reservations sr
                    WHERE sr.product_id = oi.product_id AND sr.order_id <> order_id_param
                        AND sr.status = 'reserved' AND sr.expires_at > now()), 0) held
            FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id
            WHERE oi.order_id = order_id_param GROUP BY oi.product_id, p.stock_quantity ORDER BY oi.product_id
        LOOP
            IF item.stock_quantity IS NULL OR item.stock_quantity - item.held < item.quantity THEN
                reason := 'insufficient_available_stock';
                EXIT;
            END IF;
        END LOOP;
    END IF;

    IF reason IS NULL AND confirmed_count = 0 THEN
        UPDATE public.products p SET stock_quantity = p.stock_quantity - demand.quantity,
            in_stock = (p.stock_quantity - demand.quantity > 0), updated_at = now()
        FROM (SELECT product_id, sum(quantity)::integer quantity FROM public.order_items
            WHERE order_id = order_id_param GROUP BY product_id) demand WHERE p.id = demand.product_id;
        UPDATE public.stock_reservations SET status = 'released', updated_at = now()
            WHERE order_id = order_id_param AND status = 'reserved';
        INSERT INTO public.stock_reservations(product_id, order_id, quantity, status, expires_at)
            SELECT product_id, order_id_param, sum(quantity)::integer, 'confirmed', now()
            FROM public.order_items WHERE order_id = order_id_param GROUP BY product_id;
    ELSIF reason IS NOT NULL OR confirmed_count > 0 THEN
        UPDATE public.stock_reservations SET status = 'released', updated_at = now()
            WHERE order_id = order_id_param AND status = 'reserved';
    END IF;
    result_outcome := CASE WHEN reason IS NULL THEN 'finalized' ELSE 'inventory_review' END;
    changed := current_order.payment_status IS DISTINCT FROM 'paid'
        OR current_order.inventory_status IS DISTINCT FROM CASE WHEN reason IS NULL THEN 'confirmed' ELSE 'review_required' END
        OR current_order.inventory_review_reason IS DISTINCT FROM reason;
    UPDATE public.orders SET payment_status = 'paid',
        status = CASE WHEN current_order.status IN ('processing', 'shipped', 'delivered') THEN current_order.status ELSE 'paid' END,
        wompi_transaction_id = transaction_id_param, payment_id = transaction_id_param,
        inventory_status = CASE WHEN reason IS NULL THEN 'confirmed' ELSE 'review_required' END,
        inventory_review_reason = reason, updated_at = now() WHERE id = order_id_param;
    RETURN jsonb_build_object('outcome', result_outcome, 'changed', changed,
        'payment_status', 'paid', 'inventory_status', CASE WHEN reason IS NULL THEN 'confirmed' ELSE 'review_required' END,
        'reason', reason);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.finalize_wompi_payment(uuid, text, text, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_wompi_payment(uuid, text, text, text, bigint, text) TO service_role;

COMMIT;
