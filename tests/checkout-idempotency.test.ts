import { it } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';
import { checkoutIntentFingerprint, getCheckoutAttempt, getOrderReplayStatus } from '../lib/checkout/idempotency';

it('keys checkout attempts by meaningful intent, not display snapshots or request count', () => {
    const input = { shipping_email: 'buyer@example.test', items: [{ product_id: 'product-1', quantity: 2 }] };
    const first = getCheckoutAttempt(null, input, () => 'key-1');
    assert.equal(getCheckoutAttempt(first, input, () => 'unexpected-new-key'), first);
    assert.equal(getCheckoutAttempt(first, { ...input, items: [{ product_id: 'product-1', quantity: 3 }] }, () => 'key-2').key, 'key-2');
    const displayChange = { ...input, items: [{ ...input.items[0]!, product_price: 999, product_name: 'new title' }] };
    assert.equal(checkoutIntentFingerprint(displayChange), first.fingerprint);
    assert.notEqual(checkoutIntentFingerprint({ ...input, items: [{ ...input.items[0]!, variant_name: 'Red' }] }),
        checkoutIntentFingerprint({ ...input, items: [{ ...input.items[0]!, variant_name: 'Blue' }] }),
        'the existing API persists variant labels, so replay identity must preserve them');
    assert.equal(checkoutIntentFingerprint({ ...input, items: [{ product_id: 'product-1', quantity: 1 }, { product_id: 'product-1', quantity: 1 }] }), first.fingerprint);
    assert.equal(getOrderReplayStatus({ ...input, order_items: input.items }, input), 'ready');
    const labelled = { ...input, items: [{ ...input.items[0]!, variant_name: 'Red' }] };
    assert.equal(getOrderReplayStatus({ ...input, order_items: [{ ...input.items[0]!, variant_name: 'Blue' }] }, labelled), 'mismatch');
    assert.equal(getOrderReplayStatus({ ...input, order_items: [] }, input), 'incomplete');
    assert.equal(getOrderReplayStatus({ ...input, order_items: [{ product_id: 'product-1', quantity: 1 }] }, input), 'incomplete');
    assert.equal(getOrderReplayStatus({ ...input, order_items: [{ product_id: 'other-product', quantity: 2 }] }, input), 'mismatch');
    const selected = { ...input, items: [{ ...input.items[0]!, variant_id: 'legacy-red', variant_name: 'Client label' }] };
    assert.equal(getOrderReplayStatus({ ...input, order_items: [{ ...selected.items[0]!, variant_name: 'Catalog label' }] }, selected), 'ready');
});

