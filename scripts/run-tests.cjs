const { spawnSync } = require('node:child_process');
const { readdirSync } = require('node:fs');
const { join } = require('node:path');

function findTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findTests(path);
    return entry.isFile() && entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

const files = findTests('tests').sort();
if (files.length === 0) {
  console.error('No TypeScript tests found in tests/.');
  process.exitCode = 1;
} else {
  const result = spawnSync(process.execPath, [
    require.resolve('tsx/cli'), '--test', ...files, ...process.argv.slice(2),
  ], { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
}
