import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

test('the suite runner finds root and nested TypeScript tests without shell expansion', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'mcs-runner-'));
    try {
        mkdirSync(join(cwd, 'tests', 'nested tests'), { recursive: true });
        const fixture = (label: string) =>
            `import { test } from 'node:test'; const name: string = '${label}'; test(name, () => {});`;
        writeFileSync(join(cwd, 'tests', 'root.test.ts'), fixture('root fixture ran'));
        writeFileSync(join(cwd, 'tests', 'nested tests', 'nested.test.ts'), fixture('nested fixture ran'));
        writeFileSync(join(cwd, 'tests', 'not-a-test.ts'), 'throw new Error("must not run");');

        const env = { ...process.env };
        delete env.NODE_TEST_CONTEXT;
        const result = spawnSync(process.execPath, [resolve('scripts/run-tests.cjs')], {
            cwd, env, encoding: 'utf8', timeout: 15_000,
        });
        assert.ifError(result.error);
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /root fixture ran/);
        assert.match(result.stdout, /nested fixture ran/);
    } finally {
        rmSync(cwd, { recursive: true, force: true });
    }
});
