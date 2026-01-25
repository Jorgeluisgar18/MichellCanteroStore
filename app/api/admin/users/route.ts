import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/admin/users - Listar perfiles (Solo admin)
export async function GET() {
    try {
        // ✅ SECURITY: Verify admin role
        const { verifyAdmin } = await import('@/lib/middleware/auth');
        const { logger } = await import('@/lib/utils/logger');

        const authResult = await verifyAdmin();
        if (authResult instanceof NextResponse) {
            return authResult; // Return 401/403 error
        }

        const { user } = authResult;

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Error fetching profiles', error);
            return NextResponse.json(
                { error: 'Error al obtener usuarios' },
                { status: 500 }
            );
        }

        logger.info('Admin fetched user list', { adminId: user.id, count: data?.length || 0 });

        return NextResponse.json({ data });
    } catch (error) {
        const { logger } = await import('@/lib/utils/logger');
        logger.error('API Error in admin/users', error as Error);
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}
