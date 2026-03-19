import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron job to cleanup expired stock reservations
 * This should be called every 5 minutes via Vercel Cron
 */
export async function GET(request: Request) {
    try {
        const cronSecret = process.env.CRON_SECRET;

        // Fail-Closed.
        if (!cronSecret) {
            console.error('[CRON] CRÍTICO: CRON_SECRET no configurado — request bloqueado.');
            return NextResponse.json(
                { error: 'Service unavailable' },
                { status: 503 }
            );
        }

        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${cronSecret}`) {
            console.warn('[CRON] Intento de acceso no autorizado al cron endpoint.');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[CRON] Variables de Supabase no configuradas.');
            return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await supabase.rpc('cleanup_expired_reservations');

        if (error) {
            console.error('[CRON] Error en cleanup_expired_reservations:', error);
            return NextResponse.json(
                { error: 'Failed to cleanup reservations', details: error.message },
                { status: 500 }
            );
        }

        console.info('[CRON] Cleanup ejecutado:', data);
        return NextResponse.json({ success: true, ...data });

    } catch (error) {
        console.error('[CRON] Error inesperado:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Allow POST as well for manual triggers
export async function POST(request: Request) {
    return GET(request);
}
