import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';
import { applyCsrfProtection, setCsrfCookie } from '@/lib/security/csrf';

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const { pathname, searchParams } = req.nextUrl;

    // 0. ⚓ Rescue: if landing with an auth code or error but not on the callback route,
    // redirect to the callback route to handle session exchange or error display.
    if ((searchParams.has('code') || searchParams.has('error')) && pathname !== '/auth/callback') {
        const callbackUrl = req.nextUrl.clone();
        callbackUrl.pathname = '/auth/callback';
        return NextResponse.redirect(callbackUrl);
    }

    // 1. ✅ CSRF Protection (Standardized)
    const csrfError = applyCsrfProtection(req);
    if (csrfError) return csrfError;

    // 2. ✅ Auth Helpers Connection
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get: (name) => req.cookies.get(name)?.value,
                set: (name, value, options) => {
                    req.cookies.set({ name, value, ...options });
                    res.cookies.set({ name, value, ...options });
                },
                remove: (name, options) => {
                    req.cookies.set({ name, value: '', ...options });
                    res.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    // 3. ✅ Session Management
    const { data: { session } } = await supabase.auth.getSession();

    // 4. ✅ Route Protection Logic
    if (pathname.startsWith('/admin')) {
        if (!session) {
            return NextResponse.redirect(new URL(`/cuenta/login?redirect=${pathname}`, req.url));
        }

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (profile?.role !== 'admin') {
            return NextResponse.redirect(new URL('/', req.url));
        }
    }

    if (pathname.startsWith('/cuenta') && !['/cuenta/login', '/cuenta/registro', '/cuenta/recuperar'].some(p => pathname.startsWith(p))) {
        if (!session) {
            return NextResponse.redirect(new URL(`/cuenta/login?redirect=${pathname}`, req.url));
        }
    }

    // 5. ✅ Finalize Response
    setCsrfCookie(res);
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
