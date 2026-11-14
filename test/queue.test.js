import test from 'node:test';
import assert from 'node:assert';
import { createQueue } from '../src/queue.js';

test('test_queue_limits_concurrency', async () => {
  const run = createQueue(6);
  let inFlight = 0;
  let peak = 0;
  const jobs = Array.from({ length: 20 }, (_, i) =>
    run(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return i;
    }),
  );
  const out = await Promise.all(jobs);
  assert.strictEqual(peak, 6);
  assert.deepStrictEqual(out, Array.from({ length: 20 }, (_, i) => i));
});
