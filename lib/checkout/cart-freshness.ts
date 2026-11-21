import type { CartItem, Product } from '../../types';
import { resolveVariantSelection, validateSelectionLines } from './variant-selection';

export function cartLineTotal(item: CartItem): number {
    return (item.product.price + (item.selectedVariant?.priceModifier ?? 0)) * item.quantity;
}

export async function refreshCartCatalog(items: CartItem[], fetcher: typeof fetch = fetch): Promise<{ items: CartItem[]; priceChanged: boolean }> {
    if (!items.length) throw new Error('Tu carrito está vacío.');
    const products = new Map<string, Product>();
    const ids = Array.from(new Set(items.map(item => item.product.id)));
    // Bound catalog reads without downloading the entire store or adding polling.
    for (let offset = 0; offset < ids.length; offset += 4) {
        await Promise.all(ids.slice(offset, offset + 4).map(async id => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10_000);
            try {
                const response = await fetcher(`/api/products/${encodeURIComponent(id)}`, { cache: 'no-store', signal: controller.signal });
                if (response.status === 404) throw new Error('Un producto ya no está disponible. Revisa tu carrito.');
                if (!response.ok) throw new Error('No pudimos verificar el carrito. Intenta nuevamente.');
                const payload = await response.json();
                const product = payload?.data;
                if (!product || product.id !== id || typeof product.name !== 'string' || !product.name.trim()
                    || !Array.isArray(product.images) || !product.images.every((value: unknown) => typeof value === 'string')) {
                    throw new Error('No pudimos verificar los productos del carrito. Intenta nuevamente.');
                }
                products.set(id, product);
            } finally {
                clearTimeout(timer);
            }
        }));
    }
    const next = items.map(item => {
        const product = products.get(item.product.id)!;
        const selection = resolveVariantSelection(product, item.selectedVariant?.id);
        if (!selection.ok) throw new Error('Un producto o variante ya no está disponible. Revisa tu carrito.');
        return { product, quantity: item.quantity, selectedVariant: selection.variant };
    });
    const error = validateSelectionLines(Array.from(products.values()), next.map(item => ({
        product_id: item.product.id, quantity: item.quantity, variant_id: item.selectedVariant?.id,
    })));
    if (error) throw new Error(error);
    return { items: next, priceChanged: next.some((item, index) =>
        // eslint-disable-next-line security/detect-object-injection -- Numeric index from the one-to-one items.map above; no user-controlled property key.
        cartLineTotal(item) !== cartLineTotal(items[index]!)) };
}
