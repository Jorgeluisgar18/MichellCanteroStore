BEGIN;

-- The server validates ownership, shipping and request shape before calling this RPC.
CREATE FUNCTION public.create_order_with_stock(order_param jsonb, items_param jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    input record;
    item record;
    demand record;
    product public.products%ROWTYPE;
    created_order public.orders%ROWTYPE;
    variant jsonb;
    expected_price numeric;
    calculated_subtotal numeric := 0;
    reservation jsonb;
    returned_items jsonb := '[]'::jsonb;
BEGIN
    IF jsonb_typeof(order_param) IS DISTINCT FROM 'object'
        OR jsonb_typeof(items_param) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Invalid order creation input' USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(items_param) NOT BETWEEN 1 AND 50 THEN
        RAISE EXCEPTION 'Invalid order item count' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO input FROM jsonb_to_record(order_param) AS o(
        user_id uuid, order_number text, subtotal numeric, shipping numeric, total numeric,
        shipping_name text, shipping_email text, shipping_phone text, shipping_address text,
        shipping_city text, shipping_state text, shipping_zip_code text,
        payment_method text, customer_notes text, idempotency_key text, shipping_method text, shipping_location text
    );

    -- Lock the whole basket in deterministic order before creating any holds.
    PERFORM p.id FROM public.products p
        WHERE p.id IN (SELECT i.product_id FROM jsonb_to_recordset(items_param) AS i(product_id uuid))
        ORDER BY p.id FOR UPDATE;
    FOR item IN SELECT * FROM jsonb_to_recordset(items_param) AS i(
        product_id uuid, product_name text, product_price numeric, quantity integer, variant_id text
    ) LOOP
        IF item.product_id IS NULL OR item.quantity IS NULL OR item.quantity NOT BETWEEN 1 AND 100 THEN
            RAISE EXCEPTION 'Invalid order item' USING ERRCODE = '22023';
        END IF;
        SELECT * INTO product FROM public.products WHERE id = item.product_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Catalog changed before order creation' USING ERRCODE = 'P0002';
        END IF;
        IF product.in_stock IS DISTINCT FROM true OR product.stock_quantity IS NULL THEN
            RAISE EXCEPTION 'Stock reservation failed' USING ERRCODE = 'P0001';
        END IF;
        expected_price := product.price;
        IF item.variant_id IS NOT NULL THEN
            SELECT v.value INTO variant FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(product.variants) = 'array' THEN product.variants ELSE '[]'::jsonb END
            ) WITH ORDINALITY v(value, position)
            WHERE v.value->>'id' = item.variant_id ORDER BY v.position LIMIT 1;
            IF jsonb_typeof(variant->'priceModifier') = 'number' THEN
                expected_price := expected_price + (variant->>'priceModifier')::numeric;
            END IF;
        END IF;
        -- Tolerate serialization noise from JS addition, not monetary price changes.
        IF item.product_name IS DISTINCT FROM product.name OR item.product_price IS NULL
            OR expected_price IS NULL OR abs(item.product_price - expected_price) > 0.0000001 THEN
            RAISE EXCEPTION 'Catalog changed before order creation' USING ERRCODE = 'P0002';
        END IF;
        calculated_subtotal := calculated_subtotal + item.product_price * item.quantity;
    END LOOP;
    IF round(input.subtotal, 2) IS DISTINCT FROM round(calculated_subtotal, 2)
        OR input.shipping IS NULL OR input.shipping < 0
        OR round(input.total, 2) IS DISTINCT FROM round(calculated_subtotal + input.shipping, 2) THEN
        RAISE EXCEPTION 'Order totals do not match its items' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.orders(user_id, order_number, status, payment_status, subtotal, tax, shipping, total,
        shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city, shipping_state,
        shipping_zip_code, payment_method, customer_notes, idempotency_key, shipping_method, shipping_location)
    VALUES(input.user_id, input.order_number, 'pending', 'pending', input.subtotal, 0, input.shipping, input.total,
        input.shipping_name, input.shipping_email, input.shipping_phone, input.shipping_address, input.shipping_city,
        input.shipping_state, input.shipping_zip_code, input.payment_method, input.customer_notes,
        input.idempotency_key, input.shipping_method, input.shipping_location)
    RETURNING * INTO created_order;

    FOR demand IN SELECT i.product_id, sum(i.quantity)::integer quantity
        FROM jsonb_to_recordset(items_param) AS i(product_id uuid, quantity integer)
        GROUP BY i.product_id ORDER BY i.product_id
    LOOP
        reservation := public.reserve_product_stock(demand.product_id, created_order.id, demand.quantity, 30);
        -- The legacy helper catches exceptions and returns JSON: raise here to roll back the whole basket.
        IF reservation->>'success' IS DISTINCT FROM 'true' THEN
            RAISE EXCEPTION 'Stock reservation failed' USING ERRCODE = 'P0001';
        END IF;
    END LOOP;

    FOR item IN SELECT * FROM jsonb_to_recordset(items_param) AS i(
        product_id uuid, product_name text, product_price numeric, product_image text,
        quantity integer, variant_name text, variant_id text
    ) LOOP
        INSERT INTO public.order_items(order_id, product_id, product_name, product_price, product_image,
            quantity, variant_name, variant_id, subtotal)
        VALUES(created_order.id, item.product_id, item.product_name, item.product_price, item.product_image,
            item.quantity, item.variant_name, item.variant_id, item.product_price * item.quantity);
        returned_items := returned_items || jsonb_build_array(jsonb_build_object(
            'order_id', created_order.id, 'product_id', item.product_id, 'product_name', item.product_name,
            'product_price', item.product_price, 'product_image', item.product_image, 'quantity', item.quantity,
            'variant_name', item.variant_name, 'variant_id', item.variant_id, 'subtotal', item.product_price * item.quantity
        ));
    END LOOP;
    RETURN jsonb_build_object('order', to_jsonb(created_order), 'items', returned_items);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_order_with_stock(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock(jsonb, jsonb) TO service_role;

COMMIT;
