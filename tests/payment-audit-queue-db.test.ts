import { it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

it('rotates bounded payment audit claims without changing orders or exposing progress', {
    skip: process.env.RUN_DB_TESTS !== '1', timeout: 90_000,
}, async () => {
    const container = `audit-queue-${randomUUID()}`;
    const docker = (args: string[], input?: string) => spawnSync('docker', args, { input, encoding: 'utf8', timeout: 30_000 });
    const args = ['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'];
    function sql(source: string) {
        const r = docker(args, source);
        assert.equal(r.status, 0, r.stderr || String(r.error));
        return r.stdout.trim();
    }
    const claim = (size = 25) => `SELECT id FROM public.claim_wompi_payment_audits(${size}) ORDER BY id;`;
    function concurrent(source: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
            let output = '', error = '';
            child.stdout.on('data', chunk => { output += chunk; });
            child.stderr.on('data', chunk => { error += chunk; });
            child.on('error', reject);
            child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error(error)));
            child.stdin.end(source);
        });
    }
    assert.equal(docker(['run', '--rm', '-d', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine']).status, 0);
    try {
        let ready = false;
        for (let i = 0; i < 100; i++) {
            if (docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']).status === 0) { ready = true; break; }
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
        }
        assert.ok(ready);
        sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
            CREATE TABLE orders(id uuid PRIMARY KEY, order_number varchar(50), total numeric, wompi_transaction_id text,
                payment_status text DEFAULT 'pending', payment_method text DEFAULT 'wompi',
                inventory_status text DEFAULT 'unverified', created_at timestamptz DEFAULT now());
            CREATE TABLE audit_marker (writes integer); INSERT INTO audit_marker VALUES(0);
            CREATE FUNCTION count_order_writes() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN UPDATE audit_marker SET writes=writes+1; RETURN NEW; END $$;
            CREATE TRIGGER count_order_writes AFTER UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION count_order_writes();
            INSERT INTO orders(id,order_number,total,created_at)
                SELECT md5(i::text)::uuid, 'QUEUE-'||i,100,now()-interval '60 days' FROM generate_series(1,30) i;`);
        const name = readdirSync(join(process.cwd(), 'supabase/migrations')).find(file => file.endsWith('_rotate_payment_audit_queue.sql'));
        assert.ok(name);
        sql(readFileSync(join(process.cwd(), 'supabase/migrations', name), 'utf8'));
        const before = sql('SELECT md5(jsonb_agg(to_jsonb(o) ORDER BY id)::text) FROM orders o;');
        const first = sql(claim()).split('\n');
        assert.equal(first.length, 25, 'old pending orders remain eligible beyond 30 days');
        const second = sql(claim()).split('\n');
        assert.equal(second.length, 5, 'abandoned first batch must not starve the rest');
        assert.equal(new Set([...first, ...second]).size, 30);
        assert.equal(sql(claim()), '', 'claim lease prevents immediate repeated provider lookups');
        assert.equal(sql('SELECT md5(jsonb_agg(to_jsonb(o) ORDER BY id)::text) FROM orders o;'), before);
        assert.equal(sql('SELECT writes FROM audit_marker;'), '0', 'queue progress must not fire business audit triggers');
        sql('TRUNCATE payment_audit_progress;');
        const lockedId = sql('SELECT id FROM orders ORDER BY created_at,id LIMIT 1;');
        const holder = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
        let output = '';
        const readyLock = new Promise<void>((resolve, reject) => {
            holder.stdout.on('data', chunk => { output += chunk; if (output.includes('ORDER_LOCKED')) resolve(); });
            holder.on('error', reject);
            holder.on('close', () => { if (!output.includes('ORDER_LOCKED')) reject(new Error('Lock holder exited early')); });
        });
        const holderDone = new Promise<void>((resolve, reject) => {
            holder.on('close', code => code === 0 ? resolve() : reject(new Error('Lock holder failed')));
            holder.on('error', reject);
        });
        holder.stdin.write(`BEGIN; SELECT id FROM orders WHERE id='${lockedId}' FOR UPDATE;\n\\echo ORDER_LOCKED\n`);
        try {
            await readyLock;
            const skipped = sql(claim()).split('\n');
            assert.equal(skipped.length, 25);
            assert.ok(!skipped.includes(lockedId), 'claim must skip an actively locked order without blocking');
        } finally {
            holder.stdin.end('COMMIT;\n');
            await holderDone;
        }
        sql('TRUNCATE payment_audit_progress;');
        sql(claim()); sql(claim());
        sql("UPDATE payment_audit_progress SET last_claimed_at=now()-interval '1 day';");
        const [a, b] = await Promise.all([concurrent(claim()), concurrent(claim())]);
        const ids = [a, b].flatMap(value => value ? value.split('\n') : []);
        assert.ok(ids.length >= 25 && ids.length <= 30);
        assert.equal(new Set(ids).size, ids.length, 'overlapping claims must have disjoint order IDs');
        // A stale statement snapshot can lose candidates to the conflict recheck.
        const remaining = sql(claim());
        const allIds = [...ids, ...(remaining ? remaining.split('\n') : [])];
        assert.equal(allIds.length, 30, 'the next claim must recover every unclaimed order');
        assert.equal(new Set(allIds).size, 30, 'recovery must not reclaim leased orders');
        assert.equal(sql(claim()), '', 'all recovered claims retain their leases');
        const progressBefore = sql('SELECT md5(jsonb_agg(to_jsonb(p) ORDER BY order_id)::text) FROM payment_audit_progress p;');
        for (const size of [0, 26]) {
            assert.notEqual(docker(args, claim(size)).status, 0);
            assert.equal(sql('SELECT md5(jsonb_agg(to_jsonb(p) ORDER BY order_id)::text) FROM payment_audit_progress p;'), progressBefore);
        }
        assert.notEqual(docker(args, 'SELECT * FROM public.claim_wompi_payment_audits(NULL);').status, 0);
        assert.equal(sql('SELECT md5(jsonb_agg(to_jsonb(p) ORDER BY order_id)::text) FROM payment_audit_progress p;'), progressBefore);
        for (const role of ['anon', 'authenticated']) {
            assert.notEqual(docker(args, `SET ROLE ${role}; ${claim()}`).status, 0);
            assert.notEqual(docker(args, `SET ROLE ${role}; SELECT * FROM payment_audit_progress;`).status, 0);
        }
        sql('TRUNCATE payment_audit_progress;');
        sql("UPDATE orders SET payment_status='refunded';");
        assert.equal(sql(claim()), '');
        sql("UPDATE orders SET payment_status='paid', inventory_status='review_required';");
        assert.equal(sql('SELECT count(*) FROM public.claim_wompi_payment_audits(1);'), '1');
        sql('TRUNCATE payment_audit_progress;');
        sql("UPDATE orders SET inventory_status='confirmed';");
        assert.equal(sql(claim()), '', 'paid and confirmed orders must not enter the queue');
        sql('UPDATE orders SET payment_status=NULL;');
        assert.equal(sql('SELECT count(*) FROM public.claim_wompi_payment_audits(2);'), '2');
        sql('TRUNCATE payment_audit_progress;');
        sql("UPDATE orders SET payment_status='failed', payment_method='cash';");
        assert.equal(sql(claim()), '');
        sql("UPDATE orders SET payment_method='wompi',created_at=now();");
        assert.equal(sql(claim()), '', 'new checkouts are not swept immediately');
        sql('UPDATE orders SET created_at=NULL;');
        assert.equal(sql(claim()), '', 'unknown creation dates cannot establish the minimum age');
        sql("UPDATE orders SET created_at=now()-interval '1 hour';");
        assert.equal(sql(`SET ROLE service_role; SELECT count(*) FROM public.claim_wompi_payment_audits(1);`).split('\n').at(-1), '1');
    } finally {
        assert.equal(docker(['stop', container]).status, 0);
    }
});
