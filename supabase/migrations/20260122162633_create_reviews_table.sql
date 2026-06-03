-- Crear tabla de reseñas
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Cualquiera puede ver las reseñas
CREATE POLICY "Reviews are viewable by everyone"
ON public.reviews FOR SELECT
USING (true);

-- Solo usuarios autenticados pueden insertar sus propias reseñas
CREATE POLICY "Authenticated users can insert their own reviews"
ON public.reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Solo los dueños de la reseña pueden editarla o borrarla
CREATE POLICY "Users can update their own reviews"
ON public.reviews FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
ON public.reviews FOR DELETE
USING (auth.uid() = user_id);

-- Función para actualizar el rating promedio del producto automáticamente
CREATE OR REPLACE FUNCTION update_product_rating_avg()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.products
    SET rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM public.reviews
        WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ),
    review_count = (
        SELECT COUNT(*)
        FROM public.reviews
        WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers para mantener actualizado el rating del producto
CREATE TRIGGER tr_after_review_insert
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating_avg();

CREATE TRIGGER tr_after_review_update
AFTER UPDATE OF rating ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating_avg();

CREATE TRIGGER tr_after_review_delete
AFTER DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating_avg();
