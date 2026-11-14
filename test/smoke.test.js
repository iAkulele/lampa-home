const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const root = path.join(__dirname, '..');

test('test_build_output_is_iife', () => {
  execSync('npm run build', { cwd: root, stdio: 'pipe' });
  const out = fs.readFileSync(path.join(root, 'lampa-home.js'), 'utf8');
  assert.ok(/^(\(\(\) => \{|\(\(\)=>\{|\(function)/.test(out), 'bundle must start as an IIFE');
  assert.ok(out.includes('lampa-home'), 'bundle must contain plugin name');
});
