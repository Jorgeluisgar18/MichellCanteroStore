import { it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

it('commits order, items and stock holds together or rolls all of them back', { skip: process.env.RUN_DB_TESTS !== '1', timeout: 120_000 }, async () => {
    const container = `order-create-${randomUUID()}`;
    const docker = (args: string[], input?: string) => spawnSync('docker', args, { input, encoding: 'utf8', timeout: 30_000 });
    const args = ['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'];
    const sql = (source: string) => {
        const result = docker(args, source);
        assert.equal(result.status, 0, result.stderr || String(result.error));
        return result.stdout.trim();
    };
    const concurrent = (source: string): Promise<number> => new Promise((resolve, reject) => {
        const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
        child.stdout.resume(); child.stderr.resume(); child.on('error', reject);
        child.on('close', code => resolve(code ?? -1)); child.stdin.end(source);
    });
    const product = '00000000-0000-0000-0000-000000000010';
    const second = '00000000-0000-0000-0000-000000000011';
    const order = { order_number: 'ATOMIC-1', user_id: null, subtotal: 200, shipping: 0, total: 200,
        shipping_name: 'Test Buyer', shipping_email: 'buyer@example.test', shipping_phone: '3001234567',
        shipping_address: '', shipping_city: '', shipping_state: '', shipping_zip_code: '',
        payment_method: 'wompi', shipping_method: 'pickup', shipping_location: null,
        idempotency_key: '00000000-0000-0000-0000-000000000099' };
    const items = [{ product_id: product, product_name: 'Fixture', product_price: 100, product_image: '', quantity: 2, variant_id: null, variant_name: null }];
    const call = (o: object = order, i: object = items) => `SELECT public.create_order_with_stock('${JSON.stringify(o).replaceAll("'", "''")}'::jsonb,'${JSON.stringify(i).replaceAll("'", "''")}'::jsonb);`;
    const empty = () => {
        assert.equal(sql('SELECT count(*) FROM orders;'), '0');
        assert.equal(sql('SELECT count(*) FROM order_items;'), '0');
        assert.equal(sql('SELECT count(*) FROM stock_reservations;'), '0');
        assert.equal(sql('SELECT count(*) FROM audit_marker;'), '0');
    };
    const reset = () => sql('TRUNCATE order_items, stock_reservations, orders, audit_marker; UPDATE products SET stock_quantity=5, in_stock=true, name=\'Fixture\',price=100;');
    assert.equal(docker(['run', '--rm', '-d', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine']).status, 0);
    try {
        let ready = false;
        for (let i = 0; i < 100; i++) {
            if (docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']).status === 0) { ready = true; break; }
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
        }
        assert.ok(ready);
        sql(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
            CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
            CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
            CREATE TABLE profiles(id uuid PRIMARY KEY, role text);
            CREATE FUNCTION update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
            CREATE TABLE products(id uuid PRIMARY KEY, name text NOT NULL, price numeric(10,2), stock_quantity integer CHECK(stock_quantity>=0),
                in_stock boolean DEFAULT true, variants jsonb DEFAULT '[]', updated_at timestamptz DEFAULT now());
            CREATE TABLE orders(id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), user_id uuid, order_number text UNIQUE NOT NULL,
                status text DEFAULT 'pending', payment_status text DEFAULT 'pending', wompi_transaction_id text, payment_id text,
                subtotal numeric(10,2) NOT NULL, tax numeric(10,2) DEFAULT 0, shipping numeric(10,2) NOT NULL, total numeric(10,2) NOT NULL,
                shipping_name text NOT NULL, shipping_email text NOT NULL, shipping_phone text NOT NULL, shipping_address text NOT NULL,
                shipping_city text NOT NULL, shipping_state text NOT NULL, shipping_zip_code text NOT NULL DEFAULT '',
                payment_method text, shipping_method text DEFAULT 'delivery', shipping_location text, customer_notes text,
                idempotency_key text UNIQUE, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
            CREATE TABLE order_items(id uuid PRIMARY KEY DEFAULT uuid_generate_v4(), order_id uuid NOT NULL REFERENCES orders ON DELETE CASCADE,
                product_id uuid REFERENCES products, product_name text NOT NULL CHECK(product_name<>'Reject item'),
                product_price numeric(10,2) NOT NULL CHECK(product_price>=0), product_image text,quantity integer NOT NULL CHECK(quantity>0),
                variant_name text,variant_id text,subtotal numeric(10,2) NOT NULL CHECK(subtotal>=0));
            CREATE TABLE audit_marker(order_id uuid);
            CREATE FUNCTION audit_order_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO public.audit_marker VALUES(NEW.id); RETURN NEW; END $$;
            CREATE TRIGGER audit_order_insert AFTER INSERT ON orders FOR EACH ROW EXECUTE FUNCTION audit_order_insert();
            INSERT INTO products(id,name,price,stock_quantity) VALUES('${product}','Fixture',100,5),('${second}','Fixture',100,5);`);
        for (const name of ['20260122162342_inventory_management_functions.sql', '20260129203241_stock_reservation.sql', '20260603014012_20260603_fix_stock_reservation_schema.sql', '20261112150230_restrict_stock_rpc_execution.sql']) {
            sql(readFileSync(join(process.cwd(), 'supabase/migrations', name), 'utf8'));
        }
        const name = readdirSync(join(process.cwd(), 'supabase/migrations')).find(file => file.endsWith('_atomic_order_creation.sql'));
        assert.ok(name);
        sql(readFileSync(join(process.cwd(), 'supabase/migrations', name), 'utf8'));
        const created = JSON.parse(sql(call()));
        assert.equal(created.order.status, 'pending');
        assert.equal(created.items.length, 1);
        assert.equal(created.items[0].order_id, created.order.id);
        assert.equal(sql('SELECT quantity FROM stock_reservations;'), '2');
        assert.equal(sql("SELECT expires_at-created_at = interval '30 minutes' FROM stock_reservations;"), 't');
        assert.equal(sql(`SELECT stock_quantity FROM products WHERE id='${product}';`), '5');
        assert.notEqual(docker(args, call()).status, 0);
        assert.equal(sql('SELECT count(*) FROM orders;'), '1');
        reset();
        sql("UPDATE products SET name='Reject item';");
        assert.notEqual(docker(args, call(order, [{ ...items[0], product_name: 'Reject item' }])).status, 0);
        empty();
        reset();
        sql(`UPDATE products SET stock_quantity=0 WHERE id='${second}';`);
        assert.notEqual(docker(args, call({ ...order, subtotal: 300, total: 300 }, [...items, { ...items[0], product_id: second, quantity: 1 }])).status, 0);
        empty();
        reset();
        sql(`CREATE FUNCTION reject_second_hold() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
            IF NEW.product_id='${second}' THEN RAISE EXCEPTION 'Synthetic helper exception'; END IF; RETURN NEW; END $$;
            CREATE TRIGGER reject_second_hold BEFORE INSERT ON stock_reservations FOR EACH ROW EXECUTE FUNCTION reject_second_hold();`);
        assert.notEqual(docker(args, call({ ...order, subtotal: 300, total: 300 }, [...items, { ...items[0], product_id: second, quantity: 1 }])).status, 0);
        empty();
        sql('DROP TRIGGER reject_second_hold ON stock_reservations;');
        reset();
        assert.notEqual(docker(args, call({ ...order, subtotal: 600, total: 600 }, [{ ...items[0], quantity: 3 }, { ...items[0], quantity: 3 }])).status, 0);
        empty();
        reset();
        sql('UPDATE products SET price=101;');
        assert.notEqual(docker(args, call()).status, 0);
        empty();
        reset();
        sql("UPDATE products SET name='New catalog title';");
        assert.notEqual(docker(args, call()).status, 0);
        empty();
        reset();
        assert.notEqual(docker(args, call({ ...order, total: 1 })).status, 0);
        empty();
        for (const [modifier, unitPrice] of [[25, 125], ['25', 100]] as const) {
            reset();
            sql(`UPDATE products SET variants='${JSON.stringify([{ id: 'legacy-text-id', priceModifier: modifier }, { id: 'legacy-text-id', priceModifier: 50 }])}'::jsonb;`);
            const value = JSON.parse(sql(call({ ...order, subtotal: unitPrice * 2, total: unitPrice * 2 },
                [{ ...items[0], variant_id: 'legacy-text-id', product_price: unitPrice }])));
            assert.equal(value.items[0].product_price, unitPrice);
            assert.equal(sql('SELECT variant_id FROM order_items;'), 'legacy-text-id');
        }
        reset();
        sql(`UPDATE products SET price=0.10, variants='[{"id":"decimal","priceModifier":0.2}]';`);
        const decimal = 0.1 + 0.2;
        assert.equal(JSON.parse(sql(call({ ...order, subtotal: decimal * 2, total: decimal * 2 },
            [{ ...items[0], variant_id: 'decimal', product_price: decimal }]))).order.total, 0.6);
        reset();
        const sameKey = await Promise.all([concurrent(call()), concurrent(call({ ...order, order_number: 'ATOMIC-RACE' }))]);
        assert.equal(sameKey.filter(code => code === 0).length, 1);
        assert.equal(sql('SELECT count(*) FROM order_items;'), '1');
        assert.equal(sql('SELECT count(*) FROM stock_reservations;'), '1');
        reset();
        sql('UPDATE products SET stock_quantity=3;');
        const contention = await Promise.all([concurrent(call()), concurrent(call({ ...order, order_number: 'OTHER-ORDER', idempotency_key: randomUUID() }))]);
        assert.equal(contention.filter(code => code === 0).length, 1);
        assert.equal(sql('SELECT count(*) FROM orders;'), '1');
        assert.equal(sql('SELECT sum(quantity) FROM stock_reservations;'), '2');
        reset();
        for (const role of ['anon', 'authenticated']) {
            assert.notEqual(docker(args, `SET ROLE ${role}; ${call()}`).status, 0);
            empty();
        }
        sql(`SET ROLE service_role; ${call()}`);
        assert.equal(sql('SELECT count(*) FROM orders;'), '1');
        // Upgrade the same historical fixture to the variant-aware engine.
        sql(readFileSync(join(process.cwd(), 'supabase/migrations/20261112182940_atomic_wompi_finalization.sql'), 'utf8'));
        const variantMigration = readdirSync(join(process.cwd(), 'supabase/migrations')).find(file => file.endsWith('_authoritative_variant_inventory.sql'));
        assert.ok(variantMigration);
        sql(readFileSync(join(process.cwd(), 'supabase/migrations', variantMigration), 'utf8'));
        const variants = (a: number, b = 9) => [
            { id: 'red', name: 'Red', stock_quantity: a, inStock: a > 0 },
            { id: 'blue', name: 'Blue', stock_quantity: b, inStock: b > 0 },
        ];
        const resetVariants = () => {
            sql(`TRUNCATE order_items,stock_reservations,orders,audit_marker CASCADE;
                UPDATE products SET variants='${JSON.stringify(variants(1))}',stock_quantity=10,in_stock=true,price=100,name='Fixture' WHERE id='${product}';
                UPDATE products SET variants='[]',stock_quantity=5,in_stock=true,price=100,name='Fixture' WHERE id='${second}';`);
        };
        const selected = [{ ...items[0], quantity: 1, variant_id: 'red', variant_name: 'Forged label' }];
        const oneOrder = { ...order, subtotal: 100, total: 100 };
        const finalize = (id: string, reference = 'ATOMIC-1', tx = 'variant-tx') =>
            `SELECT public.finalize_wompi_payment('${id}','${tx}','APPROVED','${reference}',10000,'COP');`;
        resetVariants();
        assert.notEqual(docker(args, call(oneOrder, [{ ...selected[0], variant_id: null }])).status, 0);
        assert.notEqual(docker(args, call(oneOrder, [{ ...selected[0], variant_id: 'missing' }])).status, 0);
        empty();
        const red = JSON.parse(sql(call(oneOrder, selected)));
        assert.equal(red.items[0].variant_name, 'Red', 'the saved label comes from the catalog');
        assert.equal(sql("SELECT variant_quantities->>'red' FROM stock_reservations;"), '1');
        const version = sql(`SELECT inventory_version FROM products WHERE id='${product}';`);
        assert.equal(JSON.parse(sql(finalize(red.order.id).replace('10000', '9999'))).outcome, 'conflict');
        assert.equal(sql('SELECT status FROM stock_reservations;'), 'reserved', 'rejected approval cannot release valid holds');
        assert.notEqual(docker(args, call({ ...oneOrder, order_number: 'SECOND', idempotency_key: randomUUID() }, selected)).status, 0);
        assert.equal(JSON.parse(sql(finalize(red.order.id))).outcome, 'finalized');
        assert.equal(sql(`SELECT variants->0->>'stock_quantity' FROM products WHERE id='${product}';`), '0');
        assert.equal(sql(`SELECT stock_quantity FROM products WHERE id='${product}';`), '9');
        sql('GRANT SELECT,UPDATE ON public.products TO service_role;');
        const paidVersion = sql(`SELECT inventory_version FROM products WHERE id='${product}';`);
        sql(`SET ROLE service_role; UPDATE public.products SET name='Metadata edit',inventory_version=0 WHERE id='${product}'; RESET ROLE;`);
        assert.equal(sql(`SELECT inventory_version FROM products WHERE id='${product}';`), paidVersion, 'version assignment cannot reset the counter');
        assert.equal(JSON.parse(sql(finalize(red.order.id))).outcome, 'already_finalized');
        assert.equal(sql(`UPDATE products SET variants='${JSON.stringify(variants(1))}',stock_quantity=10
            WHERE id='${product}' AND inventory_version=${version} RETURNING id;`), 'UPDATE 0');
        sql(`SET ROLE service_role; UPDATE products SET variants='${JSON.stringify(variants(0,8))}',stock_quantity=8
            WHERE id='${product}' AND inventory_version=${paidVersion}; RESET ROLE;`);
        assert.equal(sql(`SELECT stock_quantity FROM products WHERE id='${product}';`), '8');
        resetVariants();
        const simultaneous = await Promise.all([concurrent(call(oneOrder, selected)),
            concurrent(call({ ...oneOrder, order_number: 'OTHER', idempotency_key: randomUUID() }, selected))]);
        assert.equal(simultaneous.filter(code => code === 0).length, 1, 'only one order may reserve the last red unit');
        assert.equal(sql('SELECT count(*) FROM orders;'), '1');
        // Expired approval cannot steal a newer active reservation, but replenishment permits recovery.
        resetVariants();
        const expired = JSON.parse(sql(call(oneOrder, selected)));
        sql("UPDATE stock_reservations SET expires_at=now()-interval '1 minute';");
        const newer = JSON.parse(sql(call({ ...oneOrder, order_number: 'NEWER', idempotency_key: randomUUID() }, selected)));
        assert.equal(JSON.parse(sql(finalize(expired.order.id))).outcome, 'inventory_review');
        assert.equal(sql(`SELECT stock_quantity FROM products WHERE id='${product}';`), '10');
        assert.equal(JSON.parse(sql(finalize(newer.order.id, 'NEWER', 'newer-tx'))).outcome, 'finalized');
        sql(`UPDATE products SET variants='${JSON.stringify(variants(1))}',stock_quantity=10 WHERE id='${product}';`);
        assert.equal(JSON.parse(sql(finalize(expired.order.id))).outcome, 'finalized');
        assert.equal(sql(`SELECT stock_quantity FROM products WHERE id='${product}';`), '9');
        // A product-only historical confirmation is not proof that variant inventory was deducted.
        resetVariants();
        const legacy = JSON.parse(sql(call(oneOrder, selected)));
        sql(`UPDATE stock_reservations SET status='confirmed',variant_quantities=NULL;
            UPDATE products SET stock_quantity=9 WHERE id='${product}';`);
        for (let attempt = 0; attempt < 2; attempt++) {
            const review = JSON.parse(sql(finalize(legacy.order.id)));
            assert.equal(review.outcome, 'inventory_review');
            assert.equal(review.reason, 'legacy_variant_inventory_unverified');
            assert.equal(sql(`SELECT variants->0->>'stock_quantity' FROM products WHERE id='${product}';`), '1');
            assert.equal(sql(`SELECT stock_quantity FROM products WHERE id='${product}';`), '9');
        }
        resetVariants();
        const unverified = JSON.parse(sql(call(oneOrder, selected)));
        sql(`UPDATE orders SET payment_status='paid',wompi_transaction_id='variant-tx',inventory_status='unverified';
            UPDATE products SET stock_quantity=9 WHERE id='${product}';`);
        assert.equal(JSON.parse(sql(finalize(unverified.order.id))).reason, 'legacy_variant_inventory_unverified');
        sql(`UPDATE products SET variants='${JSON.stringify(variants(1))}',stock_quantity=10 WHERE id='${product}';`);
        assert.equal(JSON.parse(sql(finalize(unverified.order.id))).reason, 'legacy_variant_inventory_unverified');
        assert.equal(sql(`SELECT stock_quantity FROM products WHERE id='${product}';`), '10', 'replenishment cannot erase legacy accounting uncertainty');
        resetVariants();
        const held = JSON.parse(sql(call(oneOrder, selected)));
        assert.notEqual(docker(args, `UPDATE products SET variants='${JSON.stringify(variants(0))}',stock_quantity=9 WHERE id='${product}';`).status, 0);
        assert.equal(JSON.parse(sql(`SELECT public.confirm_stock_reservation('${held.order.id}');`)).success, false);
        assert.notEqual(docker(args, `SELECT public.decrement_product_stock('${product}',1);`).status, 0);
        assert.equal(sql("SELECT has_function_privilege('service_role','public.create_order_with_stock_product_only(jsonb,jsonb)','EXECUTE');"), 'f');
        assert.equal(sql("SELECT has_function_privilege('service_role','public.finalize_wompi_payment_product_only(uuid,text,text,text,bigint,text)','EXECUTE');"), 'f');
        for (const role of ['anon','authenticated']) {
            assert.notEqual(docker(args, `SET ROLE ${role}; ${call({ ...oneOrder, order_number: 'DENIED', idempotency_key: randomUUID() }, selected)}`).status, 0);
        }
        sql(readFileSync(join(process.cwd(), 'supabase/migrations/20261114213626_single_payment_attempt.sql'), 'utf8'));
        resetVariants();
        const launch = JSON.parse(sql(call(oneOrder, selected)));
        const claim = `SELECT public.claim_wompi_checkout('${launch.order.id}');`;
        const claims = await Promise.all([concurrent(claim), concurrent(claim)]);
        assert.deepEqual(claims, [0, 0]);
        assert.equal(sql('SELECT count(*) FROM public.wompi_checkout_attempts;'), '1');
        assert.equal(JSON.parse(sql(claim)).outcome, 'existing');
        sql('UPDATE public.wompi_checkout_attempts SET issued_at=now()-interval \'2 days\';');
        assert.equal(JSON.parse(sql(claim)).outcome, 'existing', 'elapsed time cannot unlock an issued checkout');
        assert.equal(JSON.parse(sql(finalize(launch.order.id))).outcome, 'finalized');
        const stockAfterPayment = sql(`SELECT variants::text,stock_quantity FROM products WHERE id='${product}';`);
        assert.equal(JSON.parse(sql(finalize(launch.order.id, 'ATOMIC-1', 'second-approved'))).reason, 'duplicate_approved_payment');
        assert.equal(JSON.parse(sql(finalize(launch.order.id, 'ATOMIC-1', 'second-approved'))).reason, 'duplicate_approved_payment');
        assert.equal(sql('SELECT count(*) FROM public.wompi_payment_exceptions;'), '1');
        assert.equal(sql(`SELECT wompi_transaction_id FROM orders WHERE id='${launch.order.id}';`), 'variant-tx');
        assert.equal(sql(`SELECT variants::text,stock_quantity FROM products WHERE id='${product}';`), stockAfterPayment);
        assert.equal(JSON.parse(sql(finalize(launch.order.id))).outcome, 'already_finalized');
        for (const role of ['anon', 'authenticated']) {
            assert.notEqual(docker(args, `SET ROLE ${role}; ${claim}`).status, 0);
            assert.notEqual(docker(args, `SET ROLE ${role}; SELECT * FROM public.wompi_payment_exceptions;`).status, 0);
        }
        sql('TRUNCATE public.wompi_payment_exceptions,public.wompi_checkout_attempts;');
        resetVariants();
        const incomplete = JSON.parse(sql(call(oneOrder, selected)));
        sql('UPDATE stock_reservations SET variant_quantities=\'{}\';');
        assert.equal(JSON.parse(sql(`SELECT public.claim_wompi_checkout('${incomplete.order.id}');`)).outcome, 'reservation_invalid');
        assert.equal(sql('SELECT count(*) FROM public.wompi_checkout_attempts;'), '0');
    } finally { assert.equal(docker(['stop', container]).status, 0); }
});
