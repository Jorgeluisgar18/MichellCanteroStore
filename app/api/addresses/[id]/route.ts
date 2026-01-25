import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// PUT /api/addresses/[id] - Actualizar dirección
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { createClient } = await import('@/lib/supabase-server');
        const supabase = createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const body = await request.json();
        const {
            recipient_name,
            address_line1,
            address_line2,
            city,
            department,
            postal_code,
            phone,
            is_default
        } = body;

        const addressData: Record<string, string | number | boolean | null> = {};
        if (recipient_name !== undefined) addressData.recipient_name = recipient_name;
        if (address_line1 !== undefined) addressData.address_line1 = address_line1;
        if (address_line2 !== undefined) addressData.address_line2 = address_line2 || null;
        if (city !== undefined) addressData.city = city;
        if (department !== undefined) addressData.department = department;
        if (postal_code !== undefined) addressData.postal_code = postal_code || null;
        if (phone !== undefined) addressData.phone = phone;
        if (is_default !== undefined) addressData.is_default = is_default === true;
        addressData.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from('addresses')
            .update(addressData)
            .eq('id', params.id)
            .eq('user_id', user.id) // Asegurar que solo actualice sus propias direcciones
            .select()
            .single();

        if (error) {
            console.error('Error updating address:', error);
            return NextResponse.json(
                { error: `Error al actualizar dirección: ${error.message}` },
                { status: 500 }
            );
        }

        if (!data) {
            return NextResponse.json(
                { error: 'Dirección no encontrada' },
                { status: 404 }
            );
        }

        return NextResponse.json({ data });
    } catch (error: unknown) {
        console.error('API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json(
            { error: `Error del servidor: ${errorMessage}` },
            { status: 500 }
        );
    }
}

// DELETE /api/addresses/[id] - Eliminar dirección
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { createClient } = await import('@/lib/supabase-server');
        const supabase = createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { error } = await supabaseAdmin
            .from('addresses')
            .delete()
            .eq('id', params.id)
            .eq('user_id', user.id); // Asegurar que solo elimine sus propias direcciones

        if (error) {
            console.error('Error deleting address:', error);
            return NextResponse.json(
                { error: 'Error al eliminar dirección' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json(
            { error: `Error del servidor: ${errorMessage}` },
            { status: 500 }
        );
    }
}
