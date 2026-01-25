import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';


// GET /api/products - Obtener todos los productos
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const featured = searchParams.get('featured');
        const isNew = searchParams.get('new');
        const inStock = searchParams.get('inStock');
        const slug = searchParams.get('slug');
        const limit = searchParams.get('limit');

        let query = supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        // Aplicar filtros
        if (slug) {
            query = query.eq('slug', slug);
        }

        if (limit) {
            query = query.limit(parseInt(limit));
        }

        if (category) {
            query = query.eq('category', category);
        }

        if (featured === 'true') {
            query = query.eq('featured', true);
        }

        if (isNew === 'true') {
            query = query.eq('is_new', true);
        }

        if (inStock === 'true') {
            query = query.eq('in_stock', true);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching products:', error);
            return NextResponse.json(
                { error: 'Error al obtener productos' },
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

// POST /api/products - Crear nuevo producto (solo admin)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validar que el usuario sea admin usando el cliente del servidor
        const { createClient } = await import('@/lib/supabase-server');
        const supabase = createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autenticado - por favor inicia sesión' },
                { status: 401 }
            );
        }

        // Verificar que el usuario sea admin
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json(
                { error: 'No autorizado - se requiere rol de administrador' },
                { status: 403 }
            );
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

        // Validaciones básicas
        if (!name || !price || !category) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos: name, price, category' },
                { status: 400 }
            );
        }

        // Preparar datos para inserción
        const productData: Record<string, string | number | boolean | string[] | Array<{ id: string; name: string; type: string; value: string; stock_quantity: number; inStock: boolean }> | null> = {
            name,
            description: description || '',
            price: parseFloat(String(price)),
            category,
            subcategory: subcategory || null,
            images: Array.isArray(images) ? images : [],
            stock_quantity: parseInt(String(stock_quantity)) || 0,
            featured: featured === true,
            is_new: is_new === true,
            in_stock: in_stock !== false, // Por defecto true
            slug: slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
            tags: Array.isArray(tags) ? tags : [],
            brand: brand || null
        };

        // Agregar compare_at_price solo si existe
        if (compare_at_price) {
            productData.compare_at_price = parseFloat(String(compare_at_price));
        }

        // Validar y agregar variantes si existen
        if (variants && Array.isArray(variants) && variants.length > 0) {
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

        // Crear producto usando el cliente admin para evitar problemas de RLS/Auth-Helpers
        const { data, error } = await supabaseAdmin
            .from('products')
            .insert([productData])
            .select()
            .single();

        if (error) {
            console.error('Error creating product:', error);
            return NextResponse.json(
                { error: `Error al crear producto: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: unknown) {
        console.error('API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json(
            { error: `Error del servidor (POST): ${errorMessage}` },
            { status: 500 }
        );
    }
}
