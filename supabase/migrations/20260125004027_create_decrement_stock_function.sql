-- Function to atomically decrement product stock
-- Uses row-level locking to prevent race conditions

CREATE OR REPLACE FUNCTION decrement_product_stock(
  product_id_param UUID,
  quantity_param INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- Lock the row for update to prevent race conditions
  UPDATE products
  SET 
    stock_quantity = stock_quantity - quantity_param,
    in_stock = CASE 
      WHEN stock_quantity - quantity_param <= 0 THEN false
      ELSE in_stock
    END,
    updated_at = NOW()
  WHERE id = product_id_param
    AND stock_quantity >= quantity_param -- Ensure sufficient stock
    AND in_stock = true;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock or product not available';
  END IF;
END;
$$ LANGUAGE plpgsql;