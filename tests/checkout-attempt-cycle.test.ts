import { it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { deriveCheckoutAttempt } from '../lib/checkout/idempotency';
import { useCartStore } from '../store/cartStore';
import { createCartCycleId, synchronizeCartStorage } from '../lib/checkout/cart-session';
import type { Product } from '../types';

const product: Product = { id: 'p', name: 'Fixture', slug: 'fixture', description: null, category: 'fixture', tags: null,
    price: 100, images: [], stock_quantity: 10, in_stock: true };
const intent = { shipping_email: 'buyer@example.test', items: [{ product_id: 'p', quantity: 1 }] };

it('derives the same schema-valid UUID for reloads/tabs of one cycle without storing buyer data', async () => {
    const cycle = crypto.randomUUID();
    const first = await deriveCheckoutAttempt(cycle, intent);
    assert.equal((await deriveCheckoutAttempt(cycle, structuredClone(intent))).key, first.key);
    assert.equal(z.string().uuid().safeParse(first.key).success, true);
    assert.equal(first.key[14], '8');
    assert.notEqual((await deriveCheckoutAttempt(crypto.randomUUID(), intent)).key, first.key);
    assert.notEqual((await deriveCheckoutAttempt(cycle, { ...intent, items: [{ product_id: 'p', quantity: 2 }] })).key, first.key);
    assert.equal((await deriveCheckoutAttempt(null, intent)).key, (await deriveCheckoutAttempt(null, intent)).key);
    await assert.rejects(deriveCheckoutAttempt('broken', intent));
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto) } });
    assert.equal(z.string().uuid().safeParse(createCartCycleId()).success, true);
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {} });
    try { await assert.rejects(deriveCheckoutAttempt(cycle, intent), /HTTPS/); }
    finally { if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor); else Reflect.deleteProperty(globalThis, 'crypto'); }
});

it('keeps a cycle through valid cart edits and refresh, and starts a new identical purchase after emptying', async () => {
    const store = useCartStore;
    store.getState().clearCart();
    store.getState().addItem(product, -1);
    assert.equal(store.getState().cartId, null);
    store.getState().addItem(product);
    const first = store.getState().cartId;
    assert.ok(first);
    store.getState().updateQuantity('p', 2);
    assert.equal(store.getState().cartId, first);
    const snapshot = store.getState().items;
    assert.equal(store.getState().replaceSnapshot(snapshot, snapshot.map(item => ({ ...item, product: { ...product, price: 120 } }))), true);
    assert.equal(store.getState().cartId, first);
    store.getState().updateQuantity('p', 0);
    assert.equal(store.getState().cartId, null);
    store.getState().addItem(product);
    assert.notEqual(store.getState().cartId, first);
    assert.notEqual((await deriveCheckoutAttempt(first, intent)).key, (await deriveCheckoutAttempt(store.getState().cartId, intent)).key);
    store.getState().removeItem('p'); assert.equal(store.getState().cartId, null);
    store.getState().addItem(product);
    store.getState().replaceSnapshot(store.getState().items, []);
    assert.equal(store.getState().cartId, null);
});

it('adopts observed persisted changes without pointless snapshot replacement and handles removal/corruption', () => {
    const store = useCartStore;
    store.getState().clearCart(); store.getState().addItem(product);
    let raw: string | null = JSON.stringify({ state: { items: store.getState().items, cartId: store.getState().cartId } });
    const storage = { getItem: () => raw };
    const original = store.getState().items;
    assert.equal(synchronizeCartStorage(storage, store), false);
    assert.equal(store.getState().items, original);
    raw = JSON.stringify({ state: { items: [{ product, quantity: 3 }], cartId: store.getState().cartId } });
    assert.equal(synchronizeCartStorage(storage, store), true);
    assert.equal(store.getState().items[0]?.quantity, 3);
    raw = null; synchronizeCartStorage(storage, store);
    assert.equal(store.getState().items.length, 0); assert.equal(store.getState().cartId, null);
    raw = '{broken'; assert.throws(() => synchronizeCartStorage(storage, store));
    raw = JSON.stringify({ state: { items: [], cartId: 'broken' } });
    assert.throws(() => synchronizeCartStorage(storage, store));
    assert.throws(() => synchronizeCartStorage({ getItem() { throw new Error('denied'); } }, store));
});
