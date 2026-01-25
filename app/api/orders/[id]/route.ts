import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/orders/[id] - Obtener orden por ID
export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { createClient } = await import('@/lib/supabase-server');
        const supabase = createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('orders')
            .select(`
                *,
                order_items (*)
            `)
            .eq('id', params.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { error: 'Orden no encontrada' },
                    { status: 404 }
                );
            }

            console.error('Error fetching order:', error);
            return NextResponse.json(
                { error: 'Error al obtener orden' },
                { status: 500 }
            );
        }

        // Verificar que el usuario tenga acceso a esta orden
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin' && data.user_id !== user.id) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 403 }
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

// PUT /api/orders/[id] - Actualizar orden (solo admin)
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { createClient } = await import('@/lib/supabase-server');
        const supabase = createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 403 }
            );
        }

        const body = await request.json();

        // Actualizar orden
        const { data, error } = await supabaseAdmin
            .from('orders')
            .update(body)
            .eq('id', params.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating order:', error);
            return NextResponse.json(
                { error: 'Error al actualizar orden' },
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

// DELETE /api/orders/[id] - Eliminar orden (solo admin)
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { createClient } = await import('@/lib/supabase-server');
        const supabase = createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 403 }
            );
        }

        // Eliminar items de la orden primero (por FK)
        await supabaseAdmin
            .from('order_items')
            .delete()
            .eq('order_id', params.id);

        // Eliminar orden
        const { error } = await supabaseAdmin
            .from('orders')
            .delete()
            .eq('id', params.id);

        if (error) {
            console.error('Error deleting order:', error);
            return NextResponse.json(
                { error: 'Error al eliminar orden' },
                { status: 500 }
            );
        }

        return NextResponse.json({ message: 'Orden eliminada correctamente' });
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}
