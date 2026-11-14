// Startup toasts: a watched anime got a new episode.
import { lampa, store, favoriteGet, storageField } from './lampa.js';
import { LIMITS } from './config.js';
import { detectKind } from './play.js';
import { tvStatus } from './tmdb.js';
import { createQueue } from './queue.js';

const TOAST_MS = 5000;
const START_DELAY_MS = 3000;
const IN_FLIGHT = 6;

// items: [{card, status}]; new only if airing, seen before and aired grew.
export function diffNewEpisodes(items, seenGetter) {
  const out = [];
  for (const { card, status } of items) {
    if (!status || !status.airing) continue;
    const seen = seenGetter(card.id);
    if (seen != null && status.aired > seen) out.push({ id: card.id, aired: status.aired, card });
  }
  return out;
}

export function toastLines(newItems) {
  const lines = newItems
    .slice(0, LIMITS.maxToasts)
    .map((n) => `Вышла ${n.aired} серия: ${n.card.name || n.card.original_name || ''}`);
  if (newItems.length > LIMITS.maxToasts) lines.push(`и ещё ${newItems.length - LIMITS.maxToasts}`);
  return lines;
}

function candidates() {
  const byId = new Map();
  for (const type of ['history', 'book']) {
    let list = [];
    try { list = favoriteGet({ type }); } catch (e) { list = []; }
    for (const card of list || []) {
      if (card && card.id != null && !byId.has(card.id) && detectKind(card) === 'anime') byId.set(card.id, card);
    }
  }
  return [...byId.values()];
}

export async function checkNewEpisodes() {
  const run = createQueue(IN_FLIGHT);
  const items = await Promise.all(
    candidates().map((card) => run(() => tvStatus(card.id)).then((status) => ({ card, status }), () => ({ card, status: null }))),
  );
  const fresh = diffNewEpisodes(items, (id) => store.seen.get(id));
  for (const { card, status } of items) if (status) store.seen.set(card.id, status.aired);
  return fresh;
}

async function check() {
  try {
    if (storageField('lh_notify') === false) return;
    if (!store.notify.due()) return;
    const fresh = await checkNewEpisodes();
    store.notify.mark();
    for (const line of toastLines(fresh)) lampa().Noty.show(line, { time: TOAST_MS });
  } catch (e) {
    console.log('lampa-home notify', e);
  }
}

export function start() {
  try { setTimeout(check, START_DELAY_MS); } catch (e) { /* never throw */ }
}
