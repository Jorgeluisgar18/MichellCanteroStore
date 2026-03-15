import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEnvVar } from '@/lib/env';

/**
 * Cron job to cleanup expired stock reservations
 * This should be called every 5 minutes via Vercel Cron
 */
export async function GET(request: Request) {
    try {
        // Verify cron secret to prevent unauthorized access
        const authHeader = request.headers.get('authorization');
        let cronSecret = '';
        try {
            cronSecret = getEnvVar('CRON_SECRET');
        } catch {
            console.warn('CRON_SECRET not configured');
        }

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Create admin client
        const supabase = createClient(
            getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
            getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
        );

        // Call cleanup function
        const { data, error } = await supabase
            .rpc('cleanup_expired_reservations');

        if (error) {
            console.error('Error cleaning up reservations:', error);
            return NextResponse.json(
                { error: 'Failed to cleanup reservations', details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            ...data
        });
    } catch (error) {
        console.error('Cron job error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Allow POST as well for manual triggers
export async function POST(request: Request) {
    return GET(request);
}
