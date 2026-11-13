BEGIN;

ALTER TABLE public.products ADD COLUMN inventory_version integer NOT NULL DEFAULT 0 CHECK (inventory_version >= 0);
-- NULL means historical/unattributed inventory, not an empty allocation.
ALTER TABLE public.stock_reservations ADD COLUMN variant_quantities jsonb
    CHECK (variant_quantities IS NULL OR jsonb_typeof(variant_quantities) = 'object');

CREATE FUNCTION public.variant_inventory_total(catalog jsonb) RETURNS integer
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v jsonb; ids text[] := '{}'; quantity numeric; total bigint := 0;
BEGIN
    IF catalog IS NULL OR catalog = 'null'::jsonb THEN RETURN 0; END IF;
    IF jsonb_typeof(catalog) <> 'array' THEN RETURN NULL; END IF;
    FOR v IN SELECT value FROM jsonb_array_elements(catalog) LOOP
        IF jsonb_typeof(v) IS DISTINCT FROM 'object'
            OR jsonb_typeof(v->'id') IS DISTINCT FROM 'string'
            OR length(btrim(v->>'id')) NOT BETWEEN 1 AND 200
            OR jsonb_typeof(v->'name') IS DISTINCT FROM 'string' OR length(btrim(v->>'name')) = 0
            OR jsonb_typeof(v->'stock_quantity') IS DISTINCT FROM 'number'
            OR jsonb_typeof(v->'inStock') IS DISTINCT FROM 'boolean'
            OR (v->>'id') = ANY(ids) THEN RETURN NULL; END IF;
        quantity := (v->>'stock_quantity')::numeric;
        IF quantity < 0 OR quantity > 2147483647 OR quantity <> trunc(quantity) THEN RETURN NULL; END IF;
        IF (v->>'inStock')::boolean IS DISTINCT FROM (quantity > 0)
            OR (v ? 'priceModifier' AND v->'priceModifier' <> 'null'::jsonb
                AND jsonb_typeof(v->'priceModifier') IS DISTINCT FROM 'number') THEN RETURN NULL; END IF;
        total := total + quantity::bigint;
        IF total > 2147483647 THEN RETURN NULL; END IF;
        ids := array_append(ids, v->>'id');
    END LOOP;
    RETURN total::integer;
EXCEPTION WHEN numeric_value_out_of_range OR invalid_text_representation THEN RETURN NULL;
END;
$$;

CREATE FUNCTION public.variant_held_quantity(product_param uuid, variant_param text, excluded_order uuid DEFAULT NULL)
RETURNS bigint LANGUAGE sql STABLE SET search_path = '' AS $$
    SELECT COALESCE(sum(CASE
        WHEN sr.variant_quantities IS NULL OR sr.variant_quantities = '{}'::jsonb THEN sr.quantity
        WHEN NOT (sr.variant_quantities ? variant_param) THEN 0
        WHEN jsonb_typeof(sr.variant_quantities->variant_param) IS DISTINCT FROM 'number' THEN sr.quantity
        WHEN (sr.variant_quantities->>variant_param)::numeric BETWEEN 0 AND 2147483647
            AND (sr.variant_quantities->>variant_param)::numeric = trunc((sr.variant_quantities->>variant_param)::numeric)
            THEN (sr.variant_quantities->>variant_param)::bigint
        ELSE sr.quantity END), 0)::bigint
    FROM public.stock_reservations sr WHERE sr.product_id = product_param
        AND sr.status = 'reserved' AND sr.expires_at > now()
        AND (excluded_order IS NULL OR sr.order_id <> excluded_order);
$$;

