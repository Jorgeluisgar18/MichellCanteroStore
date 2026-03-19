import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/reviews?product_id=... - Obtener reseñas de un producto
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
        return NextResponse.json({ error: 'Falta product_id' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('reviews')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}

// POST /api/reviews - Crear reseña
export async function POST(request: Request) {
    try {
        const { createClient } = await import('@/lib/supabase-server');
        const supabase = createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const body = await request.json();
        const { product_id, rating, comment } = body;

        // ── Input validation ────────────────────────────────
        if (!product_id || typeof product_id !== 'string' || !product_id.trim()) {
            return NextResponse.json({ error: 'El campo "product_id" es obligatorio' }, { status: 400 });
        }

        const parsedRating = Number(rating);
        if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return NextResponse.json({ error: 'La calificación debe ser un número entero entre 1 y 5' }, { status: 400 });
        }

        if (comment && typeof comment === 'string' && comment.length > 2000) {
            return NextResponse.json({ error: 'El comentario no puede superar 2000 caracteres' }, { status: 400 });
        }
        // ─────────────────────────────────────────────────────

        // Opcional: Verificar que el usuario compró el producto anteriormente
        // const { data: purchased } = await supabaseAdmin
        //     .from('order_items')
        //     .select('id')
        //     .eq('product_id', product_id)
        //     .eq('orders.user_id', user.id)
        //     .limit(1);

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        const { data, error } = await supabaseAdmin
            .from('reviews')
            .insert([{
                product_id,
                user_id: user.id,
                full_name: profile?.full_name || user.user_metadata?.full_name || 'Cliente',
                rating: parsedRating,
                comment
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating review:', error);
            return NextResponse.json({ error: 'Error al crear reseña' }, { status: 500 });
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
