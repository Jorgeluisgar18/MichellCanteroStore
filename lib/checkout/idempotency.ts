import { normalizeEmail, normalizeOrderShippingFields } from './safety';

type IntentItem = {
    product_id: string; quantity: number;
    variant_id?: string | null | undefined; variant_name?: string | null | undefined;
};
export type CheckoutIntent = {
    shipping_name?: string | null | undefined; shipping_email?: string | null | undefined; shipping_phone?: string | null | undefined;
    shipping_address?: string | null | undefined; shipping_city?: string | null | undefined; shipping_state?: string | null | undefined;
    shipping_zip_code?: string | null | undefined; shipping_method?: string | null | undefined; shipping_location?: string | null | undefined;
    payment_method?: string | null | undefined; customer_notes?: string | null | undefined; items: IntentItem[];
};

function canonicalItems(items: IntentItem[]) {
    const quantities = new Map<string, number>();
    for (const item of items) {
        const key = JSON.stringify([item.product_id, item.variant_id ?? null, item.variant_id ? null : item.variant_name || null]);
        quantities.set(key, (quantities.get(key) ?? 0) + item.quantity);
    }
    return Array.from(quantities.entries()).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
}

export function checkoutIntentFingerprint(input: CheckoutIntent): string {
    return JSON.stringify({
        shipping_name: input.shipping_name ?? '', shipping_email: normalizeEmail(input.shipping_email),
        shipping_phone: input.shipping_phone ?? '',
        ...normalizeOrderShippingFields({ shipping_address: input.shipping_address, shipping_city: input.shipping_city,
            shipping_state: input.shipping_state, shipping_zip_code: input.shipping_zip_code }),
        shipping_method: input.shipping_method ?? 'delivery', shipping_location: input.shipping_location ?? '',
        payment_method: input.payment_method ?? 'wompi', customer_notes: input.customer_notes ?? '',
        items: canonicalItems(input.items),
    });
}

export type CheckoutAttempt = { key: string; fingerprint: string };
export function getCheckoutAttempt(previous: CheckoutAttempt | null, input: CheckoutIntent,
    createKey: () => string = () => crypto.randomUUID()): CheckoutAttempt {
    const fingerprint = checkoutIntentFingerprint(input);
    return previous?.fingerprint === fingerprint ? previous : { key: createKey(), fingerprint };
}

export function getOrderReplayStatus(
    existing: Omit<CheckoutIntent, 'items'> & { order_items?: unknown }, request: CheckoutIntent
): 'ready' | 'incomplete' | 'mismatch' {
    if (checkoutIntentFingerprint({ ...existing, items: [] }) !== checkoutIntentFingerprint({ ...request, items: [] })) return 'mismatch';
    const items = existing.order_items;
    if (!Array.isArray(items) || items.length === 0 || !items.every(item =>
        item && typeof item.product_id === 'string' && Number.isInteger(item.quantity) && item.quantity > 0
        && (item.variant_id == null || typeof item.variant_id === 'string')
        && (item.variant_name == null || typeof item.variant_name === 'string'))) return 'incomplete';
    const saved = canonicalItems(items);
    const expected = canonicalItems(request.items);
    if (JSON.stringify(saved) === JSON.stringify(expected)) return 'ready';
    const expectedQuantities = new Map(expected);
    return saved.every(([key, count]) => count <= (expectedQuantities.get(key) ?? 0)) ? 'incomplete' : 'mismatch';
}
