import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Health Check Endpoint
 * Used for uptime monitoring and deployment verification
 * 
 * Checks:
 * - API is responding
 * - Database connection is working
 * - Environment variables are set
 */
export async function GET() {
    const startTime = Date.now();

    try {
        // Check environment variables
        const envCheck = {
            supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
            wompi: !!(process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY && process.env.WOMPI_PRIVATE_KEY),
            upstash: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
        };

        // Check database connection
        let dbCheck = false;
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { error } = await supabase
                .from('products')
                .select('count')
                .limit(1);

            dbCheck = !error;
        } catch (dbError) {
            console.error('Database health check failed:', dbError);
        }

        const responseTime = Date.now() - startTime;

        // Determine overall health status
        const isHealthy = envCheck.supabase && envCheck.wompi && dbCheck;

        return NextResponse.json({
            status: isHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            responseTime: `${responseTime}ms`,
            checks: {
                api: true,
                database: dbCheck,
                environment: envCheck,
            },
            version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local',
        }, {
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
