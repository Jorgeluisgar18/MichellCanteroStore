import type { CartItem } from '../../types';
import { validCartId } from './cart-session';

export type ReturnState = 'verified' | 'pending' | 'review' | 'unverified';
export type CheckoutReturnContext = { orderId: string; email: string; cartFingerprint: string; createdAt: number; cartHandled?: boolean; cartId?: string | null };
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const prefix = 'wompi-return:';
const ttl = 24 * 60 * 60 * 1000;
export const WOMPI_WEB_ACTION = 'https://checkout.wompi.co/p/';

export function cartContentsFingerprint(items: CartItem[]): string {
    return JSON.stringify(items.map(item => [item.product.id, item.selectedVariant?.id ?? null, item.quantity,
        item.product.price + (item.selectedVariant?.priceModifier ?? 0)]));
}

function validContext(value: unknown): value is CheckoutReturnContext {
    if (!value || typeof value !== 'object') return false;
    const data = value as CheckoutReturnContext;
    return typeof data.orderId === 'string' && data.orderId.length > 0 && data.orderId.length <= 200
        && typeof data.email === 'string' && data.email.includes('@') && data.email.length <= 320
        && typeof data.cartFingerprint === 'string' && data.cartFingerprint.length <= 50_000
        && (data.cartHandled === undefined || typeof data.cartHandled === 'boolean')
        && validCartId(data.cartId)
        && Number.isFinite(data.createdAt) && data.createdAt >= 0;
}

export function saveReturnContext(storage: StorageLike, context: CheckoutReturnContext): void {
    if (!validContext(context)) throw new Error('No pudimos conservar el contexto del pedido. Revisa tus datos.');
    try {
        const serialized = JSON.stringify(context);
        storage.setItem(prefix + context.orderId, serialized);
        if (storage.getItem(prefix + context.orderId) !== serialized) throw new Error('Storage write failed');
    } catch {
        throw new Error('No pudimos conservar tu pedido en esta pestaña. Habilita el almacenamiento del navegador antes de pagar.');
    }
}

export function readReturnContext(storage: StorageLike, orderId: string, now = Date.now()): CheckoutReturnContext | null {
    try {
        const parsed: unknown = JSON.parse(storage.getItem(prefix + orderId) ?? 'null');
        if (validContext(parsed) && parsed.orderId === orderId && parsed.createdAt <= now + 60_000
            && now - parsed.createdAt <= ttl) return parsed;
        storage.removeItem(prefix + orderId);
        return null;
    } catch { return null; }
}

export function buildWompiWebFields(input: unknown, siteOrigin: string, orderId: string): Record<string, string> {
    const params = input as Record<string, unknown> | null;
    const invalid = () => new Error('Los parámetros de pago no son válidos. No se inició el pago.');
    if (!params || typeof params.publicKey !== 'string' || !params.publicKey.startsWith('pub_')
        || params.currency !== 'COP' || !Number.isSafeInteger(params.amountInCents) || Number(params.amountInCents) <= 0
        || typeof params.reference !== 'string' || !params.reference.trim() || params.reference.length > 200
        || typeof params.signature !== 'string' || !/^[a-f0-9]{64}$/i.test(params.signature)
        || typeof params.redirectUrl !== 'string') throw invalid();
    let redirect: URL;
    try { redirect = new URL(params.redirectUrl); } catch { throw invalid(); }
    if (redirect.origin !== new URL(siteOrigin).origin || redirect.pathname !== '/checkout/confirmacion'
        || redirect.searchParams.get('orderId') !== orderId || redirect.searchParams.getAll('orderId').length !== 1
        || redirect.username || redirect.password || redirect.hash
        || Array.from(redirect.searchParams.keys()).some(key => key !== 'orderId')) throw invalid();
    return { 'public-key': params.publicKey, currency: 'COP', 'amount-in-cents': String(params.amountInCents),
        reference: params.reference, 'signature:integrity': params.signature, 'redirect-url': redirect.href };
}

export function submitWompiWeb(fields: Record<string, string>, doc: Document = document): void {
    const form = doc.createElement('form');
    form.action = WOMPI_WEB_ACTION;
    form.method = 'GET';
    form.target = '_self';
    form.acceptCharset = 'UTF-8';
    form.style.display = 'none';
    for (const [name, value] of Object.entries(fields)) {
        const input = doc.createElement('input');
        input.type = 'hidden'; input.name = name; input.value = value;
        form.appendChild(input);
    }
    doc.body.appendChild(form);
    try { form.submit(); } finally { form.remove(); }
}

const inFlight = new Map<string, Promise<ReturnState>>();
export function verifyCheckoutReturn(context: CheckoutReturnContext, transactionId: string,
    post: (url: string, init: RequestInit) => Promise<Response>): Promise<ReturnState> {
    if (!validContext(context) || !transactionId.trim() || transactionId.length > 256) return Promise.resolve('unverified');
    const key = JSON.stringify([context.orderId, context.email, transactionId]);
    const existing = inFlight.get(key);
    if (existing) return existing;
    const request = (async (): Promise<ReturnState> => {
        try {
            const response = await post('/api/payments/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: context.orderId, email: context.email, transactionId }) });
            if (response.status === 202) return 'pending';
            if (response.status === 409) return 'review';
            if (response.status !== 200) return 'unverified';
            const payload = await response.json();
            return payload?.data?.orderId === context.orderId && ['reconciled', 'already_paid'].includes(payload.data.status)
                ? 'verified' : 'unverified';
        } catch { return 'unverified'; }
    })().finally(() => { inFlight.delete(key); });
    inFlight.set(key, request);
    return request;
}
