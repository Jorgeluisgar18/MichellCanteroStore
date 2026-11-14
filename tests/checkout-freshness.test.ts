import { it } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';
import { useCartStore } from '../store/cartStore';
import type { Product } from '../types';

it('updates changed prices for review, blocks stale reads and never opens payment with an unreviewed amount', async () => {
    const require = createRequire(join(process.cwd(), 'package.json'));
    const React = require('react');
    const loader = Module as unknown as { _load: (name: string, parent: { filename?: string }, main: boolean) => unknown };
    const original = loader._load;
    const oldFetch = globalThis.fetch;
    const descriptors = ['React', 'window', 'document'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
    const oldError = console.error;
    const product = { id: 'p', name: 'Fixture', price: 100, images: [], in_stock: true, stock_quantity: 10, variants: [] } as unknown as Product;
    const store = useCartStore;
    const resetCart = () => store.setState({ items: [{ product, quantity: 1 }] });
    resetCart();
    let current = product;
    let hydrated = false, redirects = 0;
    let remoteCartRaw: string | null | undefined;
    let read: (() => Promise<Response>) | undefined;
    let posts = 0, opened = 0, orderTotal = 100, paramsDelta = 0;
    let editBeforePayment = false;
    let recoveryMode = '', recoveryNavigations = 0;
    const slots: unknown[] = [];
    let cursor = 0;
    const dummy = () => null;
    const { STORE_CONFIG: config } = require(join(process.cwd(), 'lib/config.ts'));
    let restore = () => {};
    const storage = new Map<string, string>();
    let storageDenied = false;
    const form = { action: '', method: '', target: '', acceptCharset: '', style: {}, appendChild() {}, remove() {}, submit() {
        assert.equal(form.action, 'https://checkout.wompi.co/p/'); assert.equal(form.target, '_self'); opened++;
    } };
    Object.defineProperty(globalThis, 'React', { configurable: true, value: React });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin: 'https://store.test' },
        localStorage: { getItem: () => remoteCartRaw === undefined ? JSON.stringify({ state: { items: store.getState().items, cartId: store.getState().cartId } }) : remoteCartRaw },
        sessionStorage: { setItem: (key: string, value: string) => { if (storageDenied) throw new Error('denied'); storage.set(key, value); }, getItem: (key: string) => storage.get(key) ?? null },
        addEventListener(_name: string, listener: () => void) { restore = listener; }, removeEventListener() {},
    } });
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: (name: string) => name === 'form' ? form : {}, body: { appendChild() {} } } });
    globalThis.fetch = async () => read ? read() : new Response(JSON.stringify({ data: current }));
    console.error = () => undefined;
    loader._load = function(name, parent, main) {
        if (name === 'react' && parent.filename?.endsWith('CheckoutClient.tsx')) return { ...React,
            useState(initial: unknown) {
                const index = cursor++;
                if (!(index in slots)) slots[index] = initial && typeof initial === 'object' && 'shippingMethod' in initial
                    ? { ...initial, shippingMethod: 'pickup', email: 'buyer@example.test' } : initial;
                return [slots[index], (value: unknown) => { slots[index] = value; }];
            },
            useRef(initial: unknown) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
            useEffect(effect: () => void, deps: unknown[]) {
                const index = cursor++, key = JSON.stringify(deps);
                if (slots[index] !== key) { slots[index] = key; effect(); }
            },
        };
        if (name === '@/store/cartStore') return { useCartStore: Object.assign(() => store.getState(), { getState: store.getState, setState: store.setState }) };
        if (name === 'next/navigation') return { useRouter: () => ({ replace() { redirects++; }, push(url: string) {
            assert.equal(url, '/checkout/confirmacion?orderId=order'); recoveryNavigations++;
        } }) };
        if (name === '@/lib/checkout/use-cart-session') return { useCartSession: () => hydrated };
        if (name === 'next/script') return { default: dummy };
        if (name.startsWith('@/components/')) return { default: dummy, Card: dummy, useToast: () => ({ showToast() {} }) };
        if (name === '@/lib/config') return { STORE_CONFIG: config };
        if (name === '@/lib/hooks/useCsrfToken') return { fetchWithCsrf: async (url: string) => {
            posts++;
            if (url !== '/api/orders' && recoveryMode === 'network') throw new Error('lost response');
            if (url !== '/api/orders' && recoveryMode === 'existing') return new Response('{}', { status: 202 });
            if (editBeforePayment && url !== '/api/orders') store.getState().updateQuantity('p', 2);
            return new Response(JSON.stringify({ data: url === '/api/orders'
                ? { id: 'order', order_number: 'ref', total: orderTotal }
                : { publicKey: 'pub_test_fixture', currency: 'COP', reference: 'ref', signature: 'a'.repeat(64),
                    redirectUrl: 'https://store.test/checkout/confirmacion?orderId=order', amountInCents: orderTotal * 100 + paramsDelta } }));
        } };
        return original.call(this, name, parent, main);
    };
    type Element = { type: unknown; props: { children?: unknown; onSubmit?: (event: { preventDefault(): void }) => Promise<void> } };
    const nodes = (tree: unknown): Element[] => {
        const found: Element[] = [];
        const walk = (node: unknown): void => {
            if (Array.isArray(node)) { node.forEach(walk); return; }
            if (!node || typeof node !== 'object' || !('props' in node)) return;
            const element = node as Element; found.push(element); walk(element.props.children);
        };
        walk(tree); return found;
    };
    try {
        const Checkout = require(join(process.cwd(), 'app/checkout/CheckoutClient.tsx')).default;
        const render = () => { cursor = 0; return nodes(Checkout()); };
        const submit = () => render().find(node => node.type === 'form')!.props.onSubmit!({ preventDefault() {} });
        assert.equal(render().some(node => node.type === 'form'), false);
        assert.equal(redirects, 0, 'unhydrated carts must not redirect or expose checkout submission');
        hydrated = true;
        current = { ...product, price: 120 };
        await submit();
        assert.equal(posts, 0, 'price changes require explicit review before creating an order');
        assert.equal(opened, 0);
        assert.equal(store.getState().getSubtotal(), 120);
        orderTotal = 120;
        await submit();
        assert.equal(opened, 1, 'second submission may proceed at the reviewed amount');
        await submit(); assert.equal(opened, 1, 'handoff keeps the submit guard until document navigation');
        assert.equal(store.getState().items.length, 1, 'departure must not clear the cart');
        restore();
        resetCart(); current = product; posts = 0; opened = 0;
        let finish!: (response: Response) => void;
        read = () => new Promise(resolve => { finish = resolve; });
        const first = submit(), second = submit();
        store.getState().updateQuantity('p', 2);
        finish(new Response(JSON.stringify({ data: product })));
        await Promise.all([first, second]);
        assert.equal(posts, 0, 'an obsolete refresh must not submit the old quantity');
        assert.equal(store.getState().items[0]?.quantity, 2);
        read = undefined; resetCart(); orderTotal = 999;
        await submit();
        assert.equal(posts, 1, 'an order-total mismatch must stop before payment parameters');
        assert.equal(opened, 0);
        resetCart(); orderTotal = 100; paramsDelta = 1; posts = 0;
        await submit();
        assert.equal(posts, 2);
        assert.equal(opened, 0, 'payment parameters must equal the reviewed amount exactly');
        paramsDelta = 0; editBeforePayment = true; resetCart();
        await submit();
        assert.equal(opened, 0, 'a cart edited while order/parameters load must not open payment');
        editBeforePayment = false;
        storageDenied = true; resetCart(); posts = 0;
        await submit(); assert.equal(posts, 1); assert.equal(opened, 0, 'failed continuity storage must stop before claiming a payment handoff');
        storageDenied = false;
        resetCart(); posts = 0;
        read = () => new Promise(resolve => { finish = resolve; });
        const remoteRefresh = submit();
        remoteCartRaw = JSON.stringify({ state: { items: [{ product, quantity: 3 }], cartId: store.getState().cartId } });
        finish(new Response(JSON.stringify({ data: product })));
        await remoteRefresh;
        assert.equal(posts, 0, 'a delayed storage event must not let catalog refresh overwrite another tab');
        assert.equal(store.getState().items[0]?.quantity, 3);
        remoteCartRaw = undefined; read = undefined; resetCart(); posts = 0;
        const digestDescriptor = Object.getOwnPropertyDescriptor(crypto.subtle, 'digest');
        let releaseHash!: (value: ArrayBuffer) => void, hashing!: () => void;
        const startedHash = new Promise<void>(resolve => { hashing = resolve; });
        Object.defineProperty(crypto.subtle, 'digest', { configurable: true, value: () => {
            hashing(); return new Promise<ArrayBuffer>(resolve => { releaseHash = resolve; });
        } });
        try {
            const duringHash = submit();
            await startedHash;
            remoteCartRaw = null;
            releaseHash(new ArrayBuffer(32)); await duringHash;
            assert.equal(posts, 0, 'a remote clear during hashing must stop order creation');
            assert.equal(store.getState().items.length, 0);
        } finally {
            if (digestDescriptor) Object.defineProperty(crypto.subtle, 'digest', digestDescriptor); else Reflect.deleteProperty(crypto.subtle, 'digest');
            remoteCartRaw = undefined;
        }
        for (const mode of ['deleted', 'offline', 'unavailable']) {
            posts = 0; resetCart();
            read = async () => {
                if (mode === 'offline') throw new Error('offline');
                return new Response(JSON.stringify({ data: { ...product, in_stock: false } }), { status: mode === 'deleted' ? 404 : 200 });
            };
            await submit(); assert.equal(posts, 0); assert.equal(opened, 0);
            assert.equal(store.getState().items[0]?.product, product);
        }
        read = undefined;
        for (const mode of ['network', 'existing']) {
            recoveryMode = mode; resetCart(); posts = 0;
            await submit();
            assert.equal(posts, 2);
            assert.equal(opened, 0, 'uncertain issuance never opens another checkout');
            assert.ok(storage.get('wompi-return:order'), 'recovery context precedes the uncertain request');
        }
        assert.equal(recoveryNavigations, 2);
        store.getState().clearCart(); render();
        assert.equal(redirects, 1, 'a hydrated empty cart redirects normally');
    } finally {
        loader._load = original; globalThis.fetch = oldFetch; console.error = oldError;
        store.setState({ items: [] });
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
        }
    }
});
