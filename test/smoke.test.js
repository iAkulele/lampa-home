import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('test_build_output_is_iife', () => {
  execSync('npm run build', { cwd: root, stdio: 'pipe' });
  const out = fs.readFileSync(path.join(root, 'lampa-home.js'), 'utf8');
  assert.ok(/^(\(\(\) => \{|\(\(\)=>\{|\(function)/.test(out), 'bundle must start as an IIFE');
  assert.ok(out.includes('lampa-home'), 'bundle must contain plugin name');
});
