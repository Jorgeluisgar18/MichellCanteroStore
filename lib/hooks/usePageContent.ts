'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PageContent, PageName } from '@/types';

interface UsePageContentReturn {
    /** Raw list of content rows for this page */
    items: PageContent[];
    /** True while fetching */
    loading: boolean;
    /** Get a value with an automatic fallback if DB has no entry */
    get: (section: string, key: string, fallback?: string) => string;
    /** Get an image URL with an automatic fallback */
    getImage: (section: string, key: string, fallback?: string) => string;
    /** Reload content from server */
    refetch: () => void;
}

/**
 * Hook to load dynamic page content from the CMS.
 * Falls back gracefully to the provided default if no DB entry exists.
 *
 * @example
 * const { get, getImage } = usePageContent('home');
 * const title = get('hero', 'title', 'Eleva tu belleza única');
 * const heroUrl = getImage('hero', 'image_url', '/hero-michell.jpg');
 */
export function usePageContent(page: PageName, initialItems?: PageContent[]): UsePageContentReturn {
    const [items, setItems] = useState<PageContent[]>(initialItems || []);
    const [loading, setLoading] = useState(!initialItems || initialItems.length === 0);

    const fetchContent = useCallback(async () => {
        if (!initialItems) setLoading(true);
        try {
            const res = await fetch(`/api/admin/content?page=${page}`, {
                // Short cache so fresh admin changes appear within ~60s
                next: { revalidate: 60 },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setItems(json.data ?? []);
        } catch (err) {
            // Non-fatal: pages will render with fallback values
            console.warn(`[usePageContent] Could not load content for "${page}":`, err);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [page, initialItems]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    /**
     * Look up a text value by section + key.
     * Returns `fallback` when no DB entry exists.
     */
    const get = useCallback(
        (section: string, key: string, fallback = ''): string => {
            const row = items.find((i) => i.section === section && i.key === key);
            return row?.value?.trim() || fallback;
        },
        [items]
    );

    /**
     * Look up an image URL by section + key.
     * Returns `fallback` when no DB entry or empty image_url.
     *
     * Cache busting: when the row has an `updated_at`, we append
     * `?v={timestamp}` so that any change in the CMS produces a new URL
     * that bypasses browser cache and CDN stale-while-revalidate.
     */
    const getImage = useCallback(
        (section: string, key: string, fallback = ''): string => {
            const row = items.find((i) => i.section === section && i.key === key);
            const rawUrl = row?.image_url?.trim() || row?.value?.trim() || fallback;

            // Only bust cache for CMS-stored URLs that have an updated_at timestamp
            if (rawUrl && row?.updated_at) {
                const ts = new Date(row.updated_at).getTime();
                // Avoid appending if URL already has query params that include 'v='
                if (!rawUrl.includes('v=')) {
                    const separator = rawUrl.includes('?') ? '&' : '?';
                    return `${rawUrl}${separator}v=${ts}`;
                }
            }

            return rawUrl;
        },
        [items]
    );

    return { items, loading, get, getImage, refetch: fetchContent };
}
