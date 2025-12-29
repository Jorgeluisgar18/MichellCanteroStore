import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid SSR issues
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseUrl(): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
    }
    return url;
}

function getSupabaseAnonKey(): string {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) {
        throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined');
    }
    return key;
}

// Getter for the public Supabase client (use this in client components)
export function getSupabase(): SupabaseClient {
    if (typeof window === 'undefined') {
        // During SSR, create a new instance each time (safe for server)
        return createClient(getSupabaseUrl(), getSupabaseAnonKey());
    }

    // In browser, reuse the singleton instance
    if (!supabaseInstance) {
        supabaseInstance = createClient(getSupabaseUrl(), getSupabaseAnonKey());
    }
    return supabaseInstance;
}

// For backwards compatibility - creates client lazily only in browser
// This prevents SSR crashes when env vars aren't available during static generation
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        const client = getSupabase();
        const value = client[prop as keyof SupabaseClient];
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    }
});

// Cliente para operaciones del servidor con service role
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);
