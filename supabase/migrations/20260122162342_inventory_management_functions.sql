-- Función para decrementar el stock de un producto
CREATE OR REPLACE FUNCTION decrement_product_stock(product_id_param UUID, quantity_param INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.products
    SET stock_quantity = GREATER_THAN_ZERO(stock_quantity - quantity_param),
        updated_at = NOW()
    WHERE id = product_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función auxiliar para asegurar que el stock no sea menor a 0
CREATE OR REPLACE FUNCTION GREATER_THAN_ZERO(val INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF val < 0 THEN
        RETURN 0;
    ELSE
        RETURN val;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar el campo in_stock automáticamente
CREATE OR REPLACE FUNCTION update_product_in_stock_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock_quantity <= 0 THEN
        NEW.in_stock := false;
    ELSE
        NEW.in_stock := true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_product_in_stock ON public.products;
CREATE TRIGGER tr_update_product_in_stock
BEFORE UPDATE OF stock_quantity ON public.products
FOR EACH ROW
EXECUTE FUNCTION update_product_in_stock_status();
