import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Singleton instance for browser
let _supabaseClient: SupabaseClient | null = null;

/**
 * Get the Supabase client for browser/client-side usage.
 * Uses lazy initialization to avoid SSR issues.
 */
export function getSupabase(): SupabaseClient {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase environment variables are missing:', {
            hasUrl: !!supabaseUrl,
            hasAnonKey: !!supabaseAnonKey,
        });
        throw new Error(
            'Missing Supabase configuration. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
        );
    }

    if (!_supabaseClient) {
        _supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    }
    return _supabaseClient;
}

/**
 * Supabase client singleton for client-side use.
 * Creates the client immediately if env vars are available,
 * otherwise creates a lazy proxy.
 */
export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : new Proxy({} as SupabaseClient, {
        get(_target, prop: string | symbol) {
            const client = getSupabase();
            const key = prop as keyof SupabaseClient;
            const value = client[key];
            if (typeof value === 'function') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (value as (...args: unknown[]) => unknown).bind(client);
            }
            return value;
        }
    });

/**
 * Admin client for server-side operations (API routes).
 * Uses service role key for elevated privileges.
 * Falls back to regular client if service key not available.
 */
export const supabaseAdmin: SupabaseClient = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
    : supabase; // Fall back to regular client if no service key
