import { NextResponse } from 'next/server';

// Simple test endpoint to verify webhook connectivity
export async function POST(request: Request) {
    try {
        const body = await request.text();
        const timestamp = new Date().toISOString();

        console.log('=== WEBHOOK TEST RECEIVED ===');
        console.log('Timestamp:', timestamp);
        console.log('Headers:', JSON.stringify(Object.fromEntries(request.headers.entries())));
        console.log('Body:', body);
        console.log('=== END WEBHOOK TEST ===');

        return NextResponse.json({
            received: true,
            timestamp,
            message: 'Webhook test endpoint working'
        });
    } catch (error) {
        console.error('Webhook test error:', error);
        return NextResponse.json({
            error: 'Test failed',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        message: 'Webhook test endpoint is accessible',
        timestamp: new Date().toISOString()
    });
}
