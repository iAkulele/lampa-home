import test, { mock } from 'node:test';
import assert from 'node:assert';
import { status } from '../src/downloads-list.js';
import { makeCancel } from '../src/downloads-preload.js';

// A hung progress request must fail in time, or every badge on «Скачанное» freezes.
test('test_status_request_times_out', { timeout: 3000 }, async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const realFetch = globalThis.fetch;
  globalThis.window = { Lampa: { Torserver: { url: () => 'http://ts' }, Storage: { field: () => false, get: (k, d) => d } } };
  globalThis.fetch = (url, opts) => new Promise((_, reject) => {
    if (opts && opts.signal) opts.signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
  try {
    const req = status('h', 0);
    mock.timers.tick(60000);
    await assert.rejects(req);
  } finally {
    globalThis.fetch = realFetch;
    mock.timers.reset();
  }
});

// Back after the old download was deleted from disk: the replacement goes on,
// otherwise the card ends up with neither download.
test('test_back_after_replace_started_is_ignored', () => {
  const calls = [];
  const job = { cancelled: false, committed: true };
  makeCancel(job, () => calls.push('drop'), () => calls.push('finish'))();
  assert.strictEqual(job.cancelled, false);
  assert.deepStrictEqual(calls, []);
});

test('test_back_before_replace_cancels', () => {
  const calls = [];
  const job = { cancelled: false };
  makeCancel(job, () => calls.push('drop'), () => calls.push('finish'))();
  assert.strictEqual(job.cancelled, true);
  assert.deepStrictEqual(calls, ['drop', 'finish']);
});
