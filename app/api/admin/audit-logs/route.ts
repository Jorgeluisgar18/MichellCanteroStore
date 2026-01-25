import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/admin/audit-logs - Get audit logs (Admin only)
export async function GET(request: Request) {
    try {
        const { verifyAdmin } = await import('@/lib/middleware/auth');
        const { logger } = await import('@/lib/utils/logger');

        const authResult = await verifyAdmin();
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { user } = authResult;
        const { searchParams } = new URL(request.url);

        // Query parameters
        const entityType = searchParams.get('entity_type');
        const entityId = searchParams.get('entity_id');
        const actorId = searchParams.get('actor_id');
        const action = searchParams.get('action');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Build query
        let query = supabaseAdmin
            .from('audit_log')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply filters
        if (entityType) query = query.eq('entity_type', entityType);
        if (entityId) query = query.eq('entity_id', entityId);
        if (actorId) query = query.eq('actor_id', actorId);
        if (action) query = query.eq('action', action);

        const { data, error, count } = await query;

        if (error) {
            logger.error('Error fetching audit logs', error);
            return NextResponse.json(
                { error: 'Error al obtener audit logs' },
                { status: 500 }
            );
        }

        logger.info('Admin fetched audit logs', {
            adminId: user.id,
            count: data?.length || 0,
            filters: { entityType, entityId, actorId, action }
        });

        return NextResponse.json({
            data,
            pagination: {
                total: count || 0,
                limit,
                offset,
                hasMore: (count || 0) > offset + limit
            }
        });
    } catch (error) {
        const { logger } = await import('@/lib/utils/logger');
        logger.error('API Error in admin/audit-logs', error as Error);
        return NextResponse.json(
            { error: 'Error del servidor' },
            { status: 500 }
        );
    }
}
