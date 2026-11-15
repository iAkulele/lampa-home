// Errors and timers shared by the «Играть» modules.

// fatal: TorrServer itself is missing or unreachable; any other PlayError about one
// release (no hash in time, no file list) only makes «Играть» try the next one.
export class PlayError extends Error {
  constructor(msg, fatal = false) {
    super(msg);
    this.fatal = fatal;
  }
}
export const fail = (msg, fatal) => new PlayError(msg, fatal);

// Rejects with a (non-fatal) PlayError(msg) when promise has not settled in ms.
export function withTimeout(promise, ms, msg) {
  let timer;
  const t = new Promise((_, reject) => {
    timer = setTimeout(() => reject(fail(msg)), ms);
  });
  return Promise.race([promise, t]).finally(() => clearTimeout(timer));
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
