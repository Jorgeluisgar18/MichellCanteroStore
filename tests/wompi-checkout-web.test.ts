import { it } from 'node:test';
import assert from 'node:assert/strict';
import { buildWompiWebFields, saveReturnContext, readReturnContext, cartContentsFingerprint, verifyCheckoutReturn } from '../lib/checkout/wompi-checkout-web';
import type { CartItem } from '../types';

const storage = () => {
    const data = new Map<string, string>();
    return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } };
};
const params = { publicKey: 'pub_test_fixture', currency: 'COP', amountInCents: 11000, reference: 'REF', signature: 'a'.repeat(64),
    redirectUrl: 'https://store.test/checkout/confirmacion?orderId=order', customerEmail: 'private@example.test' };

it('maps only signed checkout values to the official fixed-origin Web Checkout contract', () => {
    const fields = buildWompiWebFields(params, 'https://store.test', 'order');
    assert.equal(fields['public-key'], params.publicKey);
    assert.equal(fields['signature:integrity'], params.signature);
    assert.equal(fields['amount-in-cents'], '11000');
    assert.equal(fields['redirect-url'], params.redirectUrl);
    assert.equal(fields['customer-data:email'], undefined, 'optional personal data is not added to the payment URL');
    for (const changed of [{ ...params, amountInCents: NaN }, { ...params, currency: 'USD' },
        { ...params, redirectUrl: 'https://evil.test/checkout/confirmacion?orderId=order' },
        { ...params, redirectUrl: 'https://store.test/checkout/confirmacion?orderId=other' },
        { ...params, signature: '' }]) assert.throws(() => buildWompiWebFields(changed, 'https://store.test', 'order'));
});

it('keeps order-bound return context in same-tab storage with expiry and no trusted payment status', () => {
    const store = storage();
    const context = { orderId: 'order', email: 'buyer@example.test', cartFingerprint: '[]', createdAt: 1000 };
    saveReturnContext(store, context);
    assert.deepEqual(readReturnContext(store, 'order', 2000), context);
    assert.equal(readReturnContext(store, 'other', 2000), null);
    assert.equal(readReturnContext(store, 'order', 1000 + 24 * 60 * 60 * 1000 + 1), null);
    assert.equal(readReturnContext({ ...store, getItem: () => '{broken' }, 'order', 2000), null);
    assert.throws(() => saveReturnContext({ ...store, setItem() { throw new Error('denied'); } }, context));
    const saved = [{ product: { id: 'p', price: 100 }, quantity: 1 }] as CartItem[];
    assert.notEqual(cartContentsFingerprint(saved), cartContentsFingerprint([{ ...saved[0]!, quantity: 2 }]));
});

it('accepts only explicit200 verified responses bound to the order, never202 or a URL hint', async () => {
    const context = { orderId: 'order', email: 'buyer@example.test', cartFingerprint: '[]', createdAt: Date.now() };
    for (const [status, data, expected] of [
        [200, { status: 'reconciled', orderId: 'order' }, 'verified'],
        [200, { status: 'already_paid', orderId: 'order' }, 'verified'],
        [200, { status: 'reconciled', orderId: 'other' }, 'unverified'],
        [200, { status: 'pending', orderId: 'order' }, 'unverified'],
        [202, { status: 'reconciled', orderId: 'order' }, 'pending'],
        [409, null, 'review'], [500, null, 'unverified'],
    ] as const) {
        const result = await verifyCheckoutReturn(context, 'transaction', async (url, init) => {
            assert.equal(url, '/api/payments/reconcile');
            assert.deepEqual(JSON.parse(String(init?.body)), { orderId: 'order', email: context.email, transactionId: 'transaction' });
            return new Response(JSON.stringify({ data }), { status });
        });
        assert.equal(result, expected);
    }
    assert.equal(await verifyCheckoutReturn(context, 'transaction', async () => { throw new Error('offline'); }), 'unverified');
    let finish!: (response: Response) => void, calls = 0;
    const post = async () => { calls++; return new Promise<Response>(resolve => { finish = resolve; }); };
    const first = verifyCheckoutReturn(context, 'duplicate', post), second = verifyCheckoutReturn(context, 'duplicate', post);
    assert.equal(calls, 1);
    finish(new Response(JSON.stringify({ data: { status: 'reconciled', orderId: 'order' } })));
    assert.deepEqual(await Promise.all([first, second]), ['verified', 'verified']);
});
