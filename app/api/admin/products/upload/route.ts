import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const SAFE_PATH_REGEX = /^[a-zA-Z0-9/_.\-]+$/;
const PRODUCT_IMAGES_BUCKET = 'page-images';

export async function POST(request: Request) {
    const supabase = createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json(
            { error: 'Formato de solicitud inválido. Se espera multipart/form-data.' },
            { status: 400 }
        );
    }

    const file = formData.get('file');
    const storagePath = formData.get('path');

    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No se proporcionó ningún archivo.' }, { status: 400 });
    }

    if (typeof storagePath !== 'string' || !storagePath.trim()) {
        return NextResponse.json({ error: 'El campo "path" es obligatorio.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
            { error: `Formato no permitido: ${file.type}. Usa JPG, PNG, WebP, AVIF o GIF.` },
            { status: 422 }
        );
    }

    if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
            { error: 'El archivo supera el máximo permitido de 5 MB.' },
            { status: 422 }
        );
    }

    const safePath = storagePath.trim().replace(/^\/+/, '').replace(/\.\./g, '');
    if (!safePath || !SAFE_PATH_REGEX.test(safePath)) {
        return NextResponse.json({ error: 'La ruta de almacenamiento es inválida.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(safePath, buffer, {
            contentType: file.type,
            upsert: false,
        });

    if (uploadError) {
        console.error('[products/upload POST]', uploadError);
        return NextResponse.json(
            { error: 'No se pudo subir la imagen del producto. Inténtalo de nuevo.' },
            { status: 500 }
        );
    }

    const { data } = supabaseAdmin.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(safePath);

    return NextResponse.json({ url: data.publicUrl });
}
