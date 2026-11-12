import { it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';

it('rejects changed or incomplete order replay and recovers only matching unique-key races', async () => {
    const loader = Module as unknown as { _load: (name: string, parent: unknown, main: boolean) => unknown };
    const original = loader._load;
    const originalFetch = globalThis.fetch;
    const env = { ...process.env };
    mock.timers.enable({ apis: ['setInterval'] });
    process.env.KV_REST_API_URL = '';
    process.env.KV_REST_API_TOKEN = '';
    globalThis.fetch = async () => { throw new Error('External transport forbidden in order replay test'); };
    const productId = '00000000-0000-0000-0000-000000000010';
    const input = {
        shipping_name: 'Test Buyer', shipping_email: 'buyer@example.test', shipping_phone: '3001234567',
        shipping_address: '', shipping_city: '', shipping_state: '', shipping_zip_code: null,
        shipping_method: 'pickup', shipping_location: null, payment_method: 'wompi',
        idempotency_key: '00000000-0000-0000-0000-000000000099', items: [{ product_id: productId, quantity: 1 }],
    };
    const existing = { ...input, id: 'order-1', user_id: null, shipping_zip_code: '',
        customer_notes: null, order_items: [{ product_id: productId, quantity: 1, variant_id: null }] };
    let current: typeof existing | null = existing;
    let uniqueRace = false, noRaceWinner = false, reads = 0, inserts = 0;
    const client = {
        from(table: string) {
            let mode = 'read';
            const query = {
                select() { return query; }, eq() { return query; },
                insert() { mode = 'insert'; inserts++; return query; },
                async in() { return { data: [{ id: productId, name: 'Test Product', price: 100,
                    stock_quantity: 10, in_stock: true, images: [], variants: [] }], error: null }; },
                async single() {
                    assert.equal(table, 'orders');
                    if (mode === 'insert') return { data: null, error: { code: '23505', message: 'duplicate key' } };
                    reads++;
                    const found = uniqueRace && (reads === 1 || noRaceWinner) ? null : current;
                    return { data: found, error: found ? null : { code: 'PGRST116' } };
                },
                async maybeSingle() {
                    const response = await query.single();
                    return { ...response, error: response.error?.code === 'PGRST116' ? null : response.error };
                },
            };
            return query;
        },
        rpc() { throw new Error('Replaying an order must never reserve stock again'); },
    };
    loader._load = function(name, parent, main) {
        if (name === '@/lib/supabase') return { supabaseAdmin: client };
        if (name === '@/lib/supabase-server') return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) };
        if (name === '@/lib/observability/checkout') return { captureCheckoutIssue() {} };
        return original.call(this, name, parent, main);
    };
    try {
        const require = createRequire(join(process.cwd(), 'package.json'));
        const route = require(join(process.cwd(), 'app/api/orders/route.ts')) as { POST: (r: Request) => Promise<Response> };
        const request = (overrides: Record<string, unknown> = {}) => new Request('http://localhost/api/orders', {
            method: 'POST', headers: { 'x-forwarded-for': `127.0.0.${reads + 1}` }, body: JSON.stringify({ ...input, ...overrides }),
        });
        assert.equal((await route.POST(request({ shipping_name: 'Changed Buyer' }))).status, 409);
        assert.equal(inserts, 0);
        assert.equal((await route.POST(request({ shipping_email: 'other@example.test' }))).status, 403);
        current = { ...existing, order_items: [] };
        const incomplete = await route.POST(request());
        assert.equal(incomplete.status, 409);
        assert.ok(incomplete.headers.get('retry-after'));
        assert.equal(inserts, 0);
        current = existing;
        const ready = await route.POST(request());
        assert.equal(ready.status, 200);
        assert.equal((await ready.json()).data.id, existing.id);
        uniqueRace = true; reads = 0;
        assert.equal((await route.POST(request())).status, 200);
        assert.equal(inserts, 1);
        noRaceWinner = true; reads = 0;
        assert.equal((await route.POST(request())).status, 500, 'an unrelated unique failure cannot masquerade as replay success');
    } finally {
        loader._load = original;
        mock.timers.reset();
        globalThis.fetch = originalFetch;
        for (const key of ['KV_REST_API_URL', 'KV_REST_API_TOKEN']) {
            if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key];
        }
    }
});
