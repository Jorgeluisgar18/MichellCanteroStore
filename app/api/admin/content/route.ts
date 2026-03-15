import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/content?page=home
 * Returns all content rows for a given page (or all pages if no page param).
 * Public endpoint — cached 60 seconds for visitors.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');

    try {
        let query = supabaseAdmin
            .from('page_content')
            .select('*')
            .order('section')
            .order('key');

        if (page) {
            query = query.eq('page', page);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[content GET]', error);
            return NextResponse.json({ error: 'Error al obtener el contenido' }, { status: 500 });
        }

        return NextResponse.json(
            { data: data ?? [] },
            { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
        );
    } catch (err) {
        console.error('[content GET] unexpected error:', err);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/content
 * Upsert a single content entry.
 * Body: { page, section, key, value?, image_url? }
 * Requires admin role.
 */
export async function PUT(request: Request) {
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

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const { page, section, key, value, image_url } = body as {
        page?: string;
        section?: string;
        key?: string;
        value?: string;
        image_url?: string;
    };

    // Validate required fields
    if (!page || typeof page !== 'string' || !page.trim()) {
        return NextResponse.json({ error: 'El campo "page" es obligatorio' }, { status: 400 });
    }
    if (!section || typeof section !== 'string' || !section.trim()) {
        return NextResponse.json({ error: 'El campo "section" es obligatorio' }, { status: 400 });
    }
    if (!key || typeof key !== 'string' || !key.trim()) {
        return NextResponse.json({ error: 'El campo "key" es obligatorio' }, { status: 400 });
    }

    // Allowed pages
    const ALLOWED_PAGES = ['home', 'nosotros', 'tienda', 'global', 'contacto'] as const;
    if (!ALLOWED_PAGES.includes(page as typeof ALLOWED_PAGES[number])) {
        return NextResponse.json(
            { error: `Página no válida. Válidas: ${ALLOWED_PAGES.join(', ')}` },
            { status: 400 }
        );
    }

    // Validate text length
    if (value && value.length > 5000) {
        return NextResponse.json(
            { error: 'El texto no puede superar 5000 caracteres' },
            { status: 400 }
        );
    }

    const { data, error } = await supabaseAdmin
        .from('page_content')
        .upsert(
            {
                page: page.trim(),
                section: section.trim(),
                key: key.trim(),
                value: value?.trim() ?? null,
                image_url: image_url?.trim() ?? null,
            },
            { onConflict: 'page,section,key' }
        )
        .select()
        .single();

    if (error) {
        console.error('[content PUT]', error);
        return NextResponse.json({ error: 'Error al guardar el contenido' }, { status: 500 });
    }

    return NextResponse.json({ data });
}
