
-- ─────────────────────────────────────────────────────
-- Índices de rendimiento — MichellCanteroStore
-- ─────────────────────────────────────────────────────

-- 1. Filtrado por categoría + stock (tienda y admin)
CREATE INDEX IF NOT EXISTS idx_products_category_stock
    ON public.products (category, in_stock);

-- 2. Productos destacados en stock (Home, sección featured)
CREATE INDEX IF NOT EXISTS idx_products_featured_stock
    ON public.products (featured, in_stock)
    WHERE in_stock = true;

-- 3. Productos nuevos en stock (filtro "Nuevos" en tienda)
CREATE INDEX IF NOT EXISTS idx_products_isnew_stock
    ON public.products (is_new, in_stock)
    WHERE in_stock = true;

-- 4. Slug único para lookups de producto individual
CREATE INDEX IF NOT EXISTS idx_products_slug
    ON public.products (slug);
