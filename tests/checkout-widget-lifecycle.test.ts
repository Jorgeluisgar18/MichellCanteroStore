import { it } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';
import { useCartStore } from '../store/cartStore';
import type { Product } from '../types';

it('owns widget results once, ignores obsolete sessions and preserves a changed cart', async () => {
    const require = createRequire(join(process.cwd(), 'package.json'));
    const React = require('react');
    const loader = Module as unknown as { _load: (name: string, parent: { filename?: string }, main: boolean) => unknown };
    const original = loader._load, oldFetch = globalThis.fetch, oldError = console.error;
    const descriptors = ['React', 'window', 'WidgetCheckout'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
    const product: Product = { id: 'p', name: 'Fixture', slug: 'fixture', description: null, category: 'fixture', tags: null,
        price: 100, images: [], in_stock: true, stock_quantity: 10, variants: [] };
    const resetCart = () => useCartStore.setState({ items: [{ product, quantity: 1 }] });
    type Result = { transaction?: { id?: string; status: string } };
    type Callback = (result?: Result) => Promise<void>;
    const callbacks: Callback[] = [], navigation: string[] = [];
    let slots: unknown[] = [], cursor = 0, effects: (() => void)[] = [];
    let reconciles = 0, posts = 0;
    let reconciliation: Promise<Response> | undefined;
    const dummy = () => null;
    const { STORE_CONFIG: config } = require(join(process.cwd(), 'lib/config.ts'));
    const widget = class { open(callback: Callback) { callbacks.push(callback); } };
    Object.defineProperty(globalThis, 'React', { configurable: true, value: React });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { WidgetCheckout: widget } });
    Object.defineProperty(globalThis, 'WidgetCheckout', { configurable: true, value: widget });
    globalThis.fetch = async () => new Response(JSON.stringify({ data: product }));
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
            useEffect(effect: () => (() => void) | void) {
                const index = cursor++;
                if (!(index in slots)) { slots[index] = true; const cleanup = effect(); if (cleanup) effects.push(cleanup); }
            },
        };
        if (name === '@/store/cartStore') return { useCartStore: Object.assign(() => useCartStore.getState(), { getState: useCartStore.getState }) };
        if (name === 'next/navigation') return { useRouter: () => ({ replace() {}, push(path: string) { navigation.push(path); } }) };
        if (name === 'next/script') return { default: dummy };
        if (name.startsWith('@/components/')) return { default: dummy, Card: dummy, useToast: () => ({ showToast() {} }) };
        if (name === '@/lib/config') return { STORE_CONFIG: config };
        if (name === '@/lib/hooks/useCsrfToken') return { fetchWithCsrf: async (url: string) => {
            posts++;
            if (url.endsWith('/reconcile')) { reconciles++; return reconciliation ?? new Response('{}'); }
            return new Response(JSON.stringify({ data: url === '/api/orders'
                ? { id: 'order', order_number: 'ref', total: 100 } : { amountInCents: 10000 } }));
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
        }; walk(tree); return found;
    };
    try {
        const Checkout = require(join(process.cwd(), 'app/checkout/CheckoutClient.tsx')).default;
        const submit = async () => { cursor = 0; await nodes(Checkout()).find(node => node.type === 'form')!.props.onSubmit!({ preventDefault() {} }); };
        const remount = () => { effects.forEach(cleanup => cleanup()); slots = []; effects = []; resetCart(); };
        resetCart(); await submit();
        const malformed = callbacks[callbacks.length - 1]!;
        for (const value of [undefined, {}, { transaction: null }, { transaction: { status: 42 } }]) {
            await malformed(value as unknown as Result);
        }
        assert.equal(navigation.length, 0, 'malformed callbacks must not claim or navigate');
        assert.equal(reconciles, 0);
        let release!: (response: Response) => void;
        reconciliation = new Promise(resolve => { release = resolve; });
        const detachedPending = malformed({ transaction: { id: 'pending', status: 'APPROVED' } });
        assert.equal(reconciles, 1);
        effects.forEach(cleanup => cleanup());
        const cartAtUnmount = useCartStore.getState().items;
        release(new Response('{}')); await detachedPending;
        assert.equal(navigation.length, 0, 'unmount during reconciliation must suppress navigation');
        assert.equal(useCartStore.getState().items, cartAtUnmount, 'unmount must suppress cart writes');
        reconciliation = undefined;
        remount(); await submit();
        await callbacks[callbacks.length - 1]!({ transaction: { id: 'success', status: 'APPROVED' } });
        assert.equal(useCartStore.getState().items.length, 0, 'exact approved snapshot must clear');
        assert.ok(navigation[navigation.length - 1]?.includes('status=success'));
        remount(); await submit();
        reconciliation = Promise.resolve(new Response(JSON.stringify({ error: 'review' }), { status: 409 }));
        useCartStore.getState().updateQuantity('p', 3);
        await callbacks[callbacks.length - 1]!({ transaction: { id: 'review', status: 'APPROVED' } });
        assert.equal(useCartStore.getState().items[0]?.quantity, 3, 'manual review must preserve edits');
        assert.ok(navigation[navigation.length - 1]?.includes('status=manual_review'));
        reconciliation = undefined;
        remount(); callbacks.length = 0; navigation.length = 0; reconciles = 0; posts = 0;
        resetCart(); await submit();
        let finish!: (response: Response) => void;
        reconciliation = new Promise(resolve => { finish = resolve; });
        const callback = callbacks[0]!;
        const first = callback({ transaction: { id: 'tx', status: 'APPROVED' } });
        const duplicate = callback({ transaction: { id: 'tx', status: 'APPROVED' } });
        try {
            assert.equal(reconciles, 1, 'duplicate callbacks must not reconcile twice');
            const postsBefore = posts;
            await submit();
            assert.equal(posts, postsBefore, 'reconciliation must block another submission');
            useCartStore.getState().updateQuantity('p', 2);
        } finally {
            finish(new Response('{}')); await Promise.all([first, duplicate]);
        }
        assert.equal(useCartStore.getState().items[0]?.quantity, 2, 'payment must not clear a subsequently edited cart');
        assert.equal(navigation.length, 1);
        assert.ok(navigation[0]?.includes('status=success'));
        reconciliation = undefined;
        remount(); await submit(); const obsolete = callbacks[callbacks.length - 1]!;
        await submit(); const active = callbacks[callbacks.length - 1]!;
        const before = reconciles;
        await obsolete({ transaction: { id: 'old', status: 'APPROVED' } });
        assert.equal(reconciles, before, 'superseded widget results must not change the current UI');
        await active({ transaction: { id: 'new', status: 'DECLINED' } });
        assert.ok(navigation[navigation.length - 1]?.includes('status=declined'));
        assert.equal(useCartStore.getState().items.length, 1);
        remount(); await submit(); const detached = callbacks[callbacks.length - 1]!;
        effects.forEach(cleanup => cleanup());
        const navigationBefore = navigation.length;
        await detached({ transaction: { id: 'detached', status: 'APPROVED' } });
        assert.equal(reconciles, before);
        assert.equal(navigation.length, navigationBefore);
        remount(); await submit();
        await callbacks[callbacks.length - 1]!({ transaction: { status: 'APPROVED' } });
        assert.ok(navigation[navigation.length - 1]?.includes('status=manual_review'));
        assert.equal(useCartStore.getState().items.length, 0, 'unchanged cart keeps the existing paid-review behavior');
    } finally {
        effects.forEach(cleanup => cleanup());
        loader._load = original; globalThis.fetch = oldFetch; console.error = oldError; useCartStore.setState({ items: [] });
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
        }
    }
});
