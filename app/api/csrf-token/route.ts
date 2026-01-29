import { NextResponse, NextRequest } from 'next/server';
import { getCsrfToken } from '@/lib/security/csrf';

/**
 * GET /api/csrf-token
 * Returns CSRF token for client-side forms
 */
export async function GET(request: NextRequest) {
    try {
        const token = getCsrfToken(request);

        if (!token) {
            return NextResponse.json(
                { error: 'No CSRF token found. Please refresh the page.' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            token,
            expiresIn: 86400, // 24 hours in seconds
        });
    } catch (error) {
        console.error('Error getting CSRF token:', error);
        return NextResponse.json(
            { error: 'Failed to get CSRF token' },
            { status: 500 }
        );
    }
}
