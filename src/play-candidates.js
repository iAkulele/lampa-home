// Which releases «Играть» tries, and the loop that tries them one by one.
import { PlayError } from './play-error.js';

// Releases «Играть» tries before giving up on the episode.
const MAX_CANDIDATES = 3;

// Releases to try, in selectTorrent's order (best score first; for tv/anime a
// title range that provably holds the episode already scores higher): rejected
// ones skipped, the same link only once, at most `max`.
export function nextCandidates(scored, max = MAX_CANDIDATES) {
  const out = [];
  const seen = new Set();
  for (const s of scored || []) {
    if (out.length >= max) break;
    if (!s || s.rejected || !s.result) continue;
    const link = s.result.MagnetUri || s.result.Link || s.result.Title;
    if (link && seen.has(link)) continue;
    if (link) seen.add(link);
    out.push(s.result);
  }
  return out;
}

// Ongoing shows: the best pack may stop one episode short, or the episode sits in
// another release; a release may also never deliver its files. Tries each
// candidate with attempt(cand, i) -> 'played' | 'cancelled' | 'nofile' | 'nofile-prev'.
// A non-fatal PlayError is a miss like 'nofile'; after every miss onMiss() runs.
// Fatal errors (TorrServer missing/unreachable) and foreign errors are rethrown.
// Returns 'played', 'cancelled', 'nofile-prev' (a release held the episode before) or 'nofile'.
export async function tryCandidates(candidates, attempt, { cancelled = () => false, onMiss = () => {} } = {}) {
  let prevSeen = false;
  for (let i = 0; i < (candidates || []).length; i++) {
    let outcome;
    try {
      outcome = await attempt(candidates[i], i);
    } catch (err) {
      if (cancelled() || !(err instanceof PlayError) || err.fatal) throw err;
      outcome = 'nofile';
    }
    if (outcome === 'played' || outcome === 'cancelled') return outcome;
    if (cancelled()) return 'cancelled';
    if (outcome === 'nofile-prev') prevSeen = true;
    onMiss();
  }
  return prevSeen ? 'nofile-prev' : 'nofile';
}
