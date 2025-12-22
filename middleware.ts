import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();

    // Create authenticated Supabase Client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name) {
                    return req.cookies.get(name)?.value
                },
                set(name, value, options) {
                    req.cookies.set({ name, value, ...options })
                    res.cookies.set({ name, value, ...options })
                },
                remove(name, options) {
                    req.cookies.set({ name, value: '', ...options })
                    res.cookies.set({ name, value: '', ...options })
                },
            },
        }
    );

    // Refresh session if expired
    const {
        data: { session },
    } = await supabase.auth.getSession();

    // Proteger rutas de admin
    if (req.nextUrl.pathname.startsWith('/admin')) {
        if (!session) {
            const redirectUrl = new URL('/cuenta/login', req.url);
            redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
            return NextResponse.redirect(redirectUrl);
        }

        // Verificar que el usuario sea admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.redirect(new URL('/', req.url));
        }
    }

    // Proteger rutas de cuenta (requieren autenticación)
    if (req.nextUrl.pathname.startsWith('/cuenta') &&
        !req.nextUrl.pathname.includes('/login') &&
        !req.nextUrl.pathname.includes('/registro')) {
        if (!session) {
            return NextResponse.redirect(new URL('/cuenta/login', req.url));
        }
    }

    return res;
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/cuenta/:path*',
    ],
};
