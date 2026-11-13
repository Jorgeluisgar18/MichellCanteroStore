import { it } from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

it('protects admin inventory updates with the loaded version and preserves response contracts', async () => {
    const loader = Module as unknown as { _load: (name: string, parent: unknown, main: boolean) => unknown };
    const original = loader._load;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error('Network forbidden in inventory route test'); };
    let user: { id: string } | null = { id: 'admin' }, role = 'admin';
    let writes = 0, invalidations = 0, empty = false;
    let databaseError: { code: string; message: string } | null = null;
    let saved: Record<string, unknown> = {}, filters: Record<string, unknown> = {};
    const variant = { id: 'red', name: 'Red', stock_quantity: 3, priceModifier: 5 };
    let existing = { id: 'product', category: 'ropa', subcategory: null, stock_quantity: 3,
        in_stock: true, inventory_version: 7, variants: [variant] };
    const client = { from(table: string) {
        let updating = false;
        const query = {
            select() { return query; },
            eq(key: string, value: unknown) { if (updating) filters[key] = value; return query; },
            update(value: Record<string, unknown>) { writes++; updating = true; saved = value; filters = {}; return query; },
            insert(value: Record<string, unknown>[]) { writes++; updating = true; saved = value[0]!; filters = {}; return query; },
            async single() {
                if (table === 'profiles') return { data: { role }, error: null };
                return updating ? { data: empty ? null : { ...existing, ...saved }, error: databaseError }
                    : { data: existing, error: null };
            },
            async maybeSingle() { return query.single(); },
        };
        return query;
    } };
    loader._load = function(name, parent, main) {
        if (name === '@/lib/supabase') return { supabase: client, supabaseAdmin: client };
        if (name === '@/lib/supabase-server' || name.replaceAll('\\', '/').endsWith('/lib/supabase-server.ts')) return { createClient: () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } }) };
        if (name === '@/lib/auth-utils') return { getAdminUser: async () => ({ id: 'admin' }) };
        if (name === 'next/cache') return { revalidatePath: () => { invalidations++; } };
        return original.call(this, name, parent, main);
    };
    try {
        const require = createRequire(join(process.cwd(), 'package.json'));
        // Compile dynamic imports to require so every transport remains isolated.
        const filename = join(process.cwd(), 'app/api/products/[id]/route.ts');
        const compiled = new Module(filename) as Module & { _compile: (source: string, filename: string) => void };
        compiled.filename = filename;
        compiled.paths = (Module as unknown as { _nodeModulePaths: (path: string) => string[] })._nodeModulePaths(process.cwd());
        compiled._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
        }).outputText, filename);
        const route = compiled.exports as {
            PUT: (r: Request, context: { params: { id: string } }) => Promise<Response>;
            GET: (r: Request, context: { params: { id: string } }) => Promise<Response>;
        };
        const request = (body: object) => new Request('http://localhost/api/products/product', { method: 'PUT', body: JSON.stringify(body) });
        const put = (body: object) => route.PUT(request(body), { params: { id: 'product' } });
        for (const expected_inventory_version of [undefined, null, -1, 1.5, '7', 2147483648]) {
            const response = await put({ stock_quantity: 3, expected_inventory_version });
            assert.equal(response.status, 400);
            assert.equal(writes, 0);
        }
        assert.equal((await route.GET(request({}), { params: { id: 'product' } })).status, 200);
        user = null;
        assert.equal((await put({ stock_quantity: 3 })).status, 401);
        user = { id: 'admin' }; role = 'customer';
        assert.equal((await put({ stock_quantity: 3 })).status, 403);
        role = 'admin';
        assert.equal((await put({ category: 'not-a-category', expected_inventory_version: 7 })).status, 400);
        const success = await put({ variants: [variant], expected_inventory_version: 7, inventory_version: 999 });
        assert.equal(success.status, 200);
        assert.ok((await success.json()).data);
        assert.equal(filters.inventory_version, 7);
        assert.equal(saved.inventory_version, undefined);
        assert.equal(saved.expected_inventory_version, undefined);
        assert.equal((saved.variants as { priceModifier?: number }[])[0]?.priceModifier, 5);
        assert.equal(saved.stock_quantity, 3);
        for (const inventoryBody of [{ in_stock: false }, { variants: [] }]) {
            const before = writes;
            assert.equal((await put(inventoryBody)).status, 400);
            assert.equal(writes, before);
        }
        for (const stock_quantity of [-1, 1.5, null, '', 2147483648]) {
            const before = writes;
            assert.equal((await put({ stock_quantity, expected_inventory_version: 7 })).status, 400);
            assert.equal(writes, before);
        }
        const beforeAggregate = writes;
        assert.equal((await put({ stock_quantity: 4, expected_inventory_version: 7 })).status, 409);
        assert.equal((await put({ in_stock: false, expected_inventory_version: 7 })).status, 409);
        assert.equal(writes, beforeAggregate);
        assert.equal((await put({ stock_quantity: 3, expected_inventory_version: 0 })).status, 200);
        assert.equal(filters.inventory_version, 0);
        assert.equal((await put({ stock_quantity: 3, expected_inventory_version: 2147483647 })).status, 200);
        assert.equal(filters.inventory_version, 2147483647);
        const invalidated = invalidations;
        empty = true;
        assert.equal((await put({ stock_quantity: 3, expected_inventory_version: 6 })).status, 409);
        assert.equal(invalidations, invalidated);
        empty = false;
        databaseError = { code: '23514', message: 'inventory protected by active holds' };
        assert.equal((await put({ stock_quantity: 1, expected_inventory_version: 7 })).status, 409);
        assert.equal(invalidations, invalidated);
        databaseError = { code: 'XX000', message: 'synthetic database failure' };
        assert.equal((await put({ name: 'Updated' })).status, 500);
        databaseError = null;
        assert.equal((await put({ name: 'Updated' })).status, 200);
        assert.equal(filters.inventory_version, undefined);
        existing = { ...existing, stock_quantity: 1 };
        const beforeMismatch = writes;
        assert.equal((await put({ variants: [variant], expected_inventory_version: 7 })).status, 409);
        assert.equal(writes, beforeMismatch, 'unchanged variant quantities must not restore historical stock');
        assert.equal((await put({ variants: [{ ...variant, stock_quantity: 1 }], expected_inventory_version: 7 })).status, 200);
        const beforeInvalid = writes;
        assert.equal((await put({ variants: [variant, variant], expected_inventory_version: 7 })).status, 400);
        assert.equal((await put({ variants: [{ ...variant, stock_quantity: -1 }], expected_inventory_version: 7 })).status, 400);
        assert.equal(writes, beforeInvalid);
        const post = require(join(process.cwd(), 'app/api/products/route.ts')) as { POST: (r: Request) => Promise<Response> };
        const created = await post.POST(request({ name: 'New', price: 100, category: 'ropa', variants: [variant], inventory_version: 100 }));
        assert.equal(created.status, 200);
        assert.equal(saved.inventory_version, undefined);
        assert.equal(saved.stock_quantity, 3);
        const beforePostInvalid = writes;
        assert.equal((await post.POST(request({ name: 'New', price: 100, category: 'ropa', variants: [variant, variant] }))).status, 400);
        assert.equal(writes, beforePostInvalid);
        existing = { ...existing, variants: [], stock_quantity: 5 };
        assert.equal((await put({ variants: [], stock_quantity: 5, in_stock: true, expected_inventory_version: 7 })).status, 200);
        assert.equal(saved.stock_quantity, 5, 'empty variant arrays must preserve simple product inventory');
    } finally {
        loader._load = original;
        globalThis.fetch = originalFetch;
    }
});

