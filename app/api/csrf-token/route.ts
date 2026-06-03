import { NextRequest } from 'next/server';
import { CSRF_COOKIE_NAME, getOrCreateCsrfToken } from '@/lib/security/csrf';
import { ApiResponse } from '@/lib/api-responses';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { token, created } = getOrCreateCsrfToken(request.cookies.get(CSRF_COOKIE_NAME)?.value);

        const response = ApiResponse.success({
            token,
            expiresIn: 86400, // 24 hours in seconds
        });

        if (created) {
            response.cookies.set(CSRF_COOKIE_NAME, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
                maxAge: 60 * 60 * 24,
            });
        }

        return response;
    } catch (error) {
        return ApiResponse.error(error);
    }
}
