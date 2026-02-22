import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

/** Allowed MIME types */
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/admin/content/upload
 * Uploads an image to Supabase Storage bucket "page-images".
 * Form fields:
 *   - file: File (required)
 *   - path: string (required) — storage path, e.g. "home/hero.webp"
 * Returns: { url: string }
 * Requires admin role.
 */
export async function POST(request: Request) {
    const supabase = createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Role check
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Parse form data
    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json(
            { error: 'Formato de solicitud inválido. Se espera multipart/form-data.' },
            { status: 400 }
        );
    }

    const file = formData.get('file') as File | null;
    const storagePath = formData.get('path') as string | null;

    if (!file) {
        return NextResponse.json({ error: 'No se proporcionó ningún archivo.' }, { status: 400 });
    }
    if (!storagePath || !storagePath.trim()) {
        return NextResponse.json({ error: 'El campo "path" es obligatorio.' }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({
            error: `Formato de imagen no permitido: ${file.type}. Formatos válidos: JPG, PNG, WebP, AVIF.`
        }, { status: 422 });
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json({
            error: `El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB). El máximo permitido es 5 MB.`
        }, { status: 422 });
    }

    // Sanitize path: remove leading slash, prevent path traversal
    const safePath = storagePath.trim().replace(/^\/+/, '').replace(/\.\./g, '');
    if (!safePath) {
        return NextResponse.json({ error: 'Ruta de almacenamiento inválida.' }, { status: 400 });
    }
    // Only allow safe characters in the storage path
    const SAFE_PATH_REGEX = /^[a-zA-Z0-9/_.\-]+$/;
    if (!SAFE_PATH_REGEX.test(safePath)) {
        return NextResponse.json({ error: 'La ruta contiene caracteres no permitidos.' }, { status: 400 });
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
        .from('page-images')
        .upload(safePath, buffer, {
            contentType: file.type,
            upsert: true,
        });

    if (uploadError) {
        console.error('[content/upload POST]', uploadError);
        return NextResponse.json(
            { error: 'Error al subir la imagen. Inténtalo de nuevo.' },
            { status: 500 }
        );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
        .from('page-images')
        .getPublicUrl(safePath);

    return NextResponse.json({ url: urlData.publicUrl });
}