it('sends the separately loaded edit version, never defaults it, and omits versions on creation', async () => {
    const require = createRequire(join(process.cwd(), 'package.json'));
    const React = require('react');
    const loader = Module as unknown as { _load: (name: string, parent: { filename?: string }, main: boolean) => unknown };
    const original = loader._load;
    const originalFetch = globalThis.fetch;
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'React');
    Object.defineProperty(globalThis, 'React', { configurable: true, value: React });
    let editing = true, version: number | undefined = 7, index = 0;
    let states: unknown[] = [], effects: (() => void)[] = [];
    const sent: { method?: string; body: Record<string, unknown> }[] = [];
    const product = { id: 'product', name: 'Fixture', price: 100, category: 'ropa', subcategory: '',
        images: [], variants: [{ id: 'red', stock_quantity: 2, priceModifier: 5 }], stock_quantity: 2 };
    globalThis.fetch = async (url) => {
        assert.equal(String(url), '/api/products/product');
        return new Response(JSON.stringify({ data: { ...product, inventory_version: version } }));
    };
    const dummy = () => null;
    loader._load = function(name, parent, main) {
        if (name === 'react' && parent.filename?.replaceAll('\\', '/').endsWith('/productos/nuevo/page.tsx')) return { ...React,
            useState(initial: unknown) {
                const position = index++;
                if (!(position in states)) states[position] = initial;
                return [states[position], (value: unknown) => { states[position] = typeof value === 'function' ? value(states[position]) : value; }];
            }, useEffect(effect: () => void) { effects.push(effect); },
        };
        if (name === 'next/navigation') return { useParams: () => editing ? { id: 'product' } : {}, useRouter: () => ({ push() {}, back() {} }) };
        if (name === 'next/image') return { __esModule: true, default: dummy };
        if (name.startsWith('@/components/')) return { __esModule: true, default: dummy, Card: dummy, useToast: () => ({ showToast() {} }) };
        if (name === '@/lib/hooks/useCsrfToken') return { fetchWithCsrf: async (_url: string, options: RequestInit) => {
            sent.push({ ...(options.method ? { method: options.method } : {}), body: JSON.parse(String(options.body)) });
            return new Response('{}', { status: 409 });
        } };
        return original.call(this, name, parent, main);
    };
    try {
        const Page = require(join(process.cwd(), 'app/admin/productos/nuevo/page.tsx')).default;
        const render = () => { index = 0; effects = []; return Page(); };
        const submit = async () => {
            const tree = render();
            let handler: ((event: { preventDefault(): void }) => Promise<void>) | undefined;
            const walk = (node: any): void => {
                if (Array.isArray(node)) { node.forEach(walk); return; }
                if (!node?.props) return;
                if (node.type === 'form') handler = node.props.onSubmit;
                walk(node.props.children);
            };
            walk(tree);
            assert.ok(handler);
            await handler({ preventDefault() {} });
        };
        const load = async () => {
            states = [];
            render();
            effects[0]!();
            await new Promise(resolve => setImmediate(resolve));
        };
        await load();
        await submit();
        assert.equal(sent[0]?.method, 'PUT');
        assert.equal(sent[0]?.body.expected_inventory_version, 7);
        assert.equal(sent[0]?.body.inventory_version, undefined);
        assert.equal((sent[0]?.body.variants as { priceModifier: number }[])[0]?.priceModifier, 5);
        assert.equal(sent.length, 1, 'a 409 must not trigger an automatic retry');
        version = undefined;
        await load();
        await submit();
        assert.equal(sent.length, 1, 'missing loaded version must not default to zero');
        editing = false;
        states = [];
        render();
        const formIndex = states.findIndex(value => value && typeof value === 'object' && 'variants' in value);
        states[formIndex] = product;
        await submit();
        assert.equal(sent[1]?.method, 'POST');
        assert.equal(sent[1]?.body.expected_inventory_version, undefined);
        assert.equal(sent[1]?.body.inventory_version, undefined);
    } finally {
        loader._load = original;
        globalThis.fetch = originalFetch;
        if (descriptor) Object.defineProperty(globalThis, 'React', descriptor); else Reflect.deleteProperty(globalThis, 'React');
    }
});
