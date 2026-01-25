import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/profiles - Obtener el perfil del usuario actual
export async function GET() {
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

        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return NextResponse.json(
                { error: 'Error al obtener el perfil' },
                { status: 500 }
            );
        }

        return NextResponse.json({ data: profile });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}

// PUT /api/profiles - Actualizar el perfil del usuario actual
export async function PUT(request: Request) {
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

        const body = await request.json();
        const { full_name, phone } = body;

        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .update({
                full_name,
                phone,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating profile:', error);
            return NextResponse.json(
                { error: 'Error al actualizar el perfil' },
                { status: 500 }
            );
        }

        return NextResponse.json({ data: profile });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}
