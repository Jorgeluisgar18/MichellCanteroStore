import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { applyCsrfProtection, setCsrfCookie } from '@/lib/security/csrf';

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
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

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return req.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        req.cookies.set(name, value);
                        res.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Protección rutas admin
    if (pathname.startsWith('/admin')) {
        if (authError || !user) {
            return NextResponse.redirect(
                new URL(`/cuenta/login?redirect=${encodeURIComponent(pathname)}`, req.url)
            );
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('[MIDDLEWARE] Error verificando rol admin:', profileError.message);
            return NextResponse.redirect(new URL('/', req.url));
        }

        if (profile?.role !== 'admin') {
            return NextResponse.redirect(new URL('/', req.url));
        }
    }

    if (pathname.startsWith('/cuenta') && !['/cuenta/login', '/cuenta/registro', '/cuenta/recuperar'].some(p => pathname.startsWith(p))) {
        if (authError || !user) {
            return NextResponse.redirect(
                new URL(`/cuenta/login?redirect=${encodeURIComponent(pathname)}`, req.url)
            );
        }
    }

    setCsrfCookie(req, res);
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
