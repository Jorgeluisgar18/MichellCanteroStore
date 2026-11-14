import { it } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';

it('waits for hydration, synchronizes storage clear/edit events and removes its subscriptions', () => {
    const require = createRequire(join(process.cwd(), 'package.json'));
    const React = require('react');
    const loader = Module as unknown as { _load: (name: string, parent: { filename?: string }, main: boolean) => unknown };
    const original = loader._load, descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    let hydrated = false, state = false, writes = 0, stops = 0, persistenceEnabled = true;
    let finish = () => {}, begin = () => {};
    let raw: string | null = JSON.stringify({ state: { items: [{ product: { id: 'p' }, quantity: 1 }], cartId: null } });
    let cart = { items: [] as { product: { id: string }; quantity: number }[], cartId: null };
    const listeners = new Map<string, (event: { key: string | null }) => void>();
    let cleanup: (() => void) | undefined, mounted = false;
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {
        localStorage: { getItem: () => raw },
        addEventListener: (name: string, callback: (event: { key: string | null }) => void) => listeners.set(name, callback),
        removeEventListener: (name: string) => listeners.delete(name),
    } });
    loader._load = function(name, parent, main) {
        if (name === 'react' && parent.filename?.endsWith('use-cart-session.ts')) return { ...React,
            useState: () => [state, (value: boolean) => { state = value; writes++; }],
            useEffect: (effect: () => (() => void) | void) => { if (!mounted) { mounted = true; cleanup = effect() || undefined; } },
        };
        if (name === '../../store/cartStore' && parent.filename?.endsWith('use-cart-session.ts')) return { useCartStore: {
            getState: () => cart, setState: (next: typeof cart) => { cart = next; },
            get persist() { return persistenceEnabled ? { hasHydrated: () => hydrated, rehydrate() {},
                onHydrate: (callback: () => void) => { begin = callback; return () => { stops++; }; },
                onFinishHydration: (callback: () => void) => { finish = callback; return () => { stops++; }; },
            } : undefined; },
        } };
        return original.call(this, name, parent, main);
    };
    try {
        const { useCartSession } = require(join(process.cwd(), 'lib/checkout/use-cart-session.ts'));
        assert.equal(useCartSession(), false);
        assert.equal(cart.items.length, 0);
        hydrated = true; finish();
        assert.equal(useCartSession(), true); assert.equal(cart.items.length, 1);
        raw = JSON.stringify({ state: { items: [{ product: { id: 'p' }, quantity: 3 }], cartId: null } });
        listeners.get('storage')!({ key: 'unrelated' }); assert.equal(cart.items[0]?.quantity, 1);
        listeners.get('storage')!({ key: 'cart-storage' }); assert.equal(cart.items[0]?.quantity, 3);
        raw = null; listeners.get('storage')!({ key: null }); assert.equal(cart.items.length, 0);
        begin(); assert.equal(useCartSession(), false);
        finish(); assert.equal(useCartSession(), true);
        cleanup!(); const writesBefore = writes; finish(); begin();
        assert.equal(writes, writesBefore); assert.equal(stops, 2); assert.equal(listeners.size, 0);
        mounted = false; state = false; persistenceEnabled = false;
        const errors: string[] = [];
        useCartSession((message: string) => errors.push(message));
        assert.equal(useCartSession(), true, 'missing persistence must report an error instead of crashing the hook');
        assert.equal(errors.length, 1);
    } finally {
        cleanup?.(); loader._load = original;
        if (descriptor) Object.defineProperty(globalThis, 'window', descriptor); else Reflect.deleteProperty(globalThis, 'window');
    }
});
