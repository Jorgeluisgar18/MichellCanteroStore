import type { Product } from '@/types';

export function matchesStorefrontSelection(product: Pick<Product, 'category' | 'is_new'>, filter: string, category: string): boolean {
    if (filter === 'new' && !product.is_new) return false;
    return !category || product.category?.toLowerCase() === category.toLowerCase();
}

export async function loadStorefrontProducts(signal: AbortSignal, request: typeof fetch = fetch): Promise<Product[]> {
    const response = await request('/api/products', { cache: 'no-store', signal });
    if (!response.ok) throw new Error(`Catalog request failed: HTTP ${response.status}`);

    const payload: { data?: { products?: unknown } | null } | null = await response.json();
    const products = payload?.data?.products;
    if (!Array.isArray(products)) throw new Error('Invalid catalog response');
    return products;
}
