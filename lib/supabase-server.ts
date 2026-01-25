import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Create a Supabase client for use in Server Components and Route Handlers
 * This properly handles cookies and sessions
 */
export function createClient() {
    const cookieStore = cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: Record<string, unknown>) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch {
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: Record<string, unknown>) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch {
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
}
