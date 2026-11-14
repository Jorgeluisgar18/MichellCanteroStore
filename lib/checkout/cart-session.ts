import type { CartItem } from '../../types';

export type CartSession = { items: CartItem[]; cartId?: string | null };
export const CART_STORAGE_KEY = 'cart-storage';
export function formatCheckoutUuid(source: Uint8Array, version: 4 | 8): string {
    const bytes = source.slice(0, 16);
    if (bytes.length !== 16) throw new Error('Invalid UUID entropy');
    bytes[6] = (bytes[6]! & 0x0f) | (version << 4);
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

export function createCartCycleId(): string | null {
    const api = globalThis.crypto;
    if (api?.randomUUID) return api.randomUUID();
    return api?.getRandomValues ? formatCheckoutUuid(api.getRandomValues(new Uint8Array(16)), 4) : null;
}

export function validCartId(value: unknown): value is string | null | undefined {
    return value == null || typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function synchronizeCartStorage(storage: Pick<Storage, 'getItem'>, store: {
    getState(): CartSession;
    setState(state: { items: CartItem[]; cartId: string | null }): void;
}): boolean {
    try {
        const raw = storage.getItem(CART_STORAGE_KEY);
        const saved = raw === null ? { items: [], cartId: null } : JSON.parse(raw)?.state;
        if (!saved || !Array.isArray(saved.items) || !validCartId(saved.cartId)
            || !saved.items.every((item: CartItem) => item && typeof item.product?.id === 'string'
                && Number.isInteger(item.quantity) && item.quantity > 0)) throw new Error('Invalid stored cart');
        const current = store.getState();
        const cartId = saved.cartId ?? null;
        if (JSON.stringify([current.cartId ?? null, current.items]) === JSON.stringify([cartId, saved.items])) return false;
        store.setState({ items: saved.items, cartId });
        return true;
    } catch {
        throw new Error('No pudimos verificar el carrito guardado. Revisa el almacenamiento del navegador antes de continuar.');
    }
}
