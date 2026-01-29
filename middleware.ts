import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';
import { applyCsrfProtection, setCsrfCookie } from '@/lib/security/csrf';

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();

    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase environment variables in middleware');
        return res;
    }

    // ✅ CRITICAL: Skip middleware for webhook endpoints (Wompi needs to POST without auth)
    if (req.nextUrl.pathname.startsWith('/api/payments/webhook')) {
        return res;
    }

    // ✅ SECURITY: Apply CSRF protection to state-changing requests
    const csrfError = applyCsrfProtection(req);
    if (csrfError) {
        return csrfError;
    }

    try {
        // Create authenticated Supabase Client
        const supabase = createServerClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                cookies: {
                    get(name: string) {
                        return req.cookies.get(name)?.value;
                    },
                    set(name: string, value: string, options: Record<string, unknown>) {
                        req.cookies.set({ name, value, ...options });
                        res.cookies.set({ name, value, ...options });
                    },
                    remove(name: string, options: Record<string, unknown>) {
                        req.cookies.set({ name, value: '', ...options });
                        res.cookies.set({ name, value: '', ...options });
                    },
                },
            }
        );

        // Refresh session if expired
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
            console.error('Session error in middleware:', sessionError);
        }

        // Proteger rutas de admin
        if (req.nextUrl.pathname.startsWith('/admin')) {
            if (!session) {
                const redirectUrl = new URL('/cuenta/login', req.url);
                redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
                return NextResponse.redirect(redirectUrl);
            }

            // Verificar que el usuario sea admin
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (profileError || profile?.role !== 'admin') {
                return NextResponse.redirect(new URL('/', req.url));
            }
        }

        // Proteger rutas de cuenta (requieren autenticación)
        if (req.nextUrl.pathname.startsWith('/cuenta') &&
            !req.nextUrl.pathname.includes('/login') &&
            !req.nextUrl.pathname.includes('/registro') &&
            !req.nextUrl.pathname.includes('/recuperar')) {
            if (!session) {
                const redirectUrl = new URL('/cuenta/login', req.url);
                redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
                return NextResponse.redirect(redirectUrl);
            }
        }

        // ✅ SECURITY: Set CSRF cookie for client
        setCsrfCookie(res);

        return res;
    } catch (error) {
        console.error('Middleware error:', error);
        // En caso de error, permitir continuar pero loguear el error
        return res;
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api (General API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
        '/admin/:path*',
        '/cuenta/:path*',
        /*
         * Specifically match API routes that need CSRF protection (base and sub-paths)
         */
        '/api/orders',
        '/api/orders/:path*',
        '/api/products',
        '/api/products/:path*',
        '/api/profiles',
        '/api/profiles/:path*',
        '/api/admin',
        '/api/admin/:path*',
    ],
};
