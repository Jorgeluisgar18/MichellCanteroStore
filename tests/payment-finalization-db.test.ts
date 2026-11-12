import { it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

it('atomically finalizes verified payments and recovers expired inventory', {
    skip: process.env.RUN_DB_TESTS !== '1', timeout: 120_000,
}, async () => {
    const container = `payment-db-${randomUUID()}`;
    const docker = (args: string[], input?: string) => spawnSync('docker', args, { input, encoding: 'utf8', timeout: 30_000 });
    const queryArgs = ['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'];
    function sql(source: string) {
        const result = docker(queryArgs, source);
        assert.equal(result.status, 0, result.stderr || String(result.error));
        return result.stdout.trim();
    }
    function concurrent(source: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = spawn('docker', queryArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
            let output = '', error = '';
            child.stdout.on('data', chunk => { output += chunk; });
            child.stderr.on('data', chunk => { error += chunk; });
            child.on('error', reject);
            child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
            child.stdin.end(source);
        });
    }
    const order = '00000000-0000-0000-0000-000000000001';
    const other = '00000000-0000-0000-0000-000000000002';
    const product = '00000000-0000-0000-0000-000000000010';
    const second = '00000000-0000-0000-0000-000000000011';
    const call = (status = 'APPROVED', id = 'txn-1') =>
        `SELECT public.finalize_wompi_payment('${order}', '${id}', '${status}', 'TEST-1', 10000, 'COP');`;
    function reset(stock = 5, quantity = 2) {
        sql(`TRUNCATE stock_reservations, order_items, orders, products;
            INSERT INTO products(id, stock_quantity) VALUES ('${product}', ${stock});
            INSERT INTO orders(id, order_number, total) VALUES ('${order}', 'TEST-1', 100), ('${other}', 'TEST-2', 100);
            INSERT INTO order_items(order_id, product_id, quantity) VALUES ('${order}', '${product}', ${quantity});
            INSERT INTO stock_reservations(product_id, order_id, quantity, expires_at)
            VALUES ('${product}', '${order}', ${quantity}, now() - interval '1 hour');`);
    }
    assert.equal(docker(['run', '--rm', '-d', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine']).status, 0);
    try {
        let ready = false;
        for (let i = 0; i < 100; i++) {
            if (docker(['exec', container, 'pg_isready', '-U', 'postgres']).status === 0) { ready = true; break; }
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
        }
        assert.ok(ready);
        // Minimal schema fixture matching the columns used by the real migration, not substitute RPC bodies.
        sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
            CREATE TABLE products(id uuid PRIMARY KEY, stock_quantity integer, in_stock boolean DEFAULT true, updated_at timestamptz DEFAULT now());
            CREATE TABLE orders(id uuid PRIMARY KEY, order_number text NOT NULL, total numeric NOT NULL,
                status text DEFAULT 'pending', payment_status text DEFAULT 'pending',
                wompi_transaction_id text, payment_id text, updated_at timestamptz DEFAULT now());
            CREATE TABLE order_items(order_id uuid REFERENCES orders, product_id uuid REFERENCES products, quantity integer NOT NULL);
            CREATE TABLE stock_reservations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid REFERENCES products,
                order_id uuid REFERENCES orders, quantity integer NOT NULL, status text DEFAULT 'reserved',
                expires_at timestamptz NOT NULL, updated_at timestamptz DEFAULT now());`);
        const file = readdirSync(join(process.cwd(), 'supabase/migrations')).find(name => name.endsWith('_atomic_wompi_finalization.sql'));
        assert.ok(file, 'atomic finalization migration must exist');
        sql(readFileSync(join(process.cwd(), 'supabase/migrations', file), 'utf8'));
        reset();
        assert.equal(JSON.parse(sql(call())).outcome, 'finalized');
        assert.equal(sql('SELECT stock_quantity FROM products;'), '3');
        assert.equal(sql('SELECT payment_status || \'/\' || inventory_status FROM orders WHERE order_number=\'TEST-1\';'), 'paid/confirmed');
        assert.equal(JSON.parse(sql(call())).outcome, 'already_finalized');
        assert.equal(sql('SELECT stock_quantity FROM products;'), '3');
        // Released holds are also recoverable without requiring a browser or manual operation.
        reset();
        sql(`UPDATE orders SET payment_status='failed', status='cancelled'; UPDATE stock_reservations SET status='released';`);
        assert.equal(JSON.parse(sql(call())).outcome, 'finalized');
        assert.equal(sql(`SELECT status FROM orders WHERE id='${order}';`), 'paid');
        // Do not steal another order's active reservation or partially decrement a multi-item order.
        reset(3);
        sql(`INSERT INTO stock_reservations(product_id,order_id,quantity,expires_at) VALUES ('${product}','${other}',2,now()+interval '1 hour');`);
        assert.equal(JSON.parse(sql(call())).outcome, 'inventory_review');
        assert.equal(sql('SELECT stock_quantity FROM products;'), '3');
        assert.equal(sql(`SELECT payment_status || '/' || inventory_status FROM orders WHERE id='${order}';`), 'paid/review_required');
        const shipping = docker(queryArgs, `UPDATE orders SET status='shipped' WHERE id='${order}';`);
        assert.notEqual(shipping.status, 0);
        assert.match(shipping.stderr, /inventory/i);
        sql('UPDATE products SET stock_quantity=5;');
        assert.equal(JSON.parse(sql(call())).outcome, 'finalized');
        assert.equal(sql('SELECT stock_quantity FROM products;'), '3');
        reset();
        sql(`INSERT INTO products(id,stock_quantity) VALUES ('${second}',0);
            INSERT INTO order_items VALUES ('${order}','${second}',1);`);
        assert.equal(JSON.parse(sql(call())).outcome, 'inventory_review');
        assert.equal(sql(`SELECT stock_quantity FROM products WHERE id='${product}';`), '5');
        // Transaction rollback must undo inventory if the final order write fails.
        reset();
        sql(`CREATE FUNCTION reject_paid() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
            IF NEW.payment_status='paid' THEN RAISE EXCEPTION 'synthetic order failure'; END IF; RETURN NEW; END $$;
            CREATE TRIGGER reject_paid BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION reject_paid();`);
        assert.notEqual(docker(queryArgs, call()).status, 0);
        assert.equal(sql('SELECT stock_quantity FROM products;'), '5');
        assert.equal(sql(`SELECT payment_status FROM orders WHERE id='${order}';`), 'pending');
        sql('DROP TRIGGER reject_paid ON orders;');
        for (const statuses of [['APPROVED', 'DECLINED'], ['DECLINED', 'APPROVED'], ['APPROVED', 'APPROVED']]) {
            reset();
            await Promise.all(statuses.map(status => concurrent(call(status))));
            assert.equal(sql(`SELECT payment_status FROM orders WHERE id='${order}';`), 'paid');
            assert.equal(sql('SELECT stock_quantity FROM products;'), '3');
        }
        reset();
        sql(`INSERT INTO order_items VALUES ('${order}','${product}',1);
            INSERT INTO stock_reservations(product_id,order_id,quantity,status,expires_at)
            VALUES ('${product}','${order}',2,'released',now()-interval '2 hours');`);
        assert.equal(JSON.parse(sql(call())).outcome, 'finalized');
        assert.equal(sql('SELECT stock_quantity FROM products;'), '2', 'aggregate items, not historical reservation attempts');
        reset();
        sql(`UPDATE stock_reservations SET status='confirmed'; UPDATE products SET stock_quantity=3;`);
        assert.equal(JSON.parse(sql(call())).outcome, 'finalized');
        assert.equal(sql('SELECT stock_quantity FROM products;'), '3', 'complete confirmation must not deduct twice');
        reset();
        sql(`UPDATE stock_reservations SET status='confirmed',quantity=1; UPDATE products SET stock_quantity=4;`);
        assert.equal(JSON.parse(sql(call())).outcome, 'inventory_review');
        assert.equal(sql('SELECT stock_quantity FROM products;'), '4', 'partial legacy deductions require explicit accounting');
        reset();
        sql('UPDATE order_items SET product_id=NULL;');
        assert.equal(JSON.parse(sql(call())).outcome, 'inventory_review');
        assert.equal(sql('SELECT stock_quantity FROM products;'), '5');
        reset();
        sql('UPDATE products SET stock_quantity=NULL;');
        assert.equal(JSON.parse(sql(call())).outcome, 'inventory_review');
        assert.equal(sql('SELECT stock_quantity IS NULL FROM products;'), 't');
        reset(3);
        sql(`INSERT INTO order_items VALUES ('${other}','${product}',2);`);
        await Promise.all([concurrent(call()), concurrent(call().replace(order, other).replace('TEST-1', 'TEST-2'))]);
        assert.equal(sql("SELECT count(*) FROM orders WHERE inventory_status='confirmed';"), '1');
        assert.equal(sql('SELECT stock_quantity FROM products;'), '1');
        reset();
        await Promise.all([concurrent(call()), concurrent("UPDATE stock_reservations SET status='released' WHERE status='reserved' AND expires_at < now();")]);
        assert.equal(sql('SELECT stock_quantity FROM products;'), '3');
        assert.equal(sql("SELECT count(*) FROM stock_reservations WHERE status='confirmed';"), '1');
        reset();
        sql(`UPDATE orders SET payment_status='refunded' WHERE id='${order}';`);
        assert.equal(JSON.parse(sql(call())).outcome, 'conflict');
        assert.equal(sql('SELECT stock_quantity FROM products;'), '5');
        reset();
        sql(`UPDATE orders SET payment_status='paid', wompi_transaction_id='txn-1' WHERE id='${order}';`);
        for (let attempt = 0; attempt < 3; attempt++) {
            const legacy = JSON.parse(sql(call()));
            assert.equal(legacy.outcome, 'inventory_review');
            assert.equal(legacy.reason, 'legacy_payment_inventory_unverified');
            assert.equal(sql('SELECT stock_quantity FROM products;'), '5', 'retries cannot erase historical accounting uncertainty');
            assert.equal(legacy.changed, attempt === 0);
        }
        reset();
        sql(`UPDATE orders SET status='shipped' WHERE id='${order}';`);
        assert.equal(JSON.parse(sql(call())).outcome, 'finalized');
        assert.equal(sql(`SELECT status FROM orders WHERE id='${order}';`), 'shipped');
        reset();
        sql(call());
        for (const role of ['anon', 'authenticated']) {
            assert.notEqual(docker(queryArgs, `SET ROLE ${role}; ${call()}`).status, 0);
        }
        assert.equal(JSON.parse(sql(`SET ROLE service_role; ${call()}` ).split('\n').at(-1)!).outcome, 'already_finalized');
        assert.equal(JSON.parse(sql(call('APPROVED', 'different-payment'))).outcome, 'conflict');
        reset();
        assert.equal(JSON.parse(sql(call().replace('10000', '9999'))).outcome, 'conflict');
        assert.equal(sql('SELECT stock_quantity FROM products;'), '5');
    } finally {
        assert.equal(docker(['stop', container]).status, 0);
    }
});
