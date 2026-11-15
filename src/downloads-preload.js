// «Скачать заранее»: sends a release to TorrServer and asks it to preload the whole
// file into its disk cache; «Начать закачку» kicks off one that was only marked.
import { lampa, store } from './lampa.js';
import { selectTorrent } from './torrent-select.js';
import { pickFile, titleHasSeason, inferTracker } from './play-pick.js';
import { findReleases, openNativeList, listParams } from './play-search.js';
import { fileInfos } from './play-torrserver.js';
import { resolveTarget, asksEpisode, chooseEpisode } from './play-target.js';
import { isBusy } from './play-job.js';
import { MSG } from './downloads-messages.js';
import { cardSnapshot, replacePlan, entryKey, findExisting, cacheEntry, episodeMeta } from './downloads-entries.js';
import {
  DlError, fail, tsBase, tsTorrents, serverFields, markPreload, firePreload, waitFiles, tsRem, helperDelete, deviceName,
} from './downloads-api.js';
import { listDownloads, cachedDownloads } from './downloads-list.js';

let busy = false;

// A DlError's own text; anything else is unexpected and logged.
function showError(err) {
  if (!(err instanceof DlError)) console.error('lampa-home preload', err);
  lampa().Noty.show(err instanceof DlError ? err.message : MSG.torrserver);
}

// The file of the episode in a release's file list (null when it is not there).
const fileFor = (files, ctx, releaseTitle, movie) =>
  pickFile(files, { ...ctx, titleHasSeason: titleHasSeason(releaseTitle) }, fileInfos(files, movie));

export async function preload(card) {
  const L = lampa();
  if (!card || busy || isBusy()) return;
  busy = true;
  // hash: added to TorrServer by us; kicked: the preload started (it is ours to keep).
  const job = { cancelled: false, hash: null, kicked: false };
  let before = []; // the downloads before this one was added
  // A torrent we added but never started preloading is removed again, unless it
  // is the one an existing download already uses.
  const dropAdded = () => {
    if (!job.hash || job.kicked) return;
    if (before.some((e) => e.hash === job.hash)) return;
    if (store.preload.all().some((e) => e.hash === job.hash)) return;
    tsRem(job.hash);
  };
  let loading = true;
  const finish = () => {
    busy = false;
    if (loading) L.Loading.stop();
    loading = false;
  };
  const cancel = () => {
    job.cancelled = true;
    dropAdded();
    finish();
  };
  L.Loading.start(cancel, MSG.search);
  try {
    tsBase();
    const target = await resolveTarget(card);
    const { movie } = target;
    let { ctx } = target;
    if (job.cancelled) return;
    // «Скачать заранее» asks which episode to download, like «Играть».
    if (asksEpisode(ctx)) {
      loading = false;
      L.Loading.stop();
      const picked = await chooseEpisode(card, target);
      if (job.cancelled) return;
      if (!picked || picked === 'list') {
        job.cancelled = true;
        finish();
        if (picked === 'list') openNativeList(listParams(movie, ctx));
        return;
      }
      ctx = picked;
      loading = true;
      L.Loading.start(cancel, MSG.search);
    }
    const found = await findReleases(movie, ctx, job);
    if (job.cancelled) return;
    ctx = inferTracker(ctx, found.results, found.names);
    const { chosen } = selectTorrent(found.results, { ...ctx, names: found.names });
    if (!chosen) throw fail(MSG.none);

    L.Loading.setText(MSG.server);
    // Listed before `add`: afterwards the new torrent itself would be in the list.
    before = await listDownloads().catch(() => cachedDownloads());
    if (job.cancelled) return;
    const snapshot = cardSnapshot(movie);
    const title = String(chosen.Title).replace('??', '?');
    const meta = { ...episodeMeta(ctx), added: Date.now(), by: deviceName() };
    const fields = {
      title: '[LAMPA] ' + title,
      poster: movie.poster_path ? L.Api.img(movie.poster_path) : '',
      category: ctx.kind === 'movie' ? 'movie' : 'tv',
    };
    // Added unmarked: a torrent left behind by a crash before the kick is not a download.
    const added = await tsTorrents({
      action: 'add', link: chosen.MagnetUri || chosen.Link, ...fields,
      data: JSON.stringify({ lampa: true, movie: snapshot }), save_to_db: true,
    });
    const hash = added && added.hash;
    if (!hash) throw fail(MSG.torrserver);
    job.hash = hash;
    if (job.cancelled) return dropAdded();

    L.Loading.setText(MSG.files);
    const files = await waitFiles(hash, job);
    if (job.cancelled || !files) return;
    const file = fileFor(files, ctx, chosen.Title, movie);
    if (!file) throw fail(MSG.noFile);

    const key = entryKey(movie);
    const existing = findExisting(before, key, hash);
    let replaced = false;
    if (replacePlan(existing, hash) === 'replace') {
      L.Loading.setText(MSG.removing);
      try {
        await helperDelete(existing.hash);
      } catch (e) {
        throw fail(MSG.replaceFailed);
      }
      store.preload.remove(key);
      replaced = true;
    }
    if (job.cancelled) return;

    job.kicked = true;
    firePreload(hash, file.id);
    // Marked only now, with the file index: from here on every device lists it.
    // (`add` never changes the data of a torrent TorrServer already has; `set` does.)
    // If `set` fails, the local copy below is marked on the server by the next list.
    meta.index = file.id;
    await markPreload(hash, fields, snapshot, meta);
    store.preload.set(key, cacheEntry({ ...meta, hash, title: chosen.Title, size: file.length, card: snapshot }));
    finish();
    L.Noty.show(replaced ? `${MSG.replaced}. ${MSG.started}` : MSG.started);
  } catch (err) {
    if (job.cancelled) return;
    dropAdded();
    finish();
    showError(err);
  }
}

// «Начать закачку» for a download that was marked but never kicked off: picks the
// file, starts the preload and saves the index. true on success.
export async function startPreload(entry) {
  const L = lampa();
  L.Loading.start(() => L.Loading.stop(), MSG.files);
  try {
    const json = await tsTorrents({ action: 'get', hash: entry.hash });
    const files = (json && json.file_stats) || [];
    if (!files.length) throw fail(MSG.noFiles);
    const ctx = episodeMeta(entry);
    const file = fileFor(files, ctx, entry.title || '', entry.card);
    if (!file) throw fail(MSG.noFile);
    firePreload(entry.hash, file.id);
    const meta = { ...ctx, index: file.id, added: entry.added || Date.now(), by: deviceName() };
    await markPreload(entry.hash, serverFields(json), entry.card, meta);
    store.preload.set(entry.key, cacheEntry({ ...entry, ...meta, size: file.length }));
    L.Loading.stop();
    L.Noty.show(MSG.started);
    return true;
  } catch (err) {
    L.Loading.stop();
    showError(err);
    return false;
  }
}
