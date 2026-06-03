import { NextResponse, type NextRequest } from 'next/server';
import { applyCsrfProtection, setCsrfCookie } from '@/lib/security/csrf';

const PUBLIC_ACCOUNT_PATHS = ['/cuenta/login', '/cuenta/registro', '/cuenta/recuperar'];

function hasSupabaseAuthCookie(req: NextRequest): boolean {
    return req.cookies
        .getAll()
        .some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'));
}

function redirectToLogin(req: NextRequest): NextResponse {
    const requestedPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    return NextResponse.redirect(
        new URL(`/cuenta/login?redirect=${encodeURIComponent(requestedPath)}`, req.url)
    );
}

export function middleware(req: NextRequest) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-pathname', `${req.nextUrl.pathname}${req.nextUrl.search}`);

    const res = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
    const { pathname, searchParams } = req.nextUrl;

    // Rescue: auth code redirect
    if ((searchParams.has('code') || searchParams.has('error')) && pathname !== '/auth/callback') {
        const callbackUrl = req.nextUrl.clone();
        callbackUrl.pathname = '/auth/callback';

        if (searchParams.has('code') && !searchParams.has('next')) {
            callbackUrl.searchParams.set('next', '/cuenta/actualizar-password');
        }

        return NextResponse.redirect(callbackUrl);
    }

    // CSRF Protection
    const csrfError = applyCsrfProtection(req);
    if (csrfError) return csrfError;

    const requiresAccountAuth = pathname.startsWith('/cuenta')
        && !PUBLIC_ACCOUNT_PATHS.some((path) => pathname.startsWith(path));
    const requiresAdminAuth = pathname.startsWith('/admin');

    if ((requiresAdminAuth || requiresAccountAuth) && !hasSupabaseAuthCookie(req)) {
        return redirectToLogin(req);
    }

    if (pathname !== '/api/csrf-token') {
        setCsrfCookie(req, res);
    }

    return res;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - Webhooks (Must be public)
         */
        '/((?!_next/static|_next/image|favicon.ico|api/payments/webhook).*)',
    ],
};