it('retains retry keys, suppresses overlapping submissions and keeps dismiss buttons non-submitting', async () => {
    const require = createRequire(join(process.cwd(), 'package.json'));
    const React = require('react');
    const loader = Module as unknown as { _load: (name: string, parent: { filename?: string }, main: boolean) => unknown };
    const original = loader._load;
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const reactDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'React');
    const originalError = console.error;
    console.error = () => undefined;
    let state = 0;
    const item = { product: { id: 'product-1', name: 'Fixture', price: 100, images: ['https://example.test/product.jpg'] }, quantity: 1 };
    const sent: Record<string, unknown>[] = [];
    let pending: Promise<Response> | null = null;
    let onSend: (() => void) | undefined;
    const { STORE_CONFIG: config } = require(join(process.cwd(), 'lib/config.ts'));
    const dummy = () => null;
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {
        localStorage: { getItem: () => JSON.stringify({ state: { items: [item], cartId: null } }) },
    } });
    Object.defineProperty(globalThis, 'React', { configurable: true, value: React });
    loader._load = function(name, parent, main) {
        if (name === 'react' && parent.filename?.endsWith('CheckoutClient.tsx')) return { ...React,
            useState(initial: unknown) {
                const index = state++;
                const value = index === 1 ? 'Fixture error' : initial;
                return [value, () => undefined];
            }, useRef: (initial: unknown) => ({ current: initial }), useEffect() {},
        };
        if (name === 'next/navigation') return { useRouter: () => ({ replace() {}, push() {} }) };
        if (name === '@/lib/checkout/use-cart-session') return { useCartSession: () => true };
        if (name === 'next/script') return { default: dummy };
        if (name.startsWith('@/components/')) return { default: dummy, Card: dummy, useToast: () => ({ showToast() {} }) };
        if (name === '@/store/cartStore') {
            const cart = { items: [item], getSubtotal: () => 100, clearCart() {}, replaceSnapshot() { return true; } };
            return { useCartStore: Object.assign(() => cart, { getState: () => cart }) };
        }
        if (name === '@/lib/checkout/cart-freshness') return {
            refreshCartCatalog: async (items: unknown[]) => ({ items, priceChanged: false }),
            cartLineTotal: (item: { product: { price: number }; quantity: number }) => item.product.price * item.quantity,
        };
        if (name === '@/lib/config') return { STORE_CONFIG: config };
        if (name === '@/lib/hooks/useCsrfToken') return { fetchWithCsrf: async (_url: string, options: RequestInit) => {
            sent.push(JSON.parse(String(options.body)));
            onSend?.();
            if (pending) return pending;
            throw new Error('Synthetic lost response');
        } };
        return original.call(this, name, parent, main);
    };
    try {
        const Checkout = require(join(process.cwd(), 'app/checkout/CheckoutClient.tsx')).default;
        const tree = Checkout();
        type Element = { type: unknown; props: { children?: unknown; onSubmit?: (event: { preventDefault(): void }) => Promise<void>; onClick?: unknown; type?: string } };
        const nodes: Element[] = [];
        const walk = (node: unknown): void => {
            if (Array.isArray(node)) { node.forEach(walk); return; }
            if (!node || typeof node !== 'object' || !('props' in node)) return;
            const element = node as Element;
            nodes.push(element);
            walk(element.props.children);
        };
        walk(tree);
        const submit = nodes.find(node => node.type === 'form')?.props.onSubmit;
        assert.ok(submit);
        const event = { preventDefault() {} };
        await submit(event); await submit(event);
        assert.equal(sent.length, 2);
        assert.equal(sent[0]?.idempotency_key, sent[1]?.idempotency_key, 'transport failure must retain retry identity');
        state = 0;
        const reloadedStart = nodes.length;
        walk(Checkout());
        const reloadedSubmit = nodes.slice(reloadedStart).find(node => node.type === 'form')?.props.onSubmit;
        assert.ok(reloadedSubmit);
        await reloadedSubmit(event);
        assert.equal(sent[0]?.idempotency_key, sent[sent.length - 1]?.idempotency_key, 'a fresh checkout instance must recover the same creation attempt');
        item.quantity = 2;
        await submit(event);
        assert.notEqual(sent[sent.length - 2]?.idempotency_key, sent[sent.length - 1]?.idempotency_key, 'changed checkout intent needs a different key');
        sent.length = 0;
        let finish!: (response: Response) => void;
        pending = new Promise(resolve => { finish = resolve; });
        const sending = new Promise<void>(resolve => { onSend = resolve; });
        const first = submit(event), second = submit(event);
        await sending;
        try { assert.equal(sent.length, 1, 'synchronous guard must work before React can rerender'); }
        finally {
            finish(new Response(JSON.stringify({ error: 'Synthetic rejected response' }), { status: 409 }));
            await Promise.all([first, second]);
        }
        const dismiss = nodes.find(node => node.type === 'button' && node.props.onClick);
        assert.ok(dismiss);
        assert.equal(dismiss.props.type, 'button');
    } finally {
        loader._load = original;
        console.error = originalError;
        if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor); else Reflect.deleteProperty(globalThis, 'window');
        if (reactDescriptor) Object.defineProperty(globalThis, 'React', reactDescriptor); else Reflect.deleteProperty(globalThis, 'React');
    }
});
