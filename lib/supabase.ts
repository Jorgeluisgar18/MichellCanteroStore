import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Singleton instance for browser
let _supabaseClient: SupabaseClient | null = null;

/**
 * Get the Supabase client for browser/client-side usage.
 * Uses lazy initialization to avoid SSR issues and ensures cookie synchronization.
 */
export function getSupabase(): SupabaseClient {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Missing Supabase configuration. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
        );
    }

    if (!_supabaseClient) {
        _supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
    }
    return _supabaseClient;
}

/**
 * Supabase client singleton for client-side use.
 * Synchronized with cookies via auth-helpers.
 */
export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
    ? createBrowserClient(supabaseUrl, supabaseAnonKey)
    : new Proxy({} as SupabaseClient, {
        get(_target, prop: string | symbol) {
            const client = getSupabase();
            const key = prop as keyof SupabaseClient;
            return client[key];
        }
    });

/**
 * Admin client for server-side operations (API routes).
 * Uses service role key for elevated privileges.
 */
export const supabaseAdmin: SupabaseClient = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
    : supabase;
