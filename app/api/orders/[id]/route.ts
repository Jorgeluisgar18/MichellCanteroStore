import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const AdminUpdateOrderSchema = z.object({
    status: z.enum([
        'pending', 'processing', 'shipped', 'delivered', 'cancelled'
    ]).optional(),
    payment_status: z.enum([
        'pending', 'paid', 'failed', 'refunded', 'voided'
    ]).optional(),
    tracking_number: z.string().max(100).nullable().optional(),
    shipping_address: z.string().max(500).optional(),
    customer_notes: z.string().max(1000).nullable().optional(),
    admin_notes: z.string().max(1000).nullable().optional(),
}).strict();

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

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('[orders/[id] GET] Error al verificar perfil:', profileError.message);
            return NextResponse.json({ error: 'Error al verificar permisos' }, { status: 500 });
        }

        const isAdmin = profile?.role === 'admin';

        let query = supabaseAdmin
            .from('orders')
            .select(`*, order_items (*)`)
            .eq('id', params.id);

        if (!isAdmin) {
            query = query.eq('user_id', user.id);
        }

        const { data, error } = await query.single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
            }
            console.error('[orders/[id] GET] Error en query:', error);
            return NextResponse.json({ error: 'Error al obtener orden' }, { status: 500 });
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

        // Validar con el schema antes de tocar la BD
        const parsed = AdminUpdateOrderSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        // Actualizar orden
        const { data, error } = await supabaseAdmin
            .from('orders')
            .update(parsed.data)
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
