// The one «Играть» run in flight and Lampa's loader around it.
import { lampa } from './lampa.js';

let current = null;

// True while «Играть» (or a play from «Скачанное») is starting.
export const isBusy = () => !!current;

// One play attempt at a time (null when one is already running); Back on the
// loader cancels it (onCancel runs first).
// job: {cancelled, timer (file poll), hash, deadline (run cap), loading, pick,
// pause(), restart(text), finish()}.
export function beginJob(text, onCancel) {
  const L = lampa();
  if (current) return null;
  // loading: the loader is shown (paused while the episode picker is open: a
  // second Loading.stop would toggle a stale controller).
  const job = { cancelled: false, timer: null, hash: null, deadline: null, loading: true };
  current = job;
  const cancel = () => {
    job.cancelled = true;
    onCancel(job);
    job.finish();
  };
  job.pause = () => {
    job.loading = false;
    L.Loading.stop();
  };
  // The loader again after a pause (the episode picker).
  job.restart = (t) => {
    job.loading = true;
    L.Loading.start(cancel, t);
  };
  // Still the running job (a cancelled or timed-out one may already be replaced).
  job.isCurrent = () => current === job;
  job.finish = () => {
    // Ends a file wait too (resolves null), so the run gets to its cleanup.
    if (job.stopPoll) job.stopPoll();
    else if (job.timer) clearInterval(job.timer);
    if (job.deadline) clearTimeout(job.deadline);
    if (current === job) current = null;
    if (job.loading) L.Loading.stop();
    job.loading = false;
  };
  L.Loading.start(cancel, text);
  return job;
}
