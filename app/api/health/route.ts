import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Health Check Endpoint
 * Used for uptime monitoring and deployment verification
 * 
 * Checks:
 * - API is responding
 * - Database connection is working
 * - Environment variables are set
 */
export async function GET(request: Request) {
    const startTime = Date.now();

    try {
        // ✅ Verificar si hay una clave de monitoreo para revelar detalles
        const monitoringKey = request.headers.get('x-monitoring-key');
        const isAuthorizedMonitor = monitoringKey === process.env.MONITORING_SECRET;

        let dbCheck = false;
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { error } = await supabase.from('products').select('count').limit(1);
            dbCheck = !error;
        } catch { /* silencioso */ }

        const isHealthy = dbCheck &&
            !!(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
            !!(process.env.WOMPI_PRIVATE_KEY);

        const responseTime = Date.now() - startTime;

        const publicResponse = {
            status: isHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            responseTime: `${responseTime}ms`,
        };

        if (isAuthorizedMonitor) {
            return NextResponse.json({
                ...publicResponse,
                checks: {
                    database: dbCheck,
                    supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL),
                    wompi: !!(process.env.WOMPI_PRIVATE_KEY),
                    upstash: !!(process.env.KV_REST_API_URL),
                },
                version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local',
            }, { status: isHealthy ? 200 : 503 });
        }

        return NextResponse.json(publicResponse, {
            status: isHealthy ? 200 : 503,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Health check error:', error);

        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
        }, {
            status: 500,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });
    }
}
