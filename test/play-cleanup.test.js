import test, { mock } from 'node:test';
import assert from 'node:assert';
import { beginJob } from '../src/play-job.js';
import { pollFiles, addTorrent } from '../src/play-torrserver.js';

function fakeLampa(torserver = {}) {
  const calls = { drop: [], loadingStop: 0 };
  let cancel = null;
  const mem = {};
  globalThis.window = {
    Lampa: {
      Loading: { start: (c) => { cancel = c; }, stop: () => { calls.loadingStop++; }, setText() {} },
      Storage: { get: (k, d) => (k in mem ? mem[k] : d), set: (k, v) => { mem[k] = v; } },
      Torserver: { files() {}, hash() {}, drop: (h) => calls.drop.push(h), ...torserver },
    },
  };
  return { calls, back: () => cancel() };
}

// Back on the loader while «Играть» waits for the file list: the wait ends
// (resolves null), so run() can finish and roll the picker's progress back.
test('test_back_during_file_wait_ends_the_wait', { timeout: 3000 }, async () => {
  mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  try {
    const f = fakeLampa();
    const job = beginJob('…', () => {});
    const wait = pollFiles('h1', job, 20);
    f.back();
    mock.timers.tick(10);
    assert.strictEqual(await wait, null);
  } finally {
    mock.timers.reset();
  }
});

test('test_run_cap_finish_ends_the_file_wait', { timeout: 3000 }, async () => {
  mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  try {
    fakeLampa();
    const job = beginJob('…', () => {});
    const wait = pollFiles('h1', job, 20);
    job.cancelled = true;
    job.finish();
    assert.strictEqual(await wait, null);
  } finally {
    mock.timers.reset();
  }
});

// A hash that arrives after the 20 s timeout is dropped from TorrServer.
test('test_late_hash_is_dropped', { timeout: 3000 }, async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    let answer = null;
    const f = fakeLampa({ hash: (data, ok) => { answer = ok; } });
    const req = addTorrent({ Title: 'x', MagnetUri: 'magnet:x' }, {});
    mock.timers.tick(20001);
    await assert.rejects(req);
    answer({ hash: 'late' });
    await Promise.resolve();
    assert.deepStrictEqual(f.calls.drop, ['late']);
  } finally {
    mock.timers.reset();
  }
});

test('test_hash_in_time_is_kept', { timeout: 3000 }, async () => {
  const f = fakeLampa({ hash: (data, ok) => ok({ hash: 'ok' }) });
  assert.strictEqual(await addTorrent({ Title: 'x', MagnetUri: 'magnet:x' }, {}), 'ok');
  assert.deepStrictEqual(f.calls.drop, []);
});
