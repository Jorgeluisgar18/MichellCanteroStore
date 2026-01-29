import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron job to cleanup expired stock reservations
 * This should be called every 5 minutes via Vercel Cron
 */
export async function GET(request: Request) {
    try {
        // Verify cron secret to prevent unauthorized access
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Create admin client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
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

        console.log('Cleanup completed:', data);

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
