import { cookies } from 'next/headers';
// @ts-expect-error
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Error del servidor' },
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

        // Validar autenticación y rol de admin
        const cookieStore = cookies();
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

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

        // Actualizar producto
        const { data, error } = await supabase
            .from('products')
            .update(body)
            .eq('id', params.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating product:', error);
            return NextResponse.json(
                { error: 'Error al actualizar producto' },
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

// DELETE /api/products/[id] - Eliminar producto (solo admin)
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Validar autenticación y rol de admin
        const cookieStore = cookies();
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

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

        // Eliminar producto
        const { error } = await supabase
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
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}
