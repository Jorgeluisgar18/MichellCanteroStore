-- Add shipping_method and shipping_location columns to orders table
-- Migration: add_shipping_fields
-- Created: 2026-02-08

-- Add shipping_method column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_method TEXT 
CHECK (shipping_method IN ('delivery', 'pickup'))
DEFAULT 'delivery';

-- Add shipping_location column for distance-based pricing
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_location TEXT;

-- Add index for shipping_method for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_shipping_method ON public.orders(shipping_method);

-- Add comments
COMMENT ON COLUMN public.orders.shipping_method IS 'Método de envío: delivery (envío a domicilio) o pickup (retiro en tienda)';
COMMENT ON COLUMN public.orders.shipping_location IS 'Ubicación de envío para cálculo de costos: cienaga-cerca, cienaga-media, cienaga-lejos, santa-marta, colombia-estandar, colombia-express';