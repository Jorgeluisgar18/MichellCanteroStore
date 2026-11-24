import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';

it('preserves payment route responses and delegates every write to the atomic RPC', async () => {
    // Test-only transport substitution: real handlers and finalizer, no provider or hosted database calls.
    const loader = Module as unknown as { _load: (name: string, parent: unknown, main: boolean) => unknown };
    const original = loader._load;
    const env = { ...process.env };
    const originalFetch = globalThis.fetch;
    let calls = 0, emails = 0, accessEmail = 'buyer@example.test';
    let result = { outcome: 'finalized', changed: true, payment_status: 'paid', inventory_status: 'confirmed' };
    const order = { id: 'order-1', order_number: 'TEST-1', total: 100, user_id: null,
        shipping_email: accessEmail, payment_status: 'pending', inventory_status: 'unverified' };
    const transaction = { id: 'txn-1', reference: 'TEST-1', amount_in_cents: 10000, currency: 'COP', status: 'APPROVED' };
    let referenceRows: typeof transaction[] | undefined;
    const client = {
        from(table: string) {
            const builder = {
                select() { return builder; }, eq() { return builder; }, or() { return builder; },
                lt() { return builder; }, gte() { return builder; }, order() { return builder; },
                async limit() { return { data: [order], error: null }; },
                async single() { return { data: order, error: null }; },
                then(resolve: (value: unknown) => unknown) { return Promise.resolve(resolve({ data: table === 'order_items' ? [] : [order], error: null })); },
            };
            return builder;
        },
        async rpc(name: string, args: Record<string, unknown>) {
            if (name === 'claim_wompi_payment_audits') {
                assert.equal(args.batch_size_param, 25);
                return { data: [order], error: null };
            }
            assert.equal(name, 'finalize_wompi_payment');
            assert.equal(args.amount_in_cents_param, 10000);
            calls++;
            return { data: result, error: null };
        },
    };
    process.env.WOMPI_EVENTS_SECRET = 'local-signature-secret';
    process.env.WOMPI_PRIVATE_KEY = 'prv_prod_fixture';
    process.env.CRON_SECRET = 'local-cron-secret';
    process.env.RESEND_API_KEY = 'local-email-fixture';
    globalThis.fetch = async (input) => {
        assert.match(String(input), /^https:\/\/api\.resend\.com\/emails$/);
        assert.ok(calls > 0, 'email transport must run after the finalizer');
        emails++;
        return new Response(JSON.stringify({ id: 'local-email' }), { headers: { 'Content-Type': 'application/json' } });
    };
    loader._load = function(name, parent, main) {
        if (name === '@/lib/supabase') return { supabaseAdmin: client };
        if (name === '@/lib/supabase-server') return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) };
        if (name === '@/lib/payments/wompi') return {
            getWompiTransactionById: async () => transaction,
            getWompiTransactionsByReference: async () => referenceRows ?? [transaction],
        };
        if (name === '@/lib/email') return {
            sendOrderNotificationToAdmin: async () => { assert.ok(calls > 0); emails++; },
            sendOrderConfirmationToCustomer: async () => { assert.ok(calls > 0); emails++; },
        };
        if (name === '@/lib/observability/checkout') return { captureCheckoutIssue: () => undefined };
        if (name === '@/lib/utils/logger') return { logger: { info() {}, error() {}, warn() {} } };
        return original.call(this, name, parent, main);
    };
    try {
        const require = createRequire(join(process.cwd(), 'package.json'));
        const webhook = require(join(process.cwd(), 'app/api/payments/webhook/route.ts')) as { POST: (r: Request) => Promise<Response> };
        const reconcile = require(join(process.cwd(), 'app/api/payments/reconcile/route.ts')) as typeof webhook;
        const cron = require(join(process.cwd(), 'app/api/cron/audit-pending-payments/route.ts')) as { GET: (r: Request) => Promise<Response> };
        const signedWebhook = (overrides: Record<string, unknown> = {}) => {
            const tx = { ...transaction, ...overrides };
            const timestamp = 123;
            const properties = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];
            const checksum = createHash('sha256').update(`${tx.id}${tx.status}${tx.amount_in_cents}${timestamp}${process.env.WOMPI_EVENTS_SECRET}`).digest('hex');
            return new Request('http://localhost/api/payments/webhook', { method: 'POST', body: JSON.stringify({
                event: 'transaction.updated', data: { transaction: tx }, timestamp, signature: { properties, checksum },
            }) });
        };
        const reconcileRequest = () => new Request('http://localhost/api/payments/reconcile', { method: 'POST',
            body: JSON.stringify({ orderId: order.id, transactionId: transaction.id, email: accessEmail }) });
        assert.deepEqual(await (await webhook.POST(signedWebhook())).json(), { success: true });
        assert.equal(emails, 2);
        result = { ...result, outcome: 'already_finalized', changed: false };
        assert.deepEqual(await (await webhook.POST(signedWebhook())).json(), { success: true, duplicate: true });
        assert.equal(emails, 2);
        assert.equal((await webhook.POST(signedWebhook({ amount_in_cents: 9999 }))).status, 400);
        transaction.reference = 'PROVIDER-OTHER-ORDER';
        const beforeMismatch = calls;
        assert.equal((await webhook.POST(signedWebhook({ reference: 'TEST-1' }))).status, 400);
        assert.equal(calls, beforeMismatch, 'unsigned reference must match provider record before any write');
        transaction.reference = 'TEST-1';
        const before = calls;
        assert.equal((await webhook.POST(new Request('http://localhost', { method: 'POST', body: '{}' }))).status, 401);
        assert.equal(calls, before);
        assert.deepEqual(await (await reconcile.POST(reconcileRequest())).json(), { data: { status: 'already_paid', orderId: order.id } });
        accessEmail = 'stranger@example.test';
        assert.equal((await reconcile.POST(reconcileRequest())).status, 403);
        assert.equal(calls, before + 1);
        accessEmail = order.shipping_email;
        result = { ...result, outcome: 'inventory_review', changed: true, inventory_status: 'review_required' };
        assert.equal((await webhook.POST(signedWebhook())).status, 409);
        assert.equal((await reconcile.POST(reconcileRequest())).status, 409);
        assert.equal(emails, 2, 'inventory exceptions must not send normal fulfillment confirmations');
        assert.equal((await cron.GET(new Request('http://localhost'))).status, 401);
        const cronRequest = () => new Request('http://localhost', { headers: { authorization: 'Bearer local-cron-secret' } });
        assert.equal((await (await cron.GET(cronRequest())).json()).manualReview, 1);
        result = { ...result, outcome: 'already_finalized', changed: false, inventory_status: 'confirmed' };
        const summary = await (await cron.GET(cronRequest())).json();
        assert.equal(summary.unchanged, 1);
        assert.equal(summary.reconciled, 0);
        const recovery = new Request('http://localhost/api/payments/reconcile', { method: 'POST',
            body: JSON.stringify({ orderId: order.id, email: accessEmail }) });
        assert.equal((await reconcile.POST(recovery)).status, 200, 'lost redirect ID recovers by authorized order reference');
        const recoverAgain = () => new Request('http://localhost/api/payments/reconcile', { method: 'POST',
            body: JSON.stringify({ orderId: order.id, email: accessEmail }) });
        referenceRows = [{ ...transaction, id: 'declined', status: 'DECLINED' }, { ...transaction, id: 'pending', status: 'PENDING' }];
        assert.equal((await reconcile.POST(recoverAgain())).status, 202, 'pending retry must not be hidden by historical decline');
        referenceRows.reverse();
        assert.equal((await reconcile.POST(recoverAgain())).status, 202);
        referenceRows = [{ ...transaction, status: 'DECLINED' }];
        assert.equal((await reconcile.POST(recoverAgain())).status, 409);
        referenceRows = undefined;
        result = { ...result, outcome: 'conflict' };
        assert.equal((await webhook.POST(signedWebhook())).status, 409);
    } finally {
        loader._load = original;
        globalThis.fetch = originalFetch;
        for (const key of ['WOMPI_EVENTS_SECRET', 'WOMPI_PRIVATE_KEY', 'CRON_SECRET', 'RESEND_API_KEY']) {
            if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key];
        }
    }
});
