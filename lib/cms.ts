import { supabase } from './supabase';
import { unstable_cache } from 'next/cache';
import type { PageContent, PageName } from '@/types';

/**
 * Get dynamic page content from the CMS using unstable_cache
 * for high performance server-side rendering.
 */
export const getPageContent = unstable_cache(
    async (page: PageName): Promise<PageContent[]> => {
        try {
            const { data, error } = await supabase
                .from('page_content')
                .select('*')
                .eq('page', page);

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error(`[getPageContent] Error for page "${page}":`, err);
            return [];
        }
    },
    ['cms-content'],
    { revalidate: 300, tags: ['cms-content'] }
);

/**
 * Helper to get specific section/key content with fallbacks
 */
export async function getCmsValue(page: PageName, section: string, key: string, fallback = ''): Promise<string> {
    const content = await getPageContent(page);
    const row = content.find(i => i.section === section && i.key === key);
    return row?.value?.trim() || fallback;
}

/**
 * Helper to get specific section/key image URL with fallbacks
 */
export async function getCmsImage(page: PageName, section: string, key: string, fallback = ''): Promise<string> {
    const content = await getPageContent(page);
    const row = content.find(i => i.section === section && i.key === key);
    return row?.image_url?.trim() || fallback;
}
