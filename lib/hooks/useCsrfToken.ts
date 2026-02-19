/**
 * React Hook for CSRF Protection
 * Automatically fetches and includes CSRF token in requests
 */

import { useEffect, useState } from 'react';


/**
 * Hook to get CSRF token
 */
export function useCsrfToken() {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchToken() {
            try {
                const response = await fetch('/api/csrf-token');

                if (!response.ok) {
                    throw new Error('Failed to fetch CSRF token');
                }

                // ApiResponse.success wraps data in { data: { token }, success: true }
                const body = await response.json();
                const token: string | undefined = body?.data?.token ?? body?.token;
                if (token) {
                    setToken(token);
                } else {
                    throw new Error('CSRF token not found in response');
                }
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        }

        fetchToken();
    }, []);

    return { token, loading, error };
}

/**
 * Helper to add CSRF token to fetch options
 */
export function withCsrfToken(token: string | null, options: RequestInit = {}): RequestInit {
    if (!token) {
        return options;
    }

    return {
        ...options,
        headers: {
            ...options.headers,
            'x-csrf-token': token,
        },
    };
}

/**
 * Fetch wrapper with automatic CSRF token.
 * 
 * NOTE: /api/csrf-token uses ApiResponse.success() which wraps the result
 * in { data: { token, expiresIn }, success: true }.
 * We must read from response.data.token, not response.token.
 */
export async function fetchWithCsrf(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    // Fetch the CSRF token — response shape: { data: { token }, success: true }
    const tokenResponse = await fetch('/api/csrf-token');
    const body = await tokenResponse.json();
    const token: string | undefined = body?.data?.token ?? body?.token;

    if (!token) {
        console.error('[fetchWithCsrf] No CSRF token available. Response body:', body);
    }

    // Add token to headers
    return fetch(url, withCsrfToken(token ?? '', options));
}
