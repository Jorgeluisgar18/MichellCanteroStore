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
    const descriptors = ['React', 'window', 'WidgetCheckout'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
    const oldError = console.error;
    const product = { id: 'p', name: 'Fixture', price: 100, images: [], in_stock: true, stock_quantity: 10, variants: [] } as unknown as Product;
    const store = useCartStore;
    const resetCart = () => store.setState({ items: [{ product, quantity: 1 }] });
    resetCart();
    let current = product;
    let read: (() => Promise<Response>) | undefined;
    let posts = 0, opened = 0, orderTotal = 100, paramsDelta = 0;
    let editBeforePayment = false;
    const slots: unknown[] = [];
    let cursor = 0;
    const dummy = () => null;
    const { STORE_CONFIG: config } = require(join(process.cwd(), 'lib/config.ts'));
    const widget = class { open() { opened++; } };
    Object.defineProperty(globalThis, 'React', { configurable: true, value: React });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { WidgetCheckout: widget } });
    Object.defineProperty(globalThis, 'WidgetCheckout', { configurable: true, value: widget });
    globalThis.fetch = async () => read ? read() : new Response(JSON.stringify({ data: current }));
    console.error = () => undefined;
    loader._load = function(name, parent, main) {
        if (name === 'react' && parent.filename?.endsWith('CheckoutClient.tsx')) return { ...React,
            useState(initial: unknown) {
                const index = cursor++;
                if (!(index in slots)) slots[index] = index === 1 ? true
                    : initial && typeof initial === 'object' && 'shippingMethod' in initial ? { ...initial, shippingMethod: 'pickup' } : initial;
                return [slots[index], (value: unknown) => { slots[index] = value; }];
            },
            useRef(initial: unknown) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
            useEffect() {},
        };
        if (name === '@/store/cartStore') return { useCartStore: Object.assign(() => store.getState(), { getState: store.getState }) };
        if (name === 'next/navigation') return { useRouter: () => ({ replace() {}, push() {} }) };
        if (name === 'next/script') return { default: dummy };
        if (name.startsWith('@/components/')) return { default: dummy, Card: dummy, useToast: () => ({ showToast() {} }) };
        if (name === '@/lib/config') return { STORE_CONFIG: config };
        if (name === '@/lib/hooks/useCsrfToken') return { fetchWithCsrf: async (url: string) => {
            posts++;
            if (editBeforePayment && url !== '/api/orders') store.getState().updateQuantity('p', 2);
            return new Response(JSON.stringify({ data: url === '/api/orders'
                ? { id: 'order', order_number: 'ref', total: orderTotal }
                : { amountInCents: orderTotal * 100 + paramsDelta } }));
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
        current = { ...product, price: 120 };
        await submit();
        assert.equal(posts, 0, 'price changes require explicit review before creating an order');
        assert.equal(opened, 0);
        assert.equal(store.getState().getSubtotal(), 120);
        orderTotal = 120;
        await submit();
        assert.equal(opened, 1, 'second submission may proceed at the reviewed amount');
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
        for (const mode of ['deleted', 'offline', 'unavailable']) {
            posts = 0; resetCart();
            read = async () => {
                if (mode === 'offline') throw new Error('offline');
                return new Response(JSON.stringify({ data: { ...product, in_stock: false } }), { status: mode === 'deleted' ? 404 : 200 });
            };
            await submit(); assert.equal(posts, 0); assert.equal(opened, 0);
            assert.equal(store.getState().items[0]?.product, product);
        }
    } finally {
        loader._load = original; globalThis.fetch = oldFetch; console.error = oldError;
        store.setState({ items: [] });
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
        }
    }
});
