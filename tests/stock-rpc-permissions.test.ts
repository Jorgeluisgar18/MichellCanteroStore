import { it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// Opt in explicitly: this test starts an isolated local PostgreSQL container, never a hosted database.
it('restricts stock RPC execution without changing backend access', {
    skip: process.env.RUN_DB_TESTS !== '1', timeout: 90_000,
}, () => {
    const container = `stock-acl-${randomUUID()}`;
    function docker(args: string[], input?: string) {
        return spawnSync('docker', args, { input, encoding: 'utf8', timeout: 30_000 });
    }
    function sql(source: string) {
        const result = docker(['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], source);
        assert.equal(result.status, 0, result.stderr || String(result.error));
        return result.stdout.trim();
    }
    const started = docker(['run', '--rm', '-d', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine']);
    assert.equal(started.status, 0, started.stderr);
    try {
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
            if (docker(['exec', container, 'pg_isready', '-U', 'postgres']).status === 0) {
                ready = true;
                break;
            }
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
        }
        assert.ok(ready, 'local PostgreSQL must be ready');
        sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
            CREATE TABLE public.acl_marker (calls integer NOT NULL);
            INSERT INTO public.acl_marker VALUES (0);`);
        const signatures = [
            ['reserve_product_stock', 'uuid, uuid, integer, integer', "NULL::uuid, NULL::uuid, 1, 15"],
            ['confirm_stock_reservation', 'uuid', 'NULL::uuid'],
            ['release_stock_reservation', 'uuid', 'NULL::uuid'],
            ['cleanup_expired_reservations', '', ''],
        ];
        // Exact production signatures; bodies deliberately isolate permission checks from business logic.
        for (const [name, args] of signatures) {
            sql(`CREATE FUNCTION public.${name}(${args}) RETURNS integer
                LANGUAGE sql SECURITY DEFINER SET search_path = public
                AS $$ UPDATE public.acl_marker SET calls = calls + 1 RETURNING calls $$;`);
        }
        for (const [name, args] of signatures) {
            assert.equal(sql(`SELECT has_function_privilege('anon', 'public.${name}(${args})', 'EXECUTE');`), 't');
        }
        const migrations = readdirSync(join(process.cwd(), 'supabase/migrations'))
            .filter(name => name.endsWith('_restrict_stock_rpc_execution.sql'));
        assert.equal(migrations.length, 1, 'one append-only stock ACL migration must exist');
        const migrationName = migrations[0];
        assert.ok(migrationName);
        const migration = readFileSync(join(process.cwd(), 'supabase/migrations', migrationName), 'utf8');
        sql(migration);
        sql(migration); // Reapplying grants must be harmless.
        for (const [name, args, values] of signatures) {
            for (const role of ['anon', 'authenticated']) {
                assert.equal(sql(`SELECT has_function_privilege('${role}', 'public.${name}(${args})', 'EXECUTE');`), 'f');
                const result = docker(['exec', '-i', container, 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'],
                    `SET ROLE ${role}; SELECT public.${name}(${values});`);
                assert.notEqual(result.status, 0);
                assert.match(result.stderr, /permission denied for function/);
            }
        }
        assert.equal(sql('SELECT calls FROM public.acl_marker;'), '0', 'rejected calls must not mutate data');
        for (const [name, args, values] of signatures) {
            assert.equal(sql(`SELECT has_function_privilege('service_role', 'public.${name}(${args})', 'EXECUTE');`), 't');
            assert.match(sql(`SET ROLE service_role; SELECT public.${name}(${values}); RESET ROLE;`), /[1-4]/);
        }
        assert.equal(sql('SELECT calls FROM public.acl_marker;'), '4');
    } finally {
        const stopped = docker(['stop', container]);
        assert.equal(stopped.status, 0, stopped.stderr);
    }
});
