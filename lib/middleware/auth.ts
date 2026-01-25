import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Verify that the authenticated user has admin role
 * Returns user if admin, otherwise returns NextResponse with 401/403
 */
export async function verifyAdmin(): Promise<
    { user: User; profile: Record<string, unknown> } | NextResponse
> {
    try {
        const { createClient } = await import('@/lib/supabase-server');
        const supabase = createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        // Verify admin role using supabaseAdmin for security
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role, full_name, email')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json(
                { error: 'Perfil no encontrado' },
                { status: 404 }
            );
        }

        if (profile.role !== 'admin') {
            return NextResponse.json(
                { error: 'Acceso denegado. Se requieren privilegios de administrador.' },
                { status: 403 }
            );
        }

        return { user, profile };
    } catch (error) {
        console.error('Error verifying admin:', error);
        return NextResponse.json(
            { error: 'Error de autenticación' },
            { status: 500 }
        );
    }
}

/**
 * Get authenticated user (no role verification)
 */
export async function getAuthenticatedUser(): Promise<
    { user: User } | NextResponse
> {
    try {
        const { createClient } = await import('@/lib/supabase-server');
        const supabase = createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        return { user };
    } catch (error) {
        console.error('Error getting authenticated user:', error);
        return NextResponse.json(
            { error: 'Error de autenticación' },
            { status: 500 }
        );
    }
}
