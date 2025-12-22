import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';


// GET /api/products - Obtener todos los productos
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const featured = searchParams.get('featured');
        const isNew = searchParams.get('new');
        const inStock = searchParams.get('inStock');

        let query = supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        // Aplicar filtros
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
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}

// POST /api/products - Crear nuevo producto (solo admin)
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Validar que el usuario sea admin (esto se mejorará con middleware)
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 403 }
            );
        }

        // Crear producto
        const { data, error } = await supabase
            .from('products')
            .insert([body])
            .select()
            .single();

        if (error) {
            console.error('Error creating product:', error);
            return NextResponse.json(
                { error: 'Error al crear producto' },
                { status: 500 }
            );
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}
