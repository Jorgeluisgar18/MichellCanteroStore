-- =====================================================
-- MIGRATION: Stock Reservation System
-- =====================================================
-- This migration adds stock reservation to prevent overselling
-- Date: 2026-01-29
-- =====================================================

-- Create stock_reservations table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_reservations_product_id ON public.stock_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_order_id ON public.stock_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON public.stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires_at ON public.stock_reservations(expires_at) WHERE status = 'reserved';

-- Enable RLS
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Admins can view all reservations" ON public.stock_reservations;
CREATE POLICY "Admins can view all reservations" ON public.stock_reservations 
  FOR SELECT 
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Function to reserve stock
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
BEGIN
  -- Get current stock
  SELECT stock_quantity INTO available_stock
  FROM products
  WHERE id = product_id_param
  FOR UPDATE; -- Lock the row

  -- Calculate reserved stock (not yet confirmed or released)
  SELECT COALESCE(SUM(quantity), 0) INTO reserved_stock
  FROM stock_reservations
  WHERE product_id = product_id_param
    AND status = 'reserved'
    AND expires_at > NOW();

  -- Check if enough stock available
  IF available_stock - reserved_stock < quantity_param THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient stock',
      'available', available_stock - reserved_stock,
      'requested', quantity_param
    );
  END IF;

  -- Create reservation
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to confirm reservation (on payment success)
CREATE OR REPLACE FUNCTION confirm_stock_reservation(
  order_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  reservation RECORD;
  rows_updated INTEGER := 0;
BEGIN
  -- Update all reservations for this order to confirmed
  FOR reservation IN
    SELECT id, product_id, quantity
    FROM stock_reservations
    WHERE order_id = order_id_param
      AND status = 'reserved'
  LOOP
    -- Update reservation status
    UPDATE stock_reservations
    SET status = 'confirmed',
        updated_at = NOW()
    WHERE id = reservation.id;

    -- Decrement actual stock
    UPDATE products
    SET stock_quantity = stock_quantity - reservation.quantity,
        updated_at = NOW()
    WHERE id = reservation.product_id
      AND stock_quantity >= reservation.quantity;

    rows_updated := rows_updated + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'reservations_confirmed', rows_updated
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release reservation (on payment failure or expiration)
CREATE OR REPLACE FUNCTION release_stock_reservation(
  order_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Update all reservations for this order to released
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired reservations (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS JSONB AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  -- Release expired reservations
  UPDATE stock_reservations
  SET status = 'released',
      updated_at = NOW()
  WHERE status = 'reserved'
    AND expires_at < NOW();

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'expired_reservations_released', rows_updated,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_stock_reservations_updated_at ON public.stock_reservations;
CREATE TRIGGER update_stock_reservations_updated_at 
  BEFORE UPDATE ON public.stock_reservations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.stock_reservations IS 'Stock reservations to prevent overselling during checkout';
COMMENT ON FUNCTION reserve_product_stock IS 'Reserve stock for an order (called on order creation)';
COMMENT ON FUNCTION confirm_stock_reservation IS 'Confirm reservation and decrement stock (called on payment success)';
COMMENT ON FUNCTION release_stock_reservation IS 'Release reservation (called on payment failure)';
COMMENT ON FUNCTION cleanup_expired_reservations IS 'Cleanup expired reservations (run via cron every 5 minutes)';

SELECT 'Stock reservation system migration completed successfully' as status;