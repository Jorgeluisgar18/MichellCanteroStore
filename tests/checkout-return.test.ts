import { it } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';
import { useCartStore } from '../store/cartStore';
import { cartContentsFingerprint, saveReturnContext } from '../lib/checkout/wompi-checkout-web';
import type { Product } from '../types';

it('verifies hosted returns without trusting URL status or exposing guest order details', async () => {
    const require = createRequire(join(process.cwd(), 'package.json'));
    const React = require('react');
    const loader = Module as unknown as { _load: (name: string, parent: { filename?: string }, main: boolean) => unknown };
    const original = loader._load, oldFetch = globalThis.fetch;
    const descriptors = ['React', 'window'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
    const product: Product = { id: 'p', name: 'Fixture', price: 100, stock_quantity: 10, in_stock: true,
        slug: 'fixture', category: 'fixture', description: null, images: [], tags: null };
    const map = new Map<string, string>();
    const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); }, removeItem: (key: string) => { map.delete(key); } };
    let slots: unknown[] = [], cursor = 0, cleanups: (() => void)[] = [];
    let search = new URLSearchParams('orderId=order&id=tx&status=success');
    let responseStatus = 200, posts = 0;
    let deferred: Promise<Response> | null = null;
    let receipt: unknown = null;
    const dummy = () => null;
    Object.defineProperty(globalThis, 'React', { configurable: true, value: React });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: storage } });
    globalThis.fetch = async () => new Response(JSON.stringify({ data: receipt }), { status: receipt ? 200 : 401 });
    loader._load = function(name, parent, main) {
        if (name === 'react' && parent.filename?.replace(/\\/g, '/').endsWith('/confirmacion/page.tsx')) return { ...React,
            useState(initial: unknown) {
                const index = cursor++; if (!(index in slots)) slots[index] = initial;
                return [slots[index], (value: unknown) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
            },
            useEffect(effect: () => (() => void) | void, deps: unknown[]) {
                const index = cursor++, key = JSON.stringify(deps);
                if (slots[index] !== key) { slots[index] = key; const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }
            },
        };
        if (name === 'next/navigation') return { useSearchParams: () => search };
        if (name === 'next/link' || name.startsWith('@/components/')) return { __esModule: true, default: dummy, Card: dummy };
        if (name === '@/lib/hooks/useCsrfToken') return { fetchWithCsrf: async () => {
            posts++;
            return deferred ?? new Response(JSON.stringify({ data: { status: 'reconciled', orderId: 'order' } }), { status: responseStatus });
        } };
        return original.call(this, name, parent, main);
    };
    type Element = { type: unknown; props: { children?: unknown } };
    const nodes = (tree: unknown): Element[] => {
        const found: Element[] = [];
        const walk = (node: unknown): void => {
            if (Array.isArray(node)) { node.forEach(walk); return; }
            if (!node || typeof node !== 'object' || !('props' in node)) return;
            const element = node as Element; found.push(element); walk(element.props.children);
        }; walk(tree); return found;
    };
    const reset = (withContext = true) => {
        cleanups.forEach(cleanup => cleanup()); cleanups = []; slots = []; map.clear(); posts = 0; receipt = null;
        useCartStore.setState({ items: [{ product, quantity: 1 }] });
        if (withContext) saveReturnContext(storage, { orderId: 'order', email: 'buyer@example.test',
            cartFingerprint: cartContentsFingerprint(useCartStore.getState().items), createdAt: Date.now() });
    };
    try {
        const Page = require(join(process.cwd(), 'app/checkout/confirmacion/page.tsx')).default;
        const Content = nodes(Page()).find(node => typeof node.type === 'function' && node.type.name === 'ConfirmacionContent')!.type as () => unknown;
        const render = () => { cursor = 0; return Content(); };
        const flush = async () => { await new Promise(resolve => setImmediate(resolve)); await new Promise(resolve => setImmediate(resolve)); };
        reset(); render(); await flush();
        assert.equal(posts, 1, 'return transaction must be verified by the backend');
        assert.match(JSON.stringify(render()), /Pago Confirmado/);
        assert.equal(useCartStore.getState().items.length, 0);
        cleanups.forEach(cleanup => cleanup()); cleanups = []; slots = [];
        useCartStore.setState({ items: [{ product, quantity: 1 }] });
        render(); await flush();
        assert.equal(useCartStore.getState().items.length, 1, 'reopening an old paid return must not erase a new identical cart');
        reset(false); render(); await flush();
        assert.equal(posts, 0);
        assert.doesNotMatch(JSON.stringify(render()), /Pago Confirmado/);
        assert.equal(useCartStore.getState().items.length, 1, 'URL status is never payment proof');
        for (const status of [202, 409, 500]) {
            reset(); responseStatus = status; render(); await flush();
            assert.doesNotMatch(JSON.stringify(render()), /Pago Confirmado/);
            assert.equal(useCartStore.getState().items.length, 1);
        }
        reset(false); responseStatus = 200;
        receipt = { id: 'order', order_number: 'PRIVATE', total: 100, payment_status: 'paid', inventory_status: 'review_required' };
        render(); await flush();
        assert.doesNotMatch(JSON.stringify(render()), /Pago Confirmado|preparando todo para el envío/);
        for (const terminal of ['refunded', 'failed', 'pending']) {
            reset();
            receipt = { id: 'order', order_number: 'PRIVATE', total: 100, payment_status: terminal, inventory_status: 'confirmed' };
            render(); await flush();
            assert.doesNotMatch(JSON.stringify(render()), /Pago Confirmado/, 'newer protected order state must supersede the earlier reconciliation result');
            assert.equal(useCartStore.getState().items.length, 1);
        }
        reset(); let finish!: (response: Response) => void;
        deferred = new Promise(resolve => { finish = resolve; });
        render(); useCartStore.getState().updateQuantity('p', 2);
        finish(new Response(JSON.stringify({ data: { status: 'reconciled', orderId: 'order' } })));
        await flush(); assert.equal(useCartStore.getState().items[0]?.quantity, 2);
        reset(); render(); cleanups.forEach(cleanup => cleanup());
        await flush(); assert.equal(useCartStore.getState().items.length, 1, 'detached effects cannot clear the cart');
        deferred = null;
        search = new URLSearchParams('orderId=other&id=tx&status=success');
        reset(); render(); await flush(); assert.equal(posts, 0);
    } finally {
        cleanups.forEach(cleanup => cleanup()); loader._load = original; globalThis.fetch = oldFetch; useCartStore.setState({ items: [] });
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
        }
    }
});
