import { it } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';

it('pauses commerce writers before business work and preserves reads and default behavior', async () => {
    const loader = Module as unknown as { _load: (name: string, parent: unknown, main: boolean) => unknown };
    const original = loader._load;
    const originalFetch = globalThis.fetch;
    const previous = { maintenance: process.env.COMMERCE_MAINTENANCE_MODE,
        cron: process.env.CRON_SECRET, events: process.env.WOMPI_EVENTS_SECRET };
    let businessCalls = 0;
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
    process.env.CRON_SECRET = 'local-maintenance-fixture';
    process.env.WOMPI_EVENTS_SECRET = 'local-events-fixture';
    type Handler = (request: Request, context: { params: { id: string } }) => Promise<Response>;
    const require = createRequire(join(process.cwd(), 'package.json'));
    try {
        const matrix: [string, string[]][] = [
            ['payments/checkout-params', ['POST']],
            ['orders', ['POST']], ['orders/[id]', ['PUT', 'DELETE']],
            ['products', ['POST']], ['products/[id]', ['PUT', 'DELETE']],
            ['payments/reconcile', ['POST']],
            ['payments/webhook', ['POST']], ['cron/cleanup-reservations', ['GET', 'POST']],
            ['cron/audit-pending-payments', ['GET', 'POST']],
        ];
        process.env.COMMERCE_MAINTENANCE_MODE = 'true';
        let parsedBodies = 0;
        for (const [path, methods] of matrix) {
            const route = require(join(process.cwd(), `app/api/${path}/route.ts`)) as Record<string, Handler>;
            for (const method of methods) {
                const request = new Request(`https://store.example.test/api/${path.replace('[id]', 'fixture')}`, {
                    method, headers: { authorization: 'Bearer local-maintenance-fixture',
                        'x-commerce-maintenance-mode': 'false' },
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
                assert.equal(businessCalls, 0, `${method} ${path} must not access business services`);
                assert.equal(parsedBodies, 0, `${method} ${path} must pause before parsing the body`);
            }
        }
        const productRoute = require(join(process.cwd(), 'app/api/products/[id]/route.ts')) as { GET: Handler };
        const catalog = await productRoute.GET(new Request('https://store.example.test/api/products/product-1'),
            { params: { id: fixture.id } });
        assert.equal(catalog.status, 200, 'catalog reads stay available while paused');
        assert.equal((await catalog.json()).data.id, fixture.id);
        assert.equal(businessCalls, 1);
        businessCalls = 0;
        const checkout = require(join(process.cwd(), 'app/api/payments/checkout-params/route.ts')) as { POST: Handler };
        for (const value of [undefined, 'false', 'TRUE']) {
            if (value === undefined) delete process.env.COMMERCE_MAINTENANCE_MODE;
            else process.env.COMMERCE_MAINTENANCE_MODE = value;
            const response = await checkout.POST(new Request('https://store.example.test/api/payments/checkout-params',
                { method: 'POST', body: '{}' }), { params: { id: 'fixture' } });
            assert.equal(response.status, 400, 'disabled mode retains existing validation');
        }
        delete process.env.COMMERCE_MAINTENANCE_MODE;
        const webhook = require(join(process.cwd(), 'app/api/payments/webhook/route.ts')) as { POST: Handler };
        assert.equal((await webhook.POST(new Request('https://store.example.test/api/payments/webhook',
            { method: 'POST', body: '{}' }), { params: { id: 'fixture' } })).status, 401,
        'disabled mode retains webhook signature enforcement');
        const cron = require(join(process.cwd(), 'app/api/cron/cleanup-reservations/route.ts')) as { GET: Handler };
        assert.equal((await cron.GET(new Request('https://store.example.test/api/cron/cleanup-reservations'),
            { params: { id: 'fixture' } })).status, 401, 'disabled mode retains cron authorization');
        assert.equal(businessCalls, 0);
    } finally {
        loader._load = original;
        globalThis.fetch = originalFetch;
        for (const [key, value] of [['COMMERCE_MAINTENANCE_MODE', previous.maintenance],
            ['CRON_SECRET', previous.cron], ['WOMPI_EVENTS_SECRET', previous.events]] as const) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
    }
});
