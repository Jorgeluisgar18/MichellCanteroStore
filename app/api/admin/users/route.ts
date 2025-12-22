import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/admin/users - Listar perfiles (Solo admin)
export async function GET() {
    try {
        // En una app real, verificaríamos el JWT y el rol aquí
        // Por ahora, asumimos que el middleware ya filtró el acceso a /admin y /api/admin

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching profiles:', error);
            return NextResponse.json(
                { error: 'Error al obtener usuarios' },
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
