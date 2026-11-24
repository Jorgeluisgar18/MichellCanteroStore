import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadStorefrontProducts, matchesStorefrontSelection } from '../lib/catalog/storefront-products';

test('novedades and category narrow the same results instead of overriding one another', () => {
    const products = [
        { id: 'new-skin', category: 'skincare', is_new: true },
        { id: 'older-skin', category: 'skincare', is_new: false },
        { id: 'new-other', category: 'maquillaje', is_new: true },
    ];
    const select = (filter: string, category: string) =>
        products.filter((product) => matchesStorefrontSelection(product, filter, category)).map(({ id }) => id);

    assert.deepEqual(select('new', ''), ['new-skin', 'new-other']);
    assert.deepEqual(select('', 'SKINCARE'), ['new-skin', 'older-skin']);
    assert.deepEqual(select('', ''), ['new-skin', 'older-skin', 'new-other']);
    assert.deepEqual(select('new', 'SKINCARE'), ['new-skin']);
});

test('distinguishes an empty catalog from a failed request and permits a fresh retry', async () => {
    const product = { id: 'fixture', name: 'Fixture', price: 10000 };
    const controller = new AbortController();
    const replies = [
        Response.json({ data: { products: [] } }, { status: 503 }),
        Response.json({ data: {} }),
        Response.json({ data: { products: [] } }),
        Response.json({ data: { products: [product] } }),
    ];
    const request: typeof fetch = async (url, init) => {
        assert.equal(url, '/api/products');
        assert.equal(init?.cache, 'no-store');
        assert.equal(init?.signal, controller.signal);
        const reply = replies.shift();
        assert.ok(reply);
        return reply;
    };

    await assert.rejects(loadStorefrontProducts(controller.signal, request), /HTTP 503/);
    await assert.rejects(loadStorefrontProducts(controller.signal, request), /Invalid catalog response/);
    assert.deepEqual(await loadStorefrontProducts(controller.signal, request), []);
    assert.deepEqual(await loadStorefrontProducts(controller.signal, request), [product]);
});
