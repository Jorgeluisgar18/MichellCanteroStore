import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/addresses - Obtener todas las direcciones del usuario
export async function GET() {
    try {
        const { createClient } = await import('@/lib/supabase-server');
        const supabase = createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from('addresses')
            .select('*')
            .eq('user_id', user.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching addresses:', error);
            return NextResponse.json({ error: 'Error al obtener direcciones' }, { status: 500 });
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

// POST /api/addresses - Crear nueva dirección
export async function POST(request: Request) {
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

        // Validaciones
        if (!recipient_name || !address_line1 || !city || !department || !phone) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            );
        }

        const addressData = {
            user_id: user.id,
            recipient_name,
            address_line1,
            address_line2: address_line2 || null,
            city,
            department,
            postal_code: postal_code || null,
            phone,
            is_default: is_default === true
        };

        const { data, error } = await supabaseAdmin
            .from('addresses')
            .insert([addressData])
            .select()
            .single();

        if (error) {
            console.error('Error creating address:', error);
            return NextResponse.json(
                { error: `Error al crear dirección: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (error: unknown) {
        console.error('API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json(
            { error: `Error del servidor: ${errorMessage}` },
            { status: 500 }
        );
    }
}
