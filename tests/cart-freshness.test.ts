import { it } from 'node:test';
import assert from 'node:assert/strict';
import { refreshCartCatalog, cartLineTotal } from '../lib/checkout/cart-freshness';
import { useCartStore } from '../store/cartStore';
import type { Product, CartItem } from '../types';

const variant = { id: 'red', name: 'Red', type: 'color' as const, value: '#f00', stock_quantity: 5, inStock: true, priceModifier: 10 };
const product: Product = { id: 'p', name: 'Fixture', slug: 'fixture', images: [], price: 100, stock_quantity: 5, in_stock: true,
    variants: [variant], description: null, category: 'fixture', tags: null };
const line = (): CartItem => ({ product, quantity: 2, selectedVariant: variant });
const response = (data: unknown, status = 200) => new Response(JSON.stringify({ data }), { status });

it('refreshes every product occurrence once and requires review for changed unit prices', async () => {
    const saved = [line(), { ...line(), quantity: 1 }];
    const fresh = { ...product, price: 120, name: 'New label', variants: [{ ...variant, name: 'Current red', priceModifier: 15 }] };
    let reads = 0;
    const result = await refreshCartCatalog(saved, async (_url, init) => {
        reads++;
        assert.equal(init?.cache, 'no-store');
        return response(fresh);
    });
    assert.equal(reads, 1);
    assert.equal(result.priceChanged, true);
    assert.deepEqual(result.items.map(item => item.quantity), [2, 1]);
    assert.equal(result.items[0]?.selectedVariant?.id, 'red');
    assert.equal(result.items[0]?.selectedVariant?.name, 'Current red');
    assert.equal(cartLineTotal(result.items[0]!), 270);
    assert.equal(saved[0]?.product.price, 100);
    assert.equal((await refreshCartCatalog(saved, async () => response(product))).priceChanged, false);
});

it('fails closed without mutating saved items for unavailable or malformed catalog and transport errors', async () => {
    const saved = [line()];
    for (const data of [null, { ...product, id: 'wrong' }, { ...product, price: '100' },
        { ...product, variants: [] }, { ...product, in_stock: false },
        { ...product, stock_quantity: 1, variants: [{ ...variant, stock_quantity: 1 }] }]) {
        await assert.rejects(refreshCartCatalog(saved, async () => response(data)));
    }
    for (const status of [404, 500]) await assert.rejects(refreshCartCatalog(saved, async () => response(null, status)));
    await assert.rejects(refreshCartCatalog(saved, async () => { throw new Error('offline'); }));
    await assert.rejects(refreshCartCatalog(saved, async () => new Response('not json')));
    assert.equal(saved[0]?.product, product);
    assert.equal(saved[0]?.quantity, 2);
});

it('only replaces the exact cart snapshot read before an asynchronous refresh', async () => {
    const store = useCartStore;
    const saved = [line()];
    store.setState({ items: saved });
    const result = await refreshCartCatalog(saved, async () => response({ ...product, price: 200 }));
    store.getState().updateQuantity('p', 1, 'red');
    assert.equal(store.getState().replaceSnapshot(saved, result.items), false);
    assert.equal(store.getState().items[0]?.quantity, 1);
    const current = store.getState().items;
    assert.equal(store.getState().replaceSnapshot(current, result.items), true);
    assert.equal(store.getState().getSubtotal(), 420);
    store.setState({ items: [] });
});
