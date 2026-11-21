import { it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

it('upgrades a historical baseline with synthetic orders without rewriting legacy inventory',
    { skip: process.env.RUN_DB_TESTS !== '1', timeout: 180_000 }, () => {
        const container = `migration-forward-${randomUUID()}`;
        const docker = (args: string[], input?: string) => spawnSync('docker', args,
            { input, encoding: 'utf8', timeout: 30_000 });
        const args = ['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qAt'];
        const run = (source: string) => docker(args, source);
        const sql = (source: string) => {
            const result = run(source);
            assert.equal(result.status, 0, result.stderr || String(result.error));
            return result.stdout.trim();
        };
        const json = (source: string) => JSON.parse(sql(source));
        const directory = join(process.cwd(), 'supabase/migrations');
        const files = readdirSync(directory).filter(name => /^\d{14}_.+\.sql$/.test(name)).sort();
        const boundary = files.indexOf('20261112150230_restrict_stock_rpc_execution.sql') + 1;
        assert.equal(boundary, 28);
        const forward = [
            '20261112182940_atomic_wompi_finalization.sql',
            '20261112190344_rotate_payment_audit_queue.sql',
            '20261112194949_atomic_order_creation.sql',
            '20261112204615_authoritative_variant_inventory.sql',
            '20261114213626_single_payment_attempt.sql',
            '20261114221037_controlled_payment_cutover.sql',
        ];
        assert.deepEqual(files.slice(boundary), forward);
        const hashes = () => files.map(name => createHash('sha256').update(readFileSync(join(directory, name))).digest('hex'));
        const beforeHashes = hashes();
        const apply = (name: string) => sql(readFileSync(join(directory, name), 'utf8'));
        const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
        const literal = (value: unknown) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
        const snapshot = () => sql(`SELECT jsonb_build_object(
            'products',(SELECT jsonb_agg(to_jsonb(p)-'inventory_version' ORDER BY id) FROM products p),
            'orders',(SELECT jsonb_agg(to_jsonb(o)-'inventory_status'-'inventory_review_reason' ORDER BY id) FROM orders o),
            'items',(SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM order_items i),
            'holds',(SELECT jsonb_agg(to_jsonb(r)-'variant_quantities' ORDER BY id) FROM stock_reservations r),
            'audit',(SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM audit_log a));`);
        const order = (number: string) => ({ order_number: number, user_id: null, subtotal: 100, shipping: 0, total: 100,
            shipping_name: 'Synthetic Buyer', shipping_email: 'buyer@example.test', shipping_phone: '3000000000',
            shipping_address: '', shipping_city: '', shipping_state: '', shipping_zip_code: '',
            payment_method: 'wompi', shipping_method: 'pickup', shipping_location: null, idempotency_key: randomUUID() });
        const create = (number: string, product = 10, variant: string | null = null) => {
            const item = { product_id: id(product), product_name: `Fixture ${product}`, product_price: 100,
                product_image: '', quantity: 1, variant_id: variant, variant_name: variant ? 'Red' : null };
            return `SELECT public.create_order_with_stock(${literal(order(number))},${literal([item])});`;
        };
        const claim = (orderId: string) => `SELECT public.claim_wompi_checkout('${orderId}');`;
        const finalize = (orderId: string, number: string, tx = 'synthetic-approved') =>
            `SELECT public.finalize_wompi_payment('${orderId}','${tx}','APPROVED','${number}',10000,'COP');`;

        const started = docker(['run', '--pull=never', '--rm', '-d', '--network=none', '--name', container,
            '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine']);
        assert.equal(started.status, 0, started.stderr || String(started.error));
        try {
            let ready = false;
            for (let i = 0; i < 100; i++) {
                if (docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']).status === 0) {
                    ready = true; break;
                }
                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
            }
            assert.ok(ready, 'disposable PostgreSQL must be ready');
            sql('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
            sql(readFileSync(join(process.cwd(), 'tests/fixtures/migration-bootstrap/platform.sql'), 'utf8'));
            for (const name of files.slice(0, boundary)) {
                if (name === '20260129192037_add_foreign_key_indexes_corrected.sql') {
                    sql(readFileSync(join(process.cwd(), 'supabase/audit_log.sql'), 'utf8'));
                }
                apply(name);
            }
            assert.equal(sql("SELECT count(*) FROM pg_trigger WHERE tgname IN ('profile_audit_trigger','order_audit_trigger') AND NOT tgisinternal;"), '2');
            const variants = [{ id: 'red', name: 'Red', stock_quantity: 5, inStock: true, priceModifier: 0 }];
            for (const [product, catalog] of [[10, []], [11, variants], [12, [{ id: 'red', name: 'Red' }]]] as const) {
                sql(`INSERT INTO products(id,name,slug,price,category,stock_quantity,in_stock,variants)
                    VALUES('${id(product)}','Fixture ${product}','fixture-${product}',100,'maquillaje',5,true,${literal(catalog)});`);
            }
            for (let i = 0; i < 4; i++) {
                const product = i < 2 ? 10 : i === 2 ? 11 : 12;
                const paid = i === 1;
                sql(`INSERT INTO orders(id,order_number,status,payment_status,subtotal,tax,shipping,total,
                    shipping_name,shipping_email,shipping_phone,wompi_transaction_id)
                    VALUES('${id(100 + i)}','LEGACY-${i}','${paid ? 'processing' : 'pending'}','${paid ? 'paid' : 'pending'}',
                    100,0,0,100,'Synthetic Buyer','buyer@example.test','3000000000',${paid ? "'legacy-approved'" : 'NULL'});
                    INSERT INTO order_items(order_id,product_id,product_name,product_price,quantity,variant_id,subtotal)
                    VALUES('${id(100 + i)}','${id(product)}','Fixture ${product}',100,1,${product === 10 ? 'NULL' : "'red'"},100);
                    INSERT INTO stock_reservations(product_id,order_id,quantity,status,expires_at)
                    VALUES('${id(product)}','${id(100 + i)}',1,'${paid ? 'confirmed' : i === 3 ? 'released' : 'reserved'}',
                    now()+interval '${i === 2 ? '-1 minute' : '30 minutes'}');`);
            }
            const historical = snapshot();
            for (const name of forward.slice(0, -1)) {
                apply(name);
                assert.equal(snapshot(), historical, `${name} must preserve existing fields and audit rows`);
            }
            assert.equal(sql('SELECT bool_and(inventory_version=0) FROM products;'), 't');
            assert.equal(sql('SELECT bool_and(variant_quantities IS NULL) FROM stock_reservations;'), 't');
            assert.equal(sql("SELECT bool_and(inventory_status='unverified') FROM orders;"), 't');

            const issued = json(`SET ROLE service_role; ${create('PRE-CUTOVER')} RESET ROLE;`);
            assert.equal(json(`SET ROLE service_role; ${claim(issued.order.id)} RESET ROLE;`).outcome, 'issued');
            const issuedAt = sql(`SELECT issued_at FROM wompi_checkout_attempts WHERE order_id='${issued.order.id}';`);
            const beforeCutover = snapshot();
            apply(forward[5]!);
            assert.equal(snapshot(), beforeCutover, 'cutover must not change existing commerce or audit fields');
            assert.equal(sql(`SELECT issuance_origin FROM wompi_checkout_attempts WHERE order_id='${issued.order.id}';`), 'application');
            assert.equal(sql(`SELECT issued_at FROM wompi_checkout_attempts WHERE order_id='${issued.order.id}';`), issuedAt);
            assert.equal(sql("SELECT count(*) FROM wompi_checkout_attempts WHERE issuance_origin='legacy_uncertain';"), '3');
            assert.equal(sql(`SELECT count(*) FROM wompi_checkout_attempts WHERE order_id='${id(101)}';`), '0');
            assert.equal(json(`SET ROLE service_role; ${claim(id(100))} RESET ROLE;`).outcome, 'existing');

            const fresh = json(`SET ROLE service_role; ${create('POST-CUTOVER', 11, 'red')} RESET ROLE;`);
            assert.equal(json(`SET ROLE service_role; ${claim(fresh.order.id)} RESET ROLE;`).outcome, 'issued');
            assert.equal(json(`SET ROLE service_role; ${finalize(fresh.order.id, 'POST-CUTOVER')} RESET ROLE;`).outcome, 'finalized');
            const paidStock = sql(`SELECT stock_quantity,variants::text FROM products WHERE id='${id(11)}';`);
            assert.equal(sql(`SELECT stock_quantity FROM products WHERE id='${id(11)}';`), '4');
            assert.equal(json(`SET ROLE service_role; ${finalize(fresh.order.id, 'POST-CUTOVER')} RESET ROLE;`).outcome, 'already_finalized');
            assert.equal(json(`SET ROLE service_role; ${finalize(fresh.order.id, 'POST-CUTOVER', 'duplicate-approved')} RESET ROLE;`).reason, 'duplicate_approved_payment');
            assert.equal(sql(`SELECT stock_quantity,variants::text FROM products WHERE id='${id(11)}';`), paidStock);
            assert.equal(sql('SELECT count(*) FROM wompi_payment_exceptions;'), '1');
            const unchanged = snapshot();
            assert.notEqual(run(`SET ROLE service_role; ${create('INVALID-CATALOG', 12, 'red')}`).status, 0);
            assert.equal(snapshot(), unchanged, 'rejected creation must not persist partial commerce or audit writes');
            assert.equal(sql(`SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname='public' AND p.proname IN ('reserve_product_stock','confirm_stock_reservation',
                'release_stock_reservation','cleanup_expired_reservations','finalize_wompi_payment',
                'claim_wompi_payment_audits','create_order_with_stock','claim_wompi_checkout')
                AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
                AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE')
                AND has_function_privilege('service_role',p.oid,'EXECUTE');`), '8');
            assert.deepEqual(hashes(), beforeHashes, 'historical migration files must remain unchanged');
        } finally {
            assert.equal(docker(['stop', container]).status, 0, 'disposable container must be removed');
        }
    });
