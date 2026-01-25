import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/products/[id] - Obtener producto por ID
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', params.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { error: 'Producto no encontrado' },
                    { status: 404 }
                );
            }

            console.error('Error fetching product:', error);
            return NextResponse.json(
                { error: 'Error al obtener producto' },
                { status: 500 }
            );
        }

        return NextResponse.json({ data });
    } catch (error: unknown) {
        console.error('API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json(
            { error: `Error del servidor (GET): ${errorMessage}` },
            { status: 500 }
        );
    }
}

// PUT /api/products/[id] - Actualizar producto (solo admin)
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();

        // Validar autenticación usando el cliente del servidor
        const { createClient } = await import('@/lib/supabase-server');
        const supabaseServer = createClient();

        const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

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

        // Validar y sanitizar datos del producto
        const {
            name,
            description,
            price,
            compare_at_price,
            category,
            subcategory,
            images,
            stock_quantity,
            variants,
            featured,
            is_new,
            in_stock,
            slug,
            tags,
            brand
        } = body;

        // Preparar datos para actualización
        const productData: Record<string, string | number | boolean | string[] | Array<{ id: string; name: string; type: string; value: string; stock_quantity: number; inStock: boolean }> | null> = {};

        if (name !== undefined) productData.name = name;
        if (description !== undefined) productData.description = description;
        if (price !== undefined) productData.price = parseFloat(String(price));
        if (category !== undefined) productData.category = category;
        if (subcategory !== undefined) productData.subcategory = subcategory || null;
        if (images !== undefined) productData.images = Array.isArray(images) ? images : [];
        if (stock_quantity !== undefined) productData.stock_quantity = parseInt(String(stock_quantity)) || 0;
        if (featured !== undefined) productData.featured = featured === true;
        if (is_new !== undefined) productData.is_new = is_new === true;
        if (in_stock !== undefined) productData.in_stock = in_stock !== false;
        if (slug !== undefined) productData.slug = slug;
        if (tags !== undefined) productData.tags = Array.isArray(tags) ? tags : [];
        if (brand !== undefined) productData.brand = brand || null;

        // Agregar compare_at_price
        if (compare_at_price !== undefined) {
            productData.compare_at_price = compare_at_price ? parseFloat(String(compare_at_price)) : null;
        }

        // Validar y agregar variantes si existen
        if (variants !== undefined) {
            if (Array.isArray(variants) && variants.length > 0) {
                productData.variants = variants.map((v: { id?: string; name?: string; type?: string; value?: string; stock_quantity?: string | number }) => ({
                    id: v.id || Math.random().toString(36).substring(2, 9),
                    name: v.name || 'Sin nombre',
                    type: v.type || 'color',
                    value: v.value || '',
                    stock_quantity: parseInt(String(v.stock_quantity)) || 0,
                    inStock: (parseInt(String(v.stock_quantity)) || 0) > 0
                }));
            } else {
                productData.variants = [];
            }
        }

        // Actualizar producto usando el cliente admin
        const { data, error } = await supabaseAdmin
            .from('products')
            .update(productData)
            .eq('id', params.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating product:', error);
            return NextResponse.json(
                { error: `Error al actualizar producto: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ data });
    } catch (error: unknown) {
        console.error('API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json(
            { error: `Error del servidor (PUT): ${errorMessage}` },
            { status: 500 }
        );
    }
}

// DELETE /api/products/[id] - Eliminar producto (solo admin)
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Validar autenticación usando el cliente del servidor
        const { createClient } = await import('@/lib/supabase-server');
        const supabaseServer = createClient();

        const { data: { user }, error: authError } = await supabaseServer.auth.getUser();

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

        // Eliminar producto usando el cliente admin
        const { error } = await supabaseAdmin
            .from('products')
            .delete()
            .eq('id', params.id);

        if (error) {
            console.error('Error deleting product:', error);
            return NextResponse.json(
                { error: 'Error al eliminar producto' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}
