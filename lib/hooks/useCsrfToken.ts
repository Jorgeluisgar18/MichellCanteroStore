/**
 * React Hook for CSRF Protection
 * Automatically fetches and includes CSRF token in requests
 */

import { useEffect, useState } from 'react';

interface CsrfToken {
    token: string;
    expiresIn: number;
}

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

                const data: CsrfToken = await response.json();
                setToken(data.token);
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
 * Fetch wrapper with automatic CSRF token
 */
export async function fetchWithCsrf(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    // Get CSRF token from API
    const tokenResponse = await fetch('/api/csrf-token');
    const { token } = await tokenResponse.json();

    // Add token to headers
    return fetch(url, withCsrfToken(token, options));
}
