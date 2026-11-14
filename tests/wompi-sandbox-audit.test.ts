import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createSandboxAuditClient, validateSandboxCredentials } from '../lib/payments/sandbox-audit';

const env = { WOMPI_SANDBOX_PUBLIC_KEY: 'pub_test_fixture', WOMPI_SANDBOX_PRIVATE_KEY: 'prv_test_fixture',
    WOMPI_SANDBOX_INTEGRITY_SECRET: 'test_integrity_fixture', WOMPI_SANDBOX_EVENTS_ISOLATED: 'true' };

it('obtains fresh acceptance tokens per attempt and fails closed on malformed merchant data', async () => {
    let reads = 0;
    const client = createSandboxAuditClient(env, async () => {
        reads++;
        return new Response(JSON.stringify({ data: {
            presigned_acceptance: { acceptance_token: `acceptance-${reads}` },
            presigned_personal_data_auth: { acceptance_token: `personal-${reads}` },
        } }), { status: 200 });
    });
    assert.deepEqual(await client.acceptance(), { acceptance: 'acceptance-1', personal: 'personal-1' });
    assert.deepEqual(await client.acceptance(), { acceptance: 'acceptance-2', personal: 'personal-2' });
    for (const data of [null, {}, { presigned_acceptance: { acceptance_token: 'a' } }]) {
        const invalid = createSandboxAuditClient(env, async () => new Response(JSON.stringify({ data }), { status: 200 }));
        await assert.rejects(invalid.acceptance(), /merchant_acceptance_unavailable/);
    }
});

it('stops on uncertain transaction HTTP outcomes without retrying', async () => {
    for (const status of [500, 502, 503, 408, 200, 202]) {
        let calls = 0;
        const client = createSandboxAuditClient(env, async () => {
            calls++;
            return new Response(JSON.stringify({ data: null }), { status });
        });
        await assert.rejects(client.createTransaction('AUDIT-SBX-fixture', 'tok_test_fixture', 'a', 'p'), /mutation_outcome_unknown_do_not_retry/);
        assert.equal(calls, 1);
    }
});

it('rejects production credentials and missing isolation before issuing any request', () => {
    for (const patch of [
        { WOMPI_SANDBOX_PUBLIC_KEY: 'pub_prod_forbidden' }, { WOMPI_SANDBOX_PRIVATE_KEY: 'prv_prod_forbidden' },
        { WOMPI_SANDBOX_INTEGRITY_SECRET: 'prod_integrity_forbidden' }, { WOMPI_SANDBOX_EVENTS_ISOLATED: 'false' },
    ]) assert.throws(() => validateSandboxCredentials({ ...env, ...patch }));
    assert.doesNotThrow(() => validateSandboxCredentials(env));
});

it('confines requests to sandbox, rejects redirects, uses fake fixtures and caps creation without blind retry', async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const client = createSandboxAuditClient(env, async (url, init) => {
        calls.push({ url: String(url), init });
        return new Response(JSON.stringify({ data: { id: 'fixture' } }), { status: 201 });
    });
    const reference = 'AUDIT-SBX-fixture';
    for (let i = 0; i < 6; i++) await client.createTransaction(reference, 'tok_test_fixture', 'acceptance', 'personal');
    await assert.rejects(client.createTransaction(reference, 'tok_test_fixture', 'acceptance', 'personal'), /budget/);
    assert.equal(calls.length, 6);
    for (const call of calls) {
        assert.equal(new URL(call.url).origin, 'https://sandbox.wompi.co');
        assert.equal(call.init?.redirect, 'error');
        const body = JSON.parse(String(call.init?.body));
        assert.equal(body.customer_email, 'sandbox-audit@example.test');
        assert.equal(body.amount_in_cents, 1_000_000);
        assert.equal(body.reference, reference);
        assert.match(body.signature, /^[a-f0-9]{64}$/);
        assert.equal(body.payment_method.installments, 1);
    }
    await assert.rejects(client.createTransaction('REAL-ORDER', 'tok_test_fixture', 'a', 'p'));
    const failed = createSandboxAuditClient(env, async () => { throw new Error(env.WOMPI_SANDBOX_PRIVATE_KEY); });
    await assert.rejects(failed.merchant(), error => error instanceof Error && !error.message.includes(env.WOMPI_SANDBOX_PRIVATE_KEY));
});

it('does not echo provider payloads, card tokens or acceptance tokens in errors', async () => {
    const client = createSandboxAuditClient(env, async () => new Response(JSON.stringify({
        error: { type: 'INPUT_VALIDATION_ERROR', messages: { reference: [env.WOMPI_SANDBOX_PRIVATE_KEY] } },
    }), { status: 422 }));
    const result = await client.reference('AUDIT-SBX-fixture');
    assert.deepEqual(result.errorFields, ['reference']);
    assert.equal(JSON.stringify(result).includes(env.WOMPI_SANDBOX_PRIVATE_KEY), false);
    await assert.rejects(client.transaction('../private', 'AUDIT-SBX-fixture'));
    await assert.rejects(client.createTransaction('AUDIT-SBX-fixture', 'tok_prod_forbidden', 'a', 'p'));
});
