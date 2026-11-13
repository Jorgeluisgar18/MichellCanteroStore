import { it, mock } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';

it('validates authoritative selections while preserving authorized replay and SQL error contracts', async () => {
    const loader = Module as unknown as { _load: (name: string, parent: unknown, main: boolean) => unknown };
    const original = loader._load;
    mock.timers.enable({ apis: ['setInterval'] });
    const id = '00000000-0000-0000-0000-000000000010';
    const variant = { id: 'legacy-red', name: 'Catalog Red', inStock: true, stock_quantity: 2, priceModifier: -5 };
    let product = { id, name: 'Catalog Product', price: 100, stock_quantity: 4, in_stock: true, images: [], variants: [variant, { ...variant, id: 'blue' }] };
    const input = { shipping_name: 'Buyer', shipping_email: 'buyer@example.test', shipping_phone: '3001234567',
        shipping_method: 'pickup', idempotency_key: '00000000-0000-0000-0000-000000000099',
        items: [{ product_id: id, quantity: 1, variant_id: variant.id, variant_name: 'Forged label', product_price: 1 }] };
    let existing: Record<string, unknown> | null = null;
    let catalogReads = 0, writes = 0;
    let sqlCode: string | null = null;
    let saved: Record<string, unknown>[] = [];
    const client = {
        from(table: string) {
            const query = { select() { return query; }, eq() { return query; },
                async maybeSingle() { assert.equal(table, 'orders'); return { data: existing, error: null }; },
                async in() { catalogReads++; return { data: [product], error: null }; } };
            return query;
        },
        async rpc(name: string, args: { items_param: Record<string, unknown>[] }) {
            assert.equal(name, 'create_order_with_stock');
            writes++; saved = args.items_param;
            return sqlCode ? { data: null, error: { code: sqlCode } }
                : { data: { order: { id: 'created' }, items: saved }, error: null };
        },
    };
    loader._load = function(name, parent, main) {
        if (name === '@/lib/supabase') return { supabaseAdmin: client };
        if (name === '@/lib/supabase-server') return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) };
        if (name === '@/lib/middleware/ratelimit') return { checkRateLimit: async () => ({ success: true }), getClientIdentifier: () => 'fixture' };
        if (name === '@/lib/utils/logger') return { logger: { warn() {} }, logApiRequest() {}, logApiError() {} };
        if (name === '@/lib/observability/checkout') return { captureCheckoutIssue() {} };
        return original.call(this, name, parent, main);
    };
    try {
        const require = createRequire(join(process.cwd(), 'package.json'));
        const { POST } = require(join(process.cwd(), 'app/api/orders/route.ts'));
        let requestNumber = 0;
        const post = (patch: Record<string, unknown> = {}) => POST(new Request('http://localhost/api/orders', {
            method: 'POST', headers: { 'x-forwarded-for': `127.1.0.${++requestNumber}` }, body: JSON.stringify({ ...input, ...patch }),
        })) as Promise<Response>;
        for (const items of [[{ product_id: id, quantity: 1 }], [{ ...input.items[0], variant_id: 'missing' }],
            [{ ...input.items[0], quantity: 2 }, { ...input.items[0], quantity: 1 }],
            [{ ...input.items[0], quantity: 2 }, { ...input.items[0], variant_id: 'blue', quantity: 3 }]]) {
            assert.equal((await post({ items })).status, 400);
        }
        assert.equal(writes, 0);
        assert.equal((await post()).status, 201);
        assert.equal(saved[0]?.product_price, 95);
        assert.equal(saved[0]?.variant_name, 'Catalog Red');
        assert.equal(saved[0]?.product_name, 'Catalog Product');
        for (const [code, status] of [['P0003', 400], ['P0001', 400], ['P0002', 409]] as const) {
            sqlCode = code; assert.equal((await post()).status, status);
        }
        sqlCode = null;
        product = { ...product, variants: [] };
        assert.equal((await post()).status, 400, 'variantless products cannot accept forged IDs');
        assert.equal((await post({ items: [{ product_id: id, quantity: 1, variant_name: 'Forged' }] })).status, 201);
        assert.equal(saved[0]?.variant_name, null, 'a variantless product must not persist a forged selection label');
        existing = { ...input, user_id: null, order_items: [{ ...input.items[0], variant_name: 'Catalog Red' }] };
        const before = catalogReads;
        assert.equal((await post()).status, 200, 'completed replay must work after catalog deletion or selection changes');
        assert.equal(catalogReads, before);
        assert.equal((await post({ shipping_email: 'other@example.test' })).status, 403);
        assert.equal(catalogReads, before);
    } finally { loader._load = original; mock.timers.reset(); }
});
