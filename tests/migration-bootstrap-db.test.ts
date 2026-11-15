import { it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

it('distinguishes broken migrations-only replay from explicit legacy prerequisite bootstrap',
    { skip: process.env.RUN_DB_TESTS !== '1', timeout: 120_000 }, () => {
        const container = `migration-bootstrap-${randomUUID()}`;
        const docker = (args: string[], input?: string) => spawnSync('docker', args, { input, encoding: 'utf8', timeout: 30_000 });
        const sql = (database: string, source: string) => docker(['exec', '-i', container, 'psql', '-U', 'postgres',
            '-d', database, '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-At'], source);
        const success = (database: string, source: string) => {
            const result = sql(database, source);
            assert.equal(result.status, 0, result.stderr || String(result.error));
        };
        const directory = join(process.cwd(), 'supabase/migrations');
        const files = readdirSync(directory).filter(name => /^\d{14}_.+\.sql$/.test(name)).sort();
        const hashes = () => files.map(name => createHash('sha256').update(readFileSync(join(directory, name))).digest('hex'));
        const before = hashes();
        const boundary = '20260129192037_add_foreign_key_indexes_corrected.sql';
        assert.ok(files.includes(boundary));
        const started = docker(['run', '--pull=never', '--rm', '-d', '--network=none', '--name', container,
            '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine']);
        assert.equal(started.status, 0, started.stderr || 'Disposable PostgreSQL container could not start');
        try {
            let ready = false;
            for (let i = 0; i < 60; i++) {
                if (docker(['exec', container, 'pg_isready', '-U', 'postgres']).status === 0) { ready = true; break; }
                Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
            }
            assert.ok(ready);
            success('postgres', 'CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
            const platform = readFileSync(join(process.cwd(), 'tests/fixtures/migration-bootstrap/platform.sql'), 'utf8');
            for (const mode of ['migrations_only', 'explicit_prerequisite']) {
                success('postgres', `CREATE DATABASE ${mode};`);
                success(mode, platform);
                let completed = 0;
                for (const name of files) {
                    if (mode === 'explicit_prerequisite' && name === boundary) {
                        success(mode, readFileSync(join(process.cwd(), 'supabase/audit_log.sql'), 'utf8'));
                    }
                    const result = sql(mode, readFileSync(join(directory, name), 'utf8'));
                    if (result.status !== 0) {
                        assert.equal(mode, 'migrations_only', `Unexpected prerequisite-path failure: ${name}`);
                        assert.equal(name, boundary);
                        assert.match(result.stderr, /42P01:.*relation "public\.audit_log" does not exist/);
                        break;
                    }
                    completed++;
                }
                assert.equal(completed, mode === 'migrations_only' ? files.indexOf(boundary) : files.length);
                if (mode === 'explicit_prerequisite') {
                    const triggers = sql(mode, "SELECT count(*) FROM pg_trigger WHERE tgname IN ('profile_audit_trigger','order_audit_trigger') AND NOT tgisinternal;");
                    assert.equal(triggers.status, 0);
                    assert.equal(triggers.stdout.trim(), '2', 'bootstrap must retain real audit triggers, not only a placeholder table');
                }
            }
            assert.deepEqual(hashes(), before, 'replay must not rewrite historical migrations');
        } finally { assert.equal(docker(['stop', container]).status, 0); }
    });