CREATE FUNCTION public.variant_selection_failure(product_param uuid, requested jsonb, excluded_order uuid DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE p public.products%ROWTYPE; total integer; demand record; selected jsonb;
BEGIN
    SELECT * INTO p FROM public.products WHERE id = product_param;
    IF NOT FOUND THEN RETURN 'variant_product_missing'; END IF;
    total := public.variant_inventory_total(p.variants);
    IF total IS NULL THEN RETURN 'invalid_variant_catalog'; END IF;
    IF p.variants IS NULL OR p.variants = 'null'::jsonb OR p.variants = '[]'::jsonb THEN
        IF EXISTS (SELECT 1 FROM jsonb_to_recordset(requested) AS i(variant_id text) WHERE i.variant_id IS NOT NULL)
            THEN RETURN 'unknown_variant'; END IF;
        RETURN NULL;
    END IF;
    IF p.stock_quantity IS DISTINCT FROM total THEN RETURN 'variant_inventory_inconsistent'; END IF;
    FOR demand IN SELECT i.variant_id, sum(i.quantity) quantity
        FROM jsonb_to_recordset(requested) AS i(variant_id text, quantity integer) GROUP BY i.variant_id
    LOOP
        IF demand.variant_id IS NULL OR demand.variant_id = '' THEN RETURN 'variant_selection_required'; END IF;
        SELECT value INTO selected FROM jsonb_array_elements(p.variants) WHERE value->>'id' = demand.variant_id;
        IF NOT FOUND THEN RETURN 'unknown_variant'; END IF;
        IF selected->'inStock' IS DISTINCT FROM 'true'::jsonb OR (selected->>'stock_quantity')::integer <= 0
            OR demand.quantity > (selected->>'stock_quantity')::integer
                - public.variant_held_quantity(product_param, demand.variant_id, excluded_order)
            THEN RETURN 'insufficient_variant_stock'; END IF;
    END LOOP;
    RETURN NULL;
END;
$$;

CREATE FUNCTION public.guard_product_inventory() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE held bigint; total integer; v jsonb;
BEGIN
    IF NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity OR NEW.variants IS DISTINCT FROM OLD.variants
        OR NEW.in_stock IS DISTINCT FROM OLD.in_stock THEN
        SELECT COALESCE(sum(quantity),0) INTO held FROM public.stock_reservations
            WHERE product_id = NEW.id AND status = 'reserved' AND expires_at > now();
        IF NEW.stock_quantity IS NULL OR NEW.stock_quantity < held THEN
            RAISE EXCEPTION 'inventory: stock cannot be reduced below active reservations' USING ERRCODE = '23514';
        END IF;
        IF NEW.variants IS DISTINCT FROM OLD.variants THEN
            total := public.variant_inventory_total(NEW.variants);
            IF total IS NULL THEN RAISE EXCEPTION 'inventory: invalid variant catalog' USING ERRCODE = '23514'; END IF;
            IF NEW.variants IS NOT NULL AND NEW.variants <> 'null'::jsonb AND NEW.variants <> '[]'::jsonb THEN
                IF total IS DISTINCT FROM NEW.stock_quantity THEN
                    RAISE EXCEPTION 'inventory: aggregate must equal variant quantities' USING ERRCODE = '23514';
                END IF;
                FOR v IN SELECT value FROM jsonb_array_elements(NEW.variants) LOOP
                    IF (v->>'stock_quantity')::integer < public.variant_held_quantity(NEW.id, v->>'id')
                        OR (public.variant_held_quantity(NEW.id, v->>'id') > 0 AND v->'inStock' <> 'true'::jsonb) THEN
                        RAISE EXCEPTION 'inventory: variant has active reservations' USING ERRCODE = '23514';
                    END IF;
                END LOOP;
                IF EXISTS (
                    SELECT 1 FROM public.stock_reservations sr CROSS JOIN LATERAL jsonb_each(COALESCE(sr.variant_quantities, '{}'::jsonb)) a
                    WHERE sr.product_id = NEW.id AND sr.status = 'reserved' AND sr.expires_at > now()
                        AND a.value <> '0'::jsonb AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.variants) n WHERE n->>'id' = a.key)
                ) THEN RAISE EXCEPTION 'inventory: a reserved variant cannot be removed' USING ERRCODE = '23514'; END IF;
            ELSIF held > 0 AND OLD.variants IS NOT NULL AND OLD.variants <> '[]'::jsonb THEN
                RAISE EXCEPTION 'inventory: reserved variants cannot be removed' USING ERRCODE = '23514';
            END IF;
        END IF;
        NEW.inventory_version := OLD.inventory_version + 1;
    ELSE NEW.inventory_version := OLD.inventory_version;
    END IF;
    RETURN NEW;
END;
$$;
-- Runs after the existing tr_update_product_in_stock normalization trigger.
CREATE TRIGGER zz_product_inventory_guard BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.guard_product_inventory();

