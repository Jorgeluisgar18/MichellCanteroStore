CREATE OR REPLACE FUNCTION confirm_stock_reservation(
    order_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    reservation RECORD;
    rows_updated INTEGER := 0;
    product_rows_updated INTEGER := 0;
BEGIN
    FOR reservation IN
        SELECT id, product_id, quantity
        FROM stock_reservations
        WHERE order_id = order_id_param
            AND status = 'reserved'
        FOR UPDATE
    LOOP
        UPDATE products
        SET stock_quantity = stock_quantity - reservation.quantity,
            in_stock = (stock_quantity - reservation.quantity) > 0,
            updated_at = NOW()
        WHERE id = reservation.product_id
            AND stock_quantity >= reservation.quantity;

        GET DIAGNOSTICS product_rows_updated = ROW_COUNT;

        IF product_rows_updated <> 1 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Insufficient stock while confirming reservation',
                'product_id', reservation.product_id,
                'reservation_id', reservation.id,
                'requested', reservation.quantity
            );
        END IF;

        UPDATE stock_reservations
        SET status = 'confirmed',
            updated_at = NOW()
        WHERE id = reservation.id;

        rows_updated := rows_updated + 1;
    END LOOP;

    IF rows_updated = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No active stock reservation found'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'reservations_confirmed', rows_updated
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;