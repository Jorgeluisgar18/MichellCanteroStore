/**
 * Environment variables validation and helpers
 * Ensures all required environment variables are present
 */

export function getEnvVar(key: string, defaultValue?: string): string {
    const value = process.env[key] || defaultValue;

    if (!value) {
        if (typeof window === 'undefined') {
            // Server-side: throw error
            throw new Error(`Missing required environment variable: ${key}`);
        } else {
            // Client-side: log warning
            console.warn(`Missing environment variable: ${key}`);
            return '';
        }
    }

    return value.trim();
}

export function validateSupabaseConfig() {
    const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            'Missing Supabase configuration. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
        );
    }

    return {
        supabaseUrl,
        supabaseAnonKey,
    };
}

export function getSiteUrl(): string {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    return (
        process.env.NEXT_PUBLIC_SITE_URL ||
            process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'https://michellcanterostore.com'
    );
}

