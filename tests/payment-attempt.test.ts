import { it } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';

it('issues only after an atomic claim and sends existing attempts to verification without signed parameters', async () => {
    const loader = Module as unknown as { _load: (name: string, parent: unknown, main: boolean) => unknown };
    const original = loader._load;
    const env = { ...process.env };
    let outcome = 'existing', claims = 0, email = 'buyer@example.test';
    const order = { id: 'order-1', order_number: 'REF-1', total: 100, user_id: null, shipping_email: email, payment_status: 'pending' };
    const builder = { select: () => builder, eq: () => builder, gt: () => builder,
        single: async () => ({ data: order }), then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve({ count: 1 })) };
    loader._load = function(name, parent, main) {
        if (name === '@/lib/supabase') return { supabaseAdmin: { from: () => builder, rpc: async () => {
            claims++; return { data: { outcome, total: 100, order_number: 'REF-1' }, error: null };
        } } };
        if (name === '@/lib/supabase-server') return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) };
        if (name === '@/lib/observability/checkout') return { captureCheckoutIssue() {} };
        return original.call(this, name, parent, main);
    };
    process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY = 'pub_test_fixture';
    process.env.WOMPI_INTEGRITY_SECRET = 'test_integrity_fixture';
    try {
        const require = createRequire(join(process.cwd(), 'package.json'));
        const { POST } = require(join(process.cwd(), 'app/api/payments/checkout-params/route.ts'));
        const request = () => new Request('http://localhost/api/payments/checkout-params', { method: 'POST', body: JSON.stringify({ orderId: order.id, email }) });
        let response = await POST(request());
        assert.equal(response.status, 202);
        assert.equal((await response.json()).code, 'payment_verification_required');
        outcome = 'processed';
        assert.equal((await POST(request())).status, 202, 'processed orders must verify, never receive new payment fields');
        outcome = 'reservation_invalid';
        assert.equal((await POST(request())).status, 409);
        outcome = 'issued'; response = await POST(request());
        assert.equal(response.status, 200);
        assert.equal((await response.json()).data.reference, 'REF-1');
        email = 'other@example.test';
        const before = claims;
        assert.equal((await POST(request())).status, 403);
        assert.equal(claims, before);
    } finally { loader._load = original; process.env = env; }
});
