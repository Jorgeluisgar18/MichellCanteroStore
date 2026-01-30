import { NextRequest } from 'next/server';
import { getCsrfToken } from '@/lib/security/csrf';
import { ApiResponse } from '@/lib/api-responses';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const token = getCsrfToken(request);

        if (!token) {
            return ApiResponse.badRequest('No CSRF token found. Please refresh the page.');
        }

        return ApiResponse.success({
            token,
            expiresIn: 86400, // 24 hours in seconds
        });
    } catch (error) {
        return ApiResponse.error(error);
    }
}
