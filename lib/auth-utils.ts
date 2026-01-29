import { createClient } from './supabase-server';
import { supabaseAdmin } from './supabase';
import { AppError } from './errors';

/**
 * Helper to get current user and verify admin status
 */
export async function getAdminUser() {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new AppError('No autenticado - por favor inicia sesión', 'UNAUTHENTICATED', 401);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || profile?.role !== 'admin') {
        throw new AppError('No autorizado - se requiere rol de administrador', 'FORBIDDEN', 403);
    }

    return user;
}