ALTER FUNCTION public.create_order_with_stock(jsonb,jsonb) RENAME TO create_order_with_stock_product_only;
REVOKE ALL ON FUNCTION public.create_order_with_stock_product_only(jsonb,jsonb) FROM PUBLIC, anon, authenticated, service_role;
CREATE FUNCTION public.create_order_with_stock(order_param jsonb, items_param jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE demand record; failure text; result jsonb; normalized jsonb := '[]'; entry jsonb; label text;
BEGIN
    IF jsonb_typeof(items_param) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid items' USING ERRCODE='22023'; END IF;
    PERFORM p.id FROM public.products p WHERE p.id IN (
        SELECT i.product_id FROM jsonb_to_recordset(items_param) AS i(product_id uuid)) ORDER BY p.id FOR UPDATE;
    FOR demand IN SELECT i.product_id, jsonb_agg(to_jsonb(i)) items
        FROM jsonb_to_recordset(items_param) AS i(product_id uuid, variant_id text, quantity integer) GROUP BY i.product_id
    LOOP
        failure := public.variant_selection_failure(demand.product_id, demand.items);
        IF failure IS NOT NULL THEN RAISE EXCEPTION 'Invalid variant selection or inventory' USING ERRCODE='P0003', DETAIL=failure; END IF;
    END LOOP;
    FOR entry IN SELECT value FROM jsonb_array_elements(items_param) LOOP
        label := NULL;
        IF entry->>'variant_id' IS NOT NULL THEN
            SELECT v->>'name' INTO label FROM public.products p CROSS JOIN LATERAL jsonb_array_elements(p.variants) v
                WHERE p.id = (entry->>'product_id')::uuid AND v->>'id' = entry->>'variant_id';
        END IF;
        normalized := normalized || jsonb_build_array(entry || jsonb_build_object('variant_name', label));
    END LOOP;
    result := public.create_order_with_stock_product_only(order_param, normalized);
    UPDATE public.stock_reservations sr SET variant_quantities = COALESCE((
        SELECT jsonb_object_agg(d.variant_id, d.quantity) FROM (
            SELECT oi.variant_id, sum(oi.quantity) quantity FROM public.order_items oi
            WHERE oi.order_id = sr.order_id AND oi.product_id = sr.product_id AND oi.variant_id IS NOT NULL GROUP BY oi.variant_id
        ) d), '{}'::jsonb) WHERE sr.order_id = (result->'order'->>'id')::uuid AND sr.status='reserved';
    RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock(jsonb,jsonb) TO service_role;
REVOKE EXECUTE ON FUNCTION public.create_order_with_stock(jsonb,jsonb) FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.finalize_wompi_payment(uuid,text,text,text,bigint,text) RENAME TO finalize_wompi_payment_product_only;
REVOKE ALL ON FUNCTION public.finalize_wompi_payment_product_only(uuid,text,text,text,bigint,text) FROM PUBLIC, anon, authenticated, service_role;
CREATE FUNCTION public.finalize_wompi_payment(order_id_param uuid, transaction_id_param text, transaction_status_param text,
    reference_param text, amount_in_cents_param bigint, currency_param text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE current_order public.orders%ROWTYPE; demand record; result jsonb; failure text; candidate text;
    had_confirmed boolean; known_variant_confirmation boolean; uses_variants boolean;
BEGIN
    IF transaction_status_param IS DISTINCT FROM 'APPROVED' THEN
        RETURN public.finalize_wompi_payment_product_only(order_id_param,transaction_id_param,transaction_status_param,reference_param,amount_in_cents_param,currency_param);
    END IF;
    SELECT * INTO current_order FROM public.orders WHERE id=order_id_param FOR NO KEY UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('outcome','not_found','changed',false); END IF;
    PERFORM p.id FROM public.products p WHERE p.id IN (SELECT product_id FROM public.order_items WHERE order_id=order_id_param)
        ORDER BY p.id FOR UPDATE;
    PERFORM sr.id FROM public.stock_reservations sr WHERE sr.order_id=order_id_param ORDER BY sr.id FOR UPDATE;
    SELECT EXISTS(SELECT 1 FROM public.stock_reservations WHERE order_id=order_id_param AND status='confirmed'),
        EXISTS(SELECT 1 FROM public.order_items WHERE order_id=order_id_param AND variant_id IS NOT NULL)
        INTO had_confirmed, uses_variants;
    SELECT NOT EXISTS (
        SELECT 1 FROM (SELECT oi.product_id, jsonb_object_agg(oi.variant_id,oi.quantity) allocations FROM (
            SELECT product_id, variant_id, sum(quantity) quantity FROM public.order_items
            WHERE order_id=order_id_param AND variant_id IS NOT NULL GROUP BY product_id,variant_id) oi GROUP BY oi.product_id) need
        WHERE NOT EXISTS (SELECT 1 FROM public.stock_reservations sr WHERE sr.order_id=order_id_param
            AND sr.product_id=need.product_id AND sr.status='confirmed' AND sr.variant_quantities=need.allocations)
    ) INTO known_variant_confirmation;
    IF current_order.payment_status='paid' AND current_order.inventory_status='confirmed'
        AND (NOT uses_variants OR known_variant_confirmation) THEN
        RETURN public.finalize_wompi_payment_product_only(order_id_param,transaction_id_param,transaction_status_param,reference_param,amount_in_cents_param,currency_param);
    END IF;
    IF current_order.inventory_review_reason='legacy_variant_inventory_unverified'
        OR (uses_variants AND current_order.payment_status='paid' AND (
            current_order.inventory_status='unverified'
            OR current_order.inventory_review_reason IN ('legacy_payment_inventory_unverified','partial_legacy_confirmation')))
        OR (uses_variants AND had_confirmed AND NOT known_variant_confirmation) THEN
        failure := 'legacy_variant_inventory_unverified';
    ELSIF NOT had_confirmed THEN
        FOR demand IN SELECT oi.product_id, jsonb_agg(jsonb_build_object('variant_id',oi.variant_id,'quantity',oi.quantity)) items
            FROM public.order_items oi WHERE oi.order_id=order_id_param GROUP BY oi.product_id
        LOOP
            candidate := public.variant_selection_failure(demand.product_id,demand.items,order_id_param);
            IF candidate IS NOT NULL THEN failure:=candidate; EXIT; END IF;
        END LOOP;
    END IF;
    BEGIN
        -- Release only this order's holds inside the subtransaction; total-stock guards now see other buyers only.
        UPDATE public.stock_reservations SET status='released',updated_at=now() WHERE order_id=order_id_param AND status='reserved';
        result := public.finalize_wompi_payment_product_only(order_id_param,transaction_id_param,transaction_status_param,reference_param,amount_in_cents_param,currency_param);
        IF result->>'payment_status'='paid' AND failure IS NOT NULL THEN RAISE EXCEPTION 'variant inventory hold' USING ERRCODE='PZ001'; END IF;
        IF result->>'outcome' NOT IN ('finalized','inventory_review') OR result->>'payment_status' IS DISTINCT FROM 'paid' THEN
            RAISE EXCEPTION 'no inventory transition' USING ERRCODE='PZ002';
        END IF;
        IF result->>'outcome'='finalized' AND NOT had_confirmed AND result->>'inventory_status'='confirmed' THEN
            FOR demand IN SELECT oi.product_id, jsonb_object_agg(oi.variant_id,oi.quantity) allocations FROM (
                SELECT product_id,variant_id,sum(quantity) quantity FROM public.order_items
                WHERE order_id=order_id_param AND variant_id IS NOT NULL GROUP BY product_id,variant_id) oi GROUP BY oi.product_id
            LOOP
                UPDATE public.products p SET variants=(SELECT jsonb_agg(
                    CASE WHEN demand.allocations ? (v.value->>'id') THEN v.value || jsonb_build_object(
                        'stock_quantity',(v.value->>'stock_quantity')::integer-(demand.allocations->>(v.value->>'id'))::integer,
                        'inStock',((v.value->>'stock_quantity')::integer-(demand.allocations->>(v.value->>'id'))::integer)>0)
                    ELSE v.value END ORDER BY v.position)
                    FROM jsonb_array_elements(p.variants) WITH ORDINALITY v(value,position)) WHERE p.id=demand.product_id;
            END LOOP;
            UPDATE public.stock_reservations sr SET variant_quantities=COALESCE((SELECT jsonb_object_agg(x.variant_id,x.quantity) FROM (
                SELECT variant_id,sum(quantity) quantity FROM public.order_items WHERE order_id=order_id_param
                    AND product_id=sr.product_id AND variant_id IS NOT NULL GROUP BY variant_id) x),'{}'::jsonb)
                WHERE sr.order_id=order_id_param AND sr.status='confirmed';
        END IF;
        RETURN result;
    EXCEPTION WHEN SQLSTATE 'PZ002' THEN RETURN result;
    WHEN SQLSTATE 'PZ001' THEN
        UPDATE public.stock_reservations SET status='released',updated_at=now() WHERE order_id=order_id_param AND status='reserved';
        UPDATE public.orders SET payment_status='paid', inventory_status='review_required', inventory_review_reason=failure,
            status=CASE WHEN status IN ('processing','shipped','delivered') THEN status ELSE 'paid' END,
            wompi_transaction_id=transaction_id_param,payment_id=transaction_id_param,updated_at=now() WHERE id=order_id_param;
        RETURN jsonb_build_object('outcome','inventory_review','changed',
            current_order.payment_status IS DISTINCT FROM 'paid' OR current_order.inventory_review_reason IS DISTINCT FROM failure,
            'payment_status','paid','inventory_status','review_required','reason',failure);
    END;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.finalize_wompi_payment(uuid,text,text,text,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_wompi_payment(uuid,text,text,text,bigint,text) TO service_role;

-- Legacy mutation entry points cannot bypass variant attribution.
CREATE OR REPLACE FUNCTION public.decrement_product_stock(product_id_param uuid,quantity_param integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.products%ROWTYPE;
BEGIN
    SELECT * INTO p FROM public.products WHERE id=product_id_param FOR UPDATE;
    IF public.variant_inventory_total(p.variants) IS NULL OR (p.variants IS NOT NULL AND p.variants NOT IN ('[]'::jsonb,'null'::jsonb)) THEN
        RAISE EXCEPTION 'Variant inventory requires verified finalization';
    END IF;
    IF quantity_param IS NULL OR quantity_param<=0 THEN RAISE EXCEPTION 'Invalid stock quantity'; END IF;
    UPDATE public.products SET stock_quantity=stock_quantity-quantity_param,
        in_stock=CASE WHEN stock_quantity-quantity_param<=0 THEN false ELSE in_stock END,updated_at=now()
        WHERE id=product_id_param AND stock_quantity>=quantity_param AND in_stock=true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock or product not available'; END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.decrement_product_stock(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_product_stock(uuid,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_stock_reservation(order_id_param uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE demand record; count_confirmed integer;
BEGIN
    PERFORM p.id FROM public.products p WHERE p.id IN (SELECT product_id FROM public.stock_reservations
        WHERE order_id=order_id_param AND status='reserved') ORDER BY p.id FOR UPDATE;
    PERFORM id FROM public.stock_reservations WHERE order_id=order_id_param ORDER BY id FOR UPDATE;
    IF EXISTS(SELECT 1 FROM public.stock_reservations WHERE order_id=order_id_param AND status='confirmed') THEN
        RETURN jsonb_build_object('success',false,'error','Confirmed inventory requires payment reconciliation');
    END IF;
    IF EXISTS(SELECT 1 FROM public.products p JOIN public.stock_reservations sr ON sr.product_id=p.id
        WHERE sr.order_id=order_id_param AND sr.status='reserved' AND p.variants IS NOT NULL AND p.variants<>'[]'::jsonb AND p.variants<>'null'::jsonb) THEN
        RETURN jsonb_build_object('success',false,'error','Variant inventory requires verified finalization');
    END IF;
    IF EXISTS(SELECT 1 FROM public.stock_reservations WHERE order_id=order_id_param AND status='reserved' AND expires_at<=now()) THEN
        UPDATE public.stock_reservations SET status='released',updated_at=now() WHERE order_id=order_id_param AND status='reserved' AND expires_at<=now();
        RETURN jsonb_build_object('success',false,'error','Stock reservation expired');
    END IF;
    FOR demand IN SELECT sr.product_id,sum(sr.quantity) quantity FROM public.stock_reservations sr
        WHERE sr.order_id=order_id_param AND sr.status='reserved' GROUP BY sr.product_id
    LOOP
        IF NOT EXISTS(SELECT 1 FROM public.products p WHERE p.id=demand.product_id AND p.stock_quantity >= (
            SELECT COALESCE(sum(quantity),0) FROM public.stock_reservations WHERE product_id=demand.product_id AND status='reserved' AND expires_at>now())) THEN
            RETURN jsonb_build_object('success',false,'error','Insufficient stock while confirming reservation');
        END IF;
    END LOOP;
    WITH changed AS (UPDATE public.stock_reservations SET status='confirmed',updated_at=now()
        WHERE order_id=order_id_param AND status='reserved' RETURNING id) SELECT count(*) INTO count_confirmed FROM changed;
    IF count_confirmed=0 THEN RETURN jsonb_build_object('success',false,'error','No active stock reservation found'); END IF;
    UPDATE public.products p SET stock_quantity=p.stock_quantity-d.quantity,in_stock=(p.stock_quantity-d.quantity)>0,updated_at=now()
        FROM (SELECT product_id,sum(quantity)::integer quantity FROM public.stock_reservations WHERE order_id=order_id_param AND status='confirmed' GROUP BY product_id) d
        WHERE p.id=d.product_id;
    RETURN jsonb_build_object('success',true,'reservations_confirmed',count_confirmed);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success',false,'error','Stock confirmation failed');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.confirm_stock_reservation(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_stock_reservation(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.variant_inventory_total(jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.variant_held_quantity(uuid,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.variant_selection_failure(uuid,jsonb,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_product_inventory() FROM PUBLIC,anon,authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
