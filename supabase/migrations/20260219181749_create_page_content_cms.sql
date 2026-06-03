
-- Create page_content table for CMS
CREATE TABLE IF NOT EXISTS public.page_content (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page        text NOT NULL,          -- 'home' | 'nosotros' | 'tienda'
    section     text NOT NULL,          -- e.g. 'hero', 'story', 'founder'
    key         text NOT NULL,          -- e.g. 'title', 'subtitle', 'image_url'
    value       text,                   -- text content
    image_url   text,                   -- public URL from storage
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT page_content_unique UNIQUE (page, section, key)
);

-- Index for fast lookups by page
CREATE INDEX IF NOT EXISTS idx_page_content_page ON public.page_content (page);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_page_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS page_content_updated_at ON public.page_content;
CREATE TRIGGER page_content_updated_at
    BEFORE UPDATE ON public.page_content
    FOR EACH ROW EXECUTE PROCEDURE public.handle_page_content_updated_at();

-- Enable Row Level Security
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone (including anon) can read content
CREATE POLICY "page_content_select_public"
    ON public.page_content FOR SELECT
    USING (true);

-- Policy: Only admins can insert/update/delete
CREATE POLICY "page_content_write_admin"
    ON public.page_content FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
        )
    );
