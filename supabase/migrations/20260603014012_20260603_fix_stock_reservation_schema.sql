-- =====================================================
-- MIGRATION: Fix stock reservation + schema corrections
-- =====================================================
-- Fecha: 2026-06-03
-- Propósito:
--   1. Corregir la función reserve_product_stock para que maneje
--      errores de forma segura y no rompa el flujo de checkout.
--   2. Asegurar que shipping_address, shipping_city, shipping_state
--      aceptan valores vacíos (caso pickup).
--   3. Permitir que órdenes sean creadas por usuarios no autenticados
--      (compras como invitado) o autenticados.
--   4. Actualizar tarifas de envío en comentarios (referencia).
-- =====================================================

-- =====================================================
-- PARTE 1: Ajuste del schema de la tabla orders
-- =====================================================

-- Hacer shipping_address, shipping_city, shipping_state opcionales
-- (son requeridas solo para delivery, validadas a nivel de API con Zod)
ALTER TABLE public.orders
    ALTER COLUMN shipping_address SET DEFAULT '',
    ALTER COLUMN shipping_city SET DEFAULT '',
    ALTER COLUMN shipping_state SET DEFAULT '',
    ALTER COLUMN shipping_zip_code SET DEFAULT '';

-- Verificar que shipping_zip_code también permite vacío
UPDATE public.orders
    SET shipping_zip_code = ''
    WHERE shipping_zip_code IS NULL;

ALTER TABLE public.orders
    ALTER COLUMN shipping_zip_code SET NOT NULL;

-- =====================================================
-- PARTE 2: Política RLS para permitir órdenes de invitados
-- =====================================================

-- Actualizar la política de INSERT en orders para permitir usuarios autenticados
-- y también usuarios anónimos (invitados) cuando user_id es NULL
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Nueva política: permite insertar si el user_id coincide con el usuario autenticado
-- O si user_id es NULL (compra como invitado)
CREATE POLICY "Users and guests can create orders" ON public.orders
    FOR INSERT
    WITH CHECK (
        user_id IS NULL
        OR auth.uid() = user_id
    );

-- =====================================================
-- PARTE 3: Re-aplicar reserve_product_stock con manejo robusto
-- =====================================================

-- La función ahora tiene manejo de excepciones interno y
-- devuelve success=false en lugar de lanzar una excepción.
-- Esto evita que el backend tenga errores no controlados.
CREATE OR REPLACE FUNCTION reserve_product_stock(
    product_id_param UUID,
    order_id_param UUID,
    quantity_param INTEGER,
    expiration_minutes INTEGER DEFAULT 15
)
RETURNS JSONB AS $$
DECLARE
    available_stock INTEGER;
    reserved_stock INTEGER;
    reservation_id UUID;
    product_exists BOOLEAN;
BEGIN
    -- Verificar que el producto existe
    SELECT EXISTS(SELECT 1 FROM products WHERE id = product_id_param) INTO product_exists;

    IF NOT product_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Product not found'
        );
    END IF;

    -- Obtener stock actual con bloqueo para evitar race conditions
    SELECT stock_quantity INTO available_stock
    FROM products
    WHERE id = product_id_param
    FOR UPDATE;

    -- Calcular stock ya reservado (no confirmado ni liberado, no expirado)
    SELECT COALESCE(SUM(quantity), 0) INTO reserved_stock
    FROM stock_reservations
    WHERE product_id = product_id_param
        AND status = 'reserved'
        AND expires_at > NOW();

    -- Verificar disponibilidad
    IF available_stock - reserved_stock < quantity_param THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient stock',
            'available', available_stock - reserved_stock,
            'requested', quantity_param
        );
    END IF;

    -- Crear la reserva
    INSERT INTO stock_reservations (
        product_id,
        order_id,
        quantity,
        status,
        expires_at
    ) VALUES (
        product_id_param,
        order_id_param,
        quantity_param,
        'reserved',
        NOW() + (expiration_minutes || ' minutes')::INTERVAL
    )
    RETURNING id INTO reservation_id;

    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', reservation_id,
        'expires_at', NOW() + (expiration_minutes || ' minutes')::INTERVAL
    );

EXCEPTION WHEN OTHERS THEN
    -- Capturar cualquier excepción inesperada y devolver error controlado
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- PARTE 4: Re-aplicar confirm_stock_reservation
-- =====================================================

CREATE OR REPLACE FUNCTION confirm_stock_reservation(
    order_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
    reservation RECORD;
    rows_updated INTEGER := 0;
BEGIN
    FOR reservation IN
        SELECT id, product_id, quantity
        FROM stock_reservations
        WHERE order_id = order_id_param
            AND status = 'reserved'
    LOOP
        UPDATE stock_reservations
        SET status = 'confirmed',
            updated_at = NOW()
        WHERE id = reservation.id;

        UPDATE products
        SET stock_quantity = GREATEST(0, stock_quantity - reservation.quantity),
            updated_at = NOW()
        WHERE id = reservation.product_id;

        rows_updated := rows_updated + 1;
    END LOOP;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- PARTE 5: Re-aplicar release_stock_reservation
-- =====================================================

CREATE OR REPLACE FUNCTION release_stock_reservation(
    order_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    UPDATE stock_reservations
    SET status = 'released',
        updated_at = NOW()
    WHERE order_id = order_id_param
        AND status = 'reserved';

    GET DIAGNOSTICS rows_updated = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'reservations_released', rows_updated
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- PARTE 6: Asegurar que la tabla stock_reservations existe
-- (idempotente — no falla si ya existe)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.stock_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status TEXT DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'released')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_reservations_product_id ON public.stock_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_order_id ON public.stock_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON public.stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires_at ON public.stock_reservations(expires_at) WHERE status = 'reserved';

ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all reservations" ON public.stock_reservations;
CREATE POLICY "Admins can view all reservations" ON public.stock_reservations
    FOR SELECT
    USING (is_admin());

-- Trigger updated_at para stock_reservations
DROP TRIGGER IF EXISTS update_stock_reservations_updated_at ON public.stock_reservations;
CREATE TRIGGER update_stock_reservations_updated_at
    BEFORE UPDATE ON public.stock_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PARTE 7: Confirmar tarifas de referencia (informativo)
-- =====================================================
-- Las tarifas reales se gestionan desde lib/config.ts en el backend Next.js.
-- Este comentario es solo de referencia:
--   Ciénaga:           $4.000 COP
--   Santa Marta:       $10.000 COP
--   Resto de Colombia: $16.000 COP
--   Retiro en tienda:  Gratis
--   Envío gratis:      Compras >= $200.000 COP

SELECT 'Migration 20260603_fix_stock_reservation_schema completed successfully' AS status;