// Tiny concurrency limiter: run(job) starts job() when fewer than `limit` are in flight.
export function createQueue(limit) {
  let active = 0;
  const waiting = [];
  const next = () => {
    if (active >= limit || !waiting.length) return;
    active++;
    const { job, resolve, reject } = waiting.shift();
    Promise.resolve()
      .then(job)
      .then(resolve, reject)
      .finally(() => {
        active--;
        next();
      });
  };
  return (job) =>
    new Promise((resolve, reject) => {
      waiting.push({ job, resolve, reject });
      next();
    });
}
