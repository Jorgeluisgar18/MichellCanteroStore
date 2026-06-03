
-- Storage RLS policies for page-images bucket
DO $$
BEGIN
    -- Public read
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
          AND policyname = 'page_images_public_read'
    ) THEN
        CREATE POLICY "page_images_public_read"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'page-images');
    END IF;

    -- Admin insert
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
          AND policyname = 'page_images_admin_write'
    ) THEN
        CREATE POLICY "page_images_admin_write"
            ON storage.objects FOR INSERT
            WITH CHECK (
                bucket_id = 'page-images'
                AND EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                      AND profiles.role = 'admin'
                )
            );
    END IF;

    -- Admin update/delete
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
          AND policyname = 'page_images_admin_update'
    ) THEN
        CREATE POLICY "page_images_admin_update"
            ON storage.objects FOR UPDATE
            USING (
                bucket_id = 'page-images'
                AND EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                      AND profiles.role = 'admin'
                )
            );
    END IF;
END $$;
