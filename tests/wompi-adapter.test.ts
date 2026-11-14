import { it } from 'node:test';
import assert from 'node:assert/strict';
import { getWompiTransactionById, getWompiTransactionsByReference } from '../lib/payments/wompi';

it('rejects malformed, misbound and duplicate provider rows instead of treating them as absent', async () => {
    const original = globalThis.fetch;
    const tx = { id: 'tx-1', reference: 'REF', status: 'APPROVED', amount_in_cents: 100, currency: 'COP' };
    let data: unknown = [];
    globalThis.fetch = async () => new Response(JSON.stringify({ data }));
    try {
        assert.deepEqual(await getWompiTransactionsByReference({ reference: 'REF', privateKey: 'fixture' }), []);
        for (const invalid of [null, {}, [{ ...tx, reference: 'OTHER' }], [{ ...tx, status: 'WHAT' }], [tx, tx]]) {
            data = invalid;
            await assert.rejects(getWompiTransactionsByReference({ reference: 'REF', privateKey: 'fixture' }));
        }
        data = tx;
        assert.equal((await getWompiTransactionById({ transactionId: 'tx-1', privateKey: 'fixture' }))?.id, 'tx-1');
        await assert.rejects(getWompiTransactionById({ transactionId: 'other', privateKey: 'fixture' }));
    } finally { globalThis.fetch = original; }
});
