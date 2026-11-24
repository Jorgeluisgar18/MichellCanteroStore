import { it } from 'node:test';
import assert from 'node:assert/strict';
import { getWompiTransactionById, getWompiTransactionsByReference } from '../lib/payments/wompi';

it('routes both lookup forms only to the explicitly selected Wompi environment', async (t) => {
    const original = globalThis.fetch;
    const originalEnv = process.env.WOMPI_API_ENV;
    const originalVercelEnv = process.env.VERCEL_ENV;
    const requests: { url: string; key: string | null }[] = [];
    t.after(() => {
        globalThis.fetch = original;
        if (originalEnv === undefined) delete process.env.WOMPI_API_ENV;
        else process.env.WOMPI_API_ENV = originalEnv;
        if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
        else process.env.VERCEL_ENV = originalVercelEnv;
    });
    delete process.env.WOMPI_API_ENV;
    delete process.env.VERCEL_ENV;
    globalThis.fetch = async (url, options) => {
        requests.push({ url: String(url), key: new Headers(options?.headers).get('authorization') });
        const row = { id: 'tx-1', reference: 'REF', status: 'APPROVED', amount_in_cents: 100, currency: 'COP' };
        return Response.json({ data: String(url).includes('?') ? [row] : row });
    };
    const byId = (privateKey: string) => getWompiTransactionById({ transactionId: 'tx-1', privateKey });
    const byReference = (privateKey: string) => getWompiTransactionsByReference({ reference: 'REF', privateKey });
    await byId('prv_prod_fixture');
    await byReference('prv_prod_fixture');
    await assert.rejects(byId('prv_test_fixture'), /Wompi API configuration/);
    await assert.rejects(byReference('prv_test_fixture'), /Wompi API configuration/);
    process.env.WOMPI_API_ENV = 'sandbox';
    await byId('prv_test_fixture');
    await byReference('prv_test_fixture');
    await assert.rejects(byId('prv_prod_fixture'), /Wompi API configuration/);
    await assert.rejects(byReference('prv_prod_fixture'), /Wompi API configuration/);
    process.env.VERCEL_ENV = 'production';
    await assert.rejects(byId('prv_test_fixture'), /Wompi API configuration/);
    delete process.env.VERCEL_ENV;
    process.env.WOMPI_API_ENV = 'unexpected';
    await assert.rejects(byId('prv_prod_fixture'), /Wompi API configuration/);
    assert.deepEqual(requests, [
        { url: 'https://production.wompi.co/v1/transactions/tx-1', key: 'Bearer prv_prod_fixture' },
        { url: 'https://production.wompi.co/v1/transactions?reference=REF', key: 'Bearer prv_prod_fixture' },
        { url: 'https://sandbox.wompi.co/v1/transactions/tx-1', key: 'Bearer prv_test_fixture' },
        { url: 'https://sandbox.wompi.co/v1/transactions?reference=REF', key: 'Bearer prv_test_fixture' },
    ]);
});

it('rejects malformed, misbound and duplicate provider rows instead of treating them as absent', async () => {
    const original = globalThis.fetch;
    const privateKey = 'prv_prod_fixture';
    const tx = { id: 'tx-1', reference: 'REF', status: 'APPROVED', amount_in_cents: 100, currency: 'COP' };
    let data: unknown = [];
    globalThis.fetch = async () => new Response(JSON.stringify({ data }));
    try {
        assert.deepEqual(await getWompiTransactionsByReference({ reference: 'REF', privateKey }), []);
        for (const invalid of [null, {}, [{ ...tx, reference: 'OTHER' }], [{ ...tx, status: 'WHAT' }], [tx, tx]]) {
            data = invalid;
            await assert.rejects(getWompiTransactionsByReference({ reference: 'REF', privateKey }));
        }
        data = tx;
        assert.equal((await getWompiTransactionById({ transactionId: 'tx-1', privateKey }))?.id, 'tx-1');
        await assert.rejects(getWompiTransactionById({ transactionId: 'other', privateKey }));
    } finally { globalThis.fetch = original; }
});
