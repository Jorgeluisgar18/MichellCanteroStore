/**
 * Simple CSRF Protection Middleware
 * Uses double-submit cookie pattern
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a random CSRF token
 */
function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Check if request needs CSRF protection
 */
function needsCsrfProtection(request: NextRequest): boolean {
    const { pathname } = request.nextUrl;
    const method = request.method;

    // Only protect state-changing methods
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        return false;
    }

    // Protect these API routes
    const protectedPaths = [
        '/api/orders',
        '/api/products',
        '/api/admin',
        '/api/profile',
    ];

    // Exclude these paths (they have other protection)
    const excludedPaths = [
        '/api/payments/webhook',  // Webhook signature
        '/api/auth',               // Supabase handles this
        '/api/cron',               // Cron secret
    ];

    // Check if path should be excluded
    if (excludedPaths.some(path => pathname.startsWith(path))) {
        return false;
    }

    // Check if path should be protected
    return protectedPaths.some(path => pathname.startsWith(path));
}

/**
 * Validate CSRF token
 */
function validateCsrfToken(request: NextRequest): boolean {
    // Get token from cookie
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

    // Get token from header
    const headerToken = request.headers.get(CSRF_HEADER_NAME);

    // Both must exist and match
    if (!cookieToken || !headerToken) {
        return false;
    }

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
        Buffer.from(cookieToken),
        Buffer.from(headerToken)
    );
}

/**
 * Apply CSRF protection to request
 */
export function applyCsrfProtection(request: NextRequest): NextResponse | null {
    // Skip if not needed
    if (!needsCsrfProtection(request)) {
        return null;
    }

    // Validate token
    if (!validateCsrfToken(request)) {
        console.error('CSRF validation failed', {
            path: request.nextUrl.pathname,
            method: request.method,
            hasCookie: !!request.cookies.get(CSRF_COOKIE_NAME),
            hasHeader: !!request.headers.get(CSRF_HEADER_NAME),
        });

        return NextResponse.json(
            { error: 'Invalid CSRF token' },
            { status: 403 }
        );
    }

    return null; // No error, continue
}

/**
 * Set CSRF token cookie in response
 */
export function setCsrfCookie(response: NextResponse): void {
    // Check if cookie already exists
    if (!response.cookies.get(CSRF_COOKIE_NAME)) {
        const token = generateToken();

        response.cookies.set(CSRF_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24, // 24 hours
        });
    }
}

/**
 * Get CSRF token for client
 */
export function getCsrfToken(request: NextRequest): string | null {
    return request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
}
