import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Singleton instance for browser
 */
let _supabaseClient: SupabaseClient | null = null;

/**
 * Get the Supabase client for browser/client-side usage.
 */
export function getSupabase(): SupabaseClient {
    if (!_supabaseClient) {
        _supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
    }
    return _supabaseClient;
}

/**
 * Supabase client instance for client-side use.
 */
export const supabase: SupabaseClient = typeof window !== 'undefined'
    ? getSupabase()
    : createBrowserClient(supabaseUrl, supabaseAnonKey);

/**
 * Admin client for server-side operations (API routes).
 */
export const supabaseAdmin: SupabaseClient = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    })
    : supabase;
