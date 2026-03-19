import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const requestUrl = new URL(request.url);
        const code = requestUrl.searchParams.get('code');
        const next = requestUrl.searchParams.get('next') || '/';
        const error = requestUrl.searchParams.get('error');
        const errorDescription = requestUrl.searchParams.get('error_description');

        // Handle OAuth errors
        if (error) {
            console.error('OAuth error:', error, errorDescription);
            const errorUrl = new URL('/cuenta/login', request.url);
            errorUrl.searchParams.set('error', 'auth_error');
            errorUrl.searchParams.set('message', errorDescription || 'Error al autenticar');
            return NextResponse.redirect(errorUrl);
        }

        if (!code) {
            // No code provided, redirect to login
            return NextResponse.redirect(new URL('/cuenta/login', request.url));
        }

        // Validate environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Missing Supabase environment variables in callback');
            const errorUrl = new URL('/cuenta/login', request.url);
            errorUrl.searchParams.set('error', 'config_error');
            return NextResponse.redirect(errorUrl);
        }

        const cookieStore = cookies();
        const supabase = createServerClient(
            supabaseUrl,
            supabaseAnonKey,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set({ name, value, ...options });
                            });
                        } catch (error) {
                            // Cookie might already be set, ignore
                            console.warn('Cookie set warning:', error);
                        }
                    },
                },
            }
        );

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
            console.error('Error exchanging code for session:', exchangeError);
            const errorUrl = new URL('/cuenta/login', request.url);
            errorUrl.searchParams.set('error', 'exchange_error');
            errorUrl.searchParams.set('message', exchangeError.message);
            return NextResponse.redirect(errorUrl);
        }

        // Successful authentication, redirect to next URL
        const redirectUrl = new URL(next, request.url);
        return NextResponse.redirect(redirectUrl);
    } catch (error: unknown) {
        console.error('Callback route error:', error);
        const errorUrl = new URL('/cuenta/login', request.url);
        errorUrl.searchParams.set('error', 'unexpected_error');
        errorUrl.searchParams.set('message', 'Ocurrió un error inesperado');
        return NextResponse.redirect(errorUrl);
    }
}
