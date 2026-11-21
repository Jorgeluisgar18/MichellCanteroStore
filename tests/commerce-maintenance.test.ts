import { it } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';

it('pauses baseline commerce writers without schema changes and preserves catalog reads', async () => {
    const loader = Module as unknown as { _load: (name: string, parent: unknown, main: boolean) => unknown };
    const original = loader._load;
    const originalFetch = globalThis.fetch;
    const previous = process.env.COMMERCE_MAINTENANCE_MODE;
    let businessCalls = 0;
    let parsedBodies = 0;
    const blocked = () => { businessCalls++; throw new Error('Unexpected business effect'); };
    const fixture = { id: 'product-1', name: 'Catalog fixture', price: 100, images: [], variants: [] };
    const readBuilder = { select: () => readBuilder, eq: () => readBuilder,
        single: async () => ({ data: fixture, error: null }) };
    const client = { from: () => { businessCalls++; return readBuilder; }, rpc: blocked };
    loader._load = function (name, parent, main) {
        if (name === '@/lib/supabase') return { supabase: client, supabaseAdmin: client };
        if (name === '@/lib/supabase-server') return { createClient: blocked };
        if (name === '@supabase/supabase-js') return { createClient: blocked };
        if (name === '@/lib/auth-utils') return { getAdminUser: blocked };
        if (name === '@/lib/middleware/ratelimit') return { checkRateLimit: async () => ({ success: true }),
            getClientIdentifier: () => 'local-maintenance-fixture' };
        if (name === '@/lib/observability/checkout') return { captureCheckoutIssue: blocked };
        if (name === '@/lib/utils/logger') return { logger: { info() {}, warn() {}, error() {} } };
        return original.call(this, name, parent, main);
    };
    globalThis.fetch = async () => blocked();
    type Handler = (request: Request, context: { params: { id: string } }) => Promise<Response>;
    const require = createRequire(join(process.cwd(), 'package.json'));
    try {
        const matrix: [string, string[]][] = [
            ['payments/checkout-params', ['POST']], ['orders', ['POST']],
            ['orders/[id]', ['PUT', 'DELETE']], ['products', ['POST']],
            ['products/[id]', ['PUT', 'DELETE']], ['payments/reconcile', ['POST']],
            ['payments/webhook', ['POST']], ['cron/cleanup-reservations', ['GET', 'POST']],
            ['cron/audit-pending-payments', ['GET', 'POST']],
        ];
        process.env.COMMERCE_MAINTENANCE_MODE = 'true';
        for (const [path, methods] of matrix) {
            const route = require(join(process.cwd(), `app/api/${path}/route.ts`)) as Record<string, Handler>;
            for (const method of methods) {
                const request = new Request(`https://store.example.test/api/${path.replace('[id]', 'fixture')}`, {
                    method, headers: { 'x-commerce-maintenance-mode': 'false' },
                    ...(method === 'GET' ? {} : { body: '{}' }),
                });
                request.json = async () => { parsedBodies++; return {}; };
                const response = await route[method]!(request, { params: { id: 'fixture' } });
                assert.equal(response.status, 503, `${method} ${path} must pause before business work`);
                assert.equal(response.headers.get('retry-after'), '60');
                assert.equal(response.headers.get('cache-control'), 'no-store');
                assert.deepEqual(await response.json(), {
                    error: 'Las compras estan temporalmente en mantenimiento. Intenta nuevamente en unos minutos.',
                    code: 'commerce_maintenance',
                });
                assert.equal(businessCalls, 0, `${method} ${path} must not call services`);
                assert.equal(parsedBodies, 0, `${method} ${path} must not parse bodies`);
            }
        }
        const product = require(join(process.cwd(), 'app/api/products/[id]/route.ts')) as { GET: Handler };
        const response = await product.GET(new Request('https://store.example.test/api/products/product-1'),
            { params: { id: fixture.id } });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).data.id, fixture.id);
        assert.equal(businessCalls, 1);
        businessCalls = 0;
        const checkout = require(join(process.cwd(), 'app/api/payments/checkout-params/route.ts')) as { POST: Handler };
        for (const value of [undefined, 'false', 'TRUE']) {
            if (value === undefined) delete process.env.COMMERCE_MAINTENANCE_MODE;
            else process.env.COMMERCE_MAINTENANCE_MODE = value;
            const off = await checkout.POST(new Request('https://store.example.test/api/payments/checkout-params',
                { method: 'POST', body: '{}' }), { params: { id: 'fixture' } });
            assert.equal(off.status, 400, 'disabled mode retains baseline validation');
            assert.equal(off.headers.get('retry-after'), null);
        }
        assert.equal(businessCalls, 0);
    } finally {
        loader._load = original;
        globalThis.fetch = originalFetch;
        if (previous === undefined) delete process.env.COMMERCE_MAINTENANCE_MODE;
        else process.env.COMMERCE_MAINTENANCE_MODE = previous;
    }
});
