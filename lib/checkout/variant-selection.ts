import type { ProductVariant } from '../../types/product';

export type SelectionProduct = {
    id: string;
    price: number;
    stock_quantity: number | null;
    in_stock: boolean | null;
    variants?: unknown;
};
type SelectionLine = { product_id: string; quantity: number; variant_id?: string | null | undefined };
type SelectionResult = { ok: true; variant: ProductVariant | undefined; price: number; capacity: number }
    | { ok: false; error: string };

export function resolveVariantSelection(product: SelectionProduct, variantId?: string | null): SelectionResult {
    const invalid = { ok: false, error: 'Selecciona una variante disponible del producto.' } as const;
    if (product.in_stock !== true || !Number.isInteger(product.stock_quantity) || (product.stock_quantity ?? 0) <= 0) return invalid;
    if (!Number.isFinite(product.price) || product.price < 0) return invalid;
    if (product.variants != null && !Array.isArray(product.variants)) return invalid;
    const variants: unknown[] = Array.isArray(product.variants) ? product.variants : [];
    if (variants.length === 0) {
        return variantId == null ? { ok: true, variant: undefined, price: product.price, capacity: product.stock_quantity! } : invalid;
    }
    const identities = new Set<string>();
    let total = 0;
    for (const entry of variants) {
        if (!entry || typeof entry !== 'object') return invalid;
        const value = entry as Record<string, unknown>;
        const modifier = value.priceModifier ?? 0;
        if (typeof value.id !== 'string' || !value.id.trim() || value.id.length > 200 || identities.has(value.id)
            || typeof value.name !== 'string' || !value.name.trim() || typeof value.inStock !== 'boolean'
            || !Number.isInteger(value.stock_quantity) || (value.stock_quantity as number) < 0
            || value.inStock !== ((value.stock_quantity as number) > 0)
            || typeof modifier !== 'number' || !Number.isFinite(modifier)
            || !Number.isFinite(product.price + modifier) || product.price + modifier < 0) return invalid;
        identities.add(value.id);
        total += value.stock_quantity as number;
    }
    if (!Number.isSafeInteger(total) || total !== product.stock_quantity) return invalid;
    if (typeof variantId !== 'string' || !variantId.trim() || variantId.length > 200) return invalid;
    const matches = variants.filter((value): value is Record<string, unknown> =>
        !!value && typeof value === 'object' && 'id' in value && value.id === variantId);
    if (matches.length !== 1) return invalid;
    const value = matches[0]!;
    if (typeof value.name !== 'string' || !value.name.trim() || value.inStock !== true
        || !Number.isInteger(value.stock_quantity) || (value.stock_quantity as number) <= 0) return invalid;
    const modifier = value.priceModifier == null ? 0 : value.priceModifier;
    if (typeof modifier !== 'number' || !Number.isFinite(modifier) || product.price + modifier < 0) return invalid;
    return { ok: true, variant: value as unknown as ProductVariant, price: product.price + modifier,
        capacity: Math.min(product.stock_quantity!, value.stock_quantity as number) };
}

export function getSelectionCapacity(product: SelectionProduct, variantId?: string | null): number {
    const selection = resolveVariantSelection(product, variantId);
    return selection.ok ? selection.capacity : 0;
}

export function validateSelectionLines(products: SelectionProduct[], lines: SelectionLine[]): string | null {
    const productTotals = new Map<string, number>();
    const variantTotals = new Map<string, number>();
    for (const line of lines) {
        if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100) return 'Cantidad de producto inválida.';
        const product = products.find(value => value.id === line.product_id);
        if (!product) return 'Producto no encontrado.';
        const selection = resolveVariantSelection(product, line.variant_id);
        if (!selection.ok) return selection.error;
        const productTotal = (productTotals.get(product.id) ?? 0) + line.quantity;
        const key = JSON.stringify([product.id, line.variant_id ?? null]);
        const variantTotal = (variantTotals.get(key) ?? 0) + line.quantity;
        if (productTotal > product.stock_quantity! || variantTotal > selection.capacity) return 'La cantidad solicitada ya no está disponible.';
        productTotals.set(product.id, productTotal);
        variantTotals.set(key, variantTotal);
    }
    return null;
}
