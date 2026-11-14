(() => {
  // src/styles.css
  var styles_default = `/* Netflix-like theme: dark canvas, red accent. Everything is scoped to our screens. */
.lh-home,
.lh-catalog {
  background: #141414;
}
.lh-home .items-line__title {
  font-size: 1.6em;
  font-weight: 700;
}
.lh-home .card--wide,
.lh-catalog .card--wide {
  transition: transform 0.2s;
}
.lh-home .card--wide.focus,
.lh-catalog .card--wide.focus {
  transform: scale(1.06);
  z-index: 3;
}
.lh-home .card--wide.focus .card__view::after,
.lh-catalog .card--wide.focus .card__view::after {
  border-color: #fff;
}
.lh-home .card--wide .card__promo,
.lh-catalog .card--wide .card__promo {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0) 100%);
}
.lh-home .card__view .time-line > div {
  background-color: #e50914;
}
/* Poster used as backdrop: show it whole on a dark field instead of stretching. */
.lh-home .card--wide.lh-card--poster .card__view,
.lh-catalog .card--wide.lh-card--poster .card__view {
  background: #0b0b0b;
}
.lh-home .card--wide.lh-card--poster .card__img,
.lh-catalog .card--wide.lh-card--poster .card__img {
  object-fit: contain;
}

/* Home rows: wide 16:9 cards, five per row plus a peek of the sixth.
   Lampa sets body font-size = innerWidth / 84.17, so the layout is width-independent:
   1.5em left offset + 5.5 x (14em card + 1em gap) ~= 84em. */
.lh-home .card--wide {
  width: 14em;
}
.lh-home .card--wide .card__view {
  padding-bottom: 56.25%;
  border-radius: 0.4em;
}
.lh-home .card--wide .card__img {
  object-fit: cover;
}
/* Narrower than Lampa's own wide card (34.3em): keep only a compact title. */
.lh-home .card--wide .card__promo {
  padding: 1.5em 0.8em 0.7em 0.8em;
}
.lh-home .card--wide .card__promo-title {
  font-size: 1.3em;
  padding-right: 2.6em; /* room for the rating badge */
}
.lh-home .card--wide .card__promo-text {
  display: none;
}

/* Hero banner above the rows: backdrop, left/bottom shade, text bottom-left. */
.lh-home .lh-banner {
  position: relative;
  height: 45vh;
  margin: 0 1.5em 1.5em 1.5em;
  border-radius: 0.4em;
  overflow: hidden;
  background-color: #111;
  background-size: cover;
  background-position: center;
}
.lh-home .lh-banner__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 45%, rgba(0, 0, 0, 0) 75%),
    linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 55%);
}
.lh-home .lh-banner__body {
  position: absolute;
  left: 2em;
  bottom: 2em;
  width: 50%;
  color: #fff;
}
.lh-home .lh-banner__title {
  font-size: 2.6em;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 0.3em;
}
.lh-home .lh-banner__meta {
  font-size: 1.1em;
  opacity: 0.8;
  margin-bottom: 0.6em;
}
.lh-home .lh-banner__overview {
  font-size: 1.1em;
  line-height: 1.4;
  opacity: 0.9;
  margin-bottom: 1.2em;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.lh-home .lh-banner__buttons {
  display: flex;
  gap: 1em;
}
.lh-home .lh-banner__button {
  padding: 0.6em 1.6em;
  border-radius: 0.4em;
  font-size: 1.2em;
  font-weight: 600;
  outline: 0.2em solid transparent;
}
.lh-home .lh-banner__play {
  background: #fff;
  color: #000;
}
.lh-home .lh-banner__more {
  background: rgba(109, 109, 110, 0.7);
  color: #fff;
}
.lh-home .lh-banner__button.focus {
  outline-color: #fff;
  outline-offset: 0.15em;
}

/* Episode badge "7 \u0438\u0437 12" on series cards, loaded after render. */
.lh-home .lh-badge {
  position: absolute;
  top: 0.4em;
  left: 0.4em;
  background: #2b2b2b;
  border: 1px solid #555;
  color: #fff;
  font-size: 0.8em;
  padding: 0.1em 0.4em;
  border-radius: 0.2em;
  z-index: 2;
}

/* Catalog: chips row above a 4-column grid of the same wide 16:9 cards. */
.lh-catalog .lh-catalog__head {
  padding: 1em 1.5em 0 1.5em;
}
.lh-catalog .lh-catalog__head .scroll--nopadding .scroll__body {
  padding: 0;
}
.lh-catalog .card--wide .card__view {
  padding-bottom: 56.25%;
  border-radius: 0.4em;
}
.lh-catalog .card--wide .card__img {
  object-fit: cover;
}
.lh-catalog .card--wide .card__promo {
  padding: 1.5em 0.8em 0.7em 0.8em;
}
.lh-catalog .card--wide .card__promo-title {
  font-size: 1.3em;
  padding-right: 2.6em;
}
.lh-catalog .card--wide .card__promo-text {
  display: none;
}

/* Menu: only main / movie / tv / cartoon / anime / settings stay visible. */
.menu__item.lh-hide {
  display: none !important;
}

/* Card page: our \xAB\u0418\u0433\u0440\u0430\u0442\u044C\xBB button, first in the buttons row. */
/* White with a black icon in both states; Lampa still hides the text until focus. */
.full-start__button.lh-play,
.full-start__button.lh-play.focus {
  font-weight: 700;
  background-color: #fff;
  color: #000;
}

/* \xAB\u0421\u043A\u0430\u0447\u0430\u043D\u043D\u043E\u0435\xBB: the catalog grid without chips; progress badge on each card. */
.lh-downloads .scroll__body {
  padding-top: 1em;
}
.lh-downloads .lh-dl-badge {
  position: absolute;
  top: 0.4em;
  left: 0.4em;
  background: rgba(20, 20, 20, 0.85);
  border: 1px solid #555;
  color: #fff;
  font-size: 0.8em;
  padding: 0.1em 0.4em;
  border-radius: 0.2em;
  z-index: 2;
}
.lh-downloads .lh-dl-badge--done {
  background: #1e7a34;
  border-color: #2fa84a;
}
`;

  // src/config.js
  var ROWS = ["movies", "horror", "anime", "series", "cartoons", "history"];
  var STORAGE_KEYS = {
    progress: "lh_progress",
    seen: "lh_seen",
    tvcache: "lh_tvcache",
    notifyAt: "lh_notify_at",
    filters: "lh_filters",
    preload: "lh_preload",
    settings: "lh_settings"
  };
  var LIMITS = {
    searchTimeoutMs: 12e3,
    maxMovieBytes: 60 * 1024 ** 3,
    maxToasts: 3,
    notifyEveryMs: 6 * 36e5,
    tvCacheMs: 12 * 36e5
  };
  var VOICE_STUDIOS = {
    lostfilm: "lostfilm|\u043B\u043E\u0441\u0442 ?\u0444\u0438\u043B\u044C\u043C|\u043B\u043E\u0441\u0442",
    hdrezka: "hd ?rezka|rezka",
    anidub: "anidub",
    anilibria: "anilibria",
    jaskier: "jaskier",
    kubik: "\u043A\u0443\u0431\u0438\u043A \u0432 \u043A\u0443\u0431\u0435|kubik",
    newstudio: "newstudio",
    amedia: "amedia"
  };
  var VOICE_PREFERENCE = {
    movie: ["lostfilm", "hdrezka"],
    tv: ["lostfilm", "hdrezka"],
    anime: ["anidub", "anilibria"]
  };
  var RUSSIAN_MARKERS = "(?<![\\p{L}\\d])(?:rus(?![\\p{L}\\d])|\u0440\u0443\u0441)|\u0434\u0443\u0431\u043B\u044F\u0436|\\bmvo\\b|\\bdvo\\b|\\bavo\\b|\u043C\u043D\u043E\u0433\u043E\u0433\u043E\u043B\u043E\u0441|\u0434\u0432\u0443\u0445\u0433\u043E\u043B\u043E\u0441|\u043E\u0434\u043D\u043E\u0433\u043E\u043B\u043E\u0441|\u043B\u0438\u0446\u0435\u043D\u0437\u0438\u044F|itunes|\\bp[12]\\b|(?<![\\p{L}\\d])\u0434(?![\\p{L}\\d])|\u043B\u043E\u0441\u0442";
  var SCREENER_MARKERS = "camrip|\\bcam\\b|telesync|\\bts\\b|\\btc\\b|hdts|hdtc|telecine|\u044D\u043A\u0440\u0430\u043D\u043A|\\bline\\b";
  var DV_MARKERS = "\\bdv\\b|\\bdovi\\b|dolby[ ._-]?vision";
  var DV_P5_MARKERS = "\\bp5\\b|profile ?5";
  var HDR_MARKERS = "hdr10|hdr\\b|\\bp8\\b|profile ?8";
  var SCORING = {
    quality: { 2160: 100, 1080: 80, 720: 20, anime720: 60, 480: 10, unknown: 40 },
    voiceFirst: 40,
    voiceSecond: 30,
    voiceAnyRussian: 15,
    audioLossy: 5,
    seedsCap: 30,
    seedsFactor: 5,
    deadSeeders: 3,
    deadPenalty: 60,
    sizePenaltyPerGiB: 0.2
  };
  var SUB_WORD = "(?:sub(?:s|titles?)?(?!\\p{L})|\u0441\u0443\u0431\u0442\u0438\u0442\u0440\\p{L}*)";
  var SUB_LANG = "(?:(?:rus|eng|ukr|jap)\\p{L}*|\u0440\u0443\u0441\\p{L}*|\u0430\u043D\u0433\u043B\\p{L}*|\u0443\u043A\u0440\\p{L}*)";
  var SUBTITLE_PHRASES = "(?<![\\p{L}\\d])(?:rus|\u0440\u0443\u0441\\p{L}*)[\\s.]*" + SUB_WORD + "|(?<![\\p{L}\\d])" + SUB_WORD + "[\\s:.(\\-]*(?:" + SUB_LANG + "[\\s,+/.]*)+\\)?";

  // src/store.js
  var MAX_ENTRIES = 200;
  var DEFAULT_FILTER = { genre: null, year: null, sort: "new" };
  function createStore(storage2, now = () => Date.now()) {
    const read = (key) => {
      const v = storage2.get(key, {});
      return v && typeof v === "object" ? v : {};
    };
    const progress = {
      get(cardId) {
        return read(STORAGE_KEYS.progress)[cardId] || null;
      },
      set(cardId, { season, episode, hash }) {
        const all = read(STORAGE_KEYS.progress);
        all[cardId] = { season, episode, hash, updated: now() };
        storage2.set(STORAGE_KEYS.progress, all);
      }
    };
    const seen = {
      get(tvId) {
        const v = read(STORAGE_KEYS.seen)[tvId];
        return typeof v === "number" ? v : null;
      },
      set(tvId, aired) {
        const all = read(STORAGE_KEYS.seen);
        all[tvId] = aired;
        storage2.set(STORAGE_KEYS.seen, all);
      }
    };
    const tvcache = {
      get(tvId) {
        const e = read(STORAGE_KEYS.tvcache)[tvId];
        if (!e || now() - e.checked > LIMITS.tvCacheMs) return null;
        return e;
      },
      set(tvId, status2) {
        const all = read(STORAGE_KEYS.tvcache);
        all[tvId] = { status: status2, checked: now() };
        storage2.set(STORAGE_KEYS.tvcache, all);
      }
    };
    const notify = {
      due() {
        const at = storage2.get(STORAGE_KEYS.notifyAt, 0);
        return now() - (typeof at === "number" ? at : 0) >= LIMITS.notifyEveryMs;
      },
      mark() {
        storage2.set(STORAGE_KEYS.notifyAt, now());
      }
    };
    const filters = {
      get(kind) {
        return { ...DEFAULT_FILTER, ...read(STORAGE_KEYS.filters)[kind] || {} };
      },
      set(kind, f) {
        var _a, _b, _c;
        const all = read(STORAGE_KEYS.filters);
        all[kind] = { genre: (_a = f.genre) != null ? _a : null, year: (_b = f.year) != null ? _b : null, sort: (_c = f.sort) != null ? _c : "new" };
        storage2.set(STORAGE_KEYS.filters, all);
      }
    };
    const preload2 = {
      get(cardId) {
        return read(STORAGE_KEYS.preload)[cardId] || null;
      },
      set(cardId, data) {
        const all = read(STORAGE_KEYS.preload);
        all[cardId] = data;
        storage2.set(STORAGE_KEYS.preload, all);
      },
      remove(cardId) {
        const all = read(STORAGE_KEYS.preload);
        if (!(cardId in all)) return;
        delete all[cardId];
        storage2.set(STORAGE_KEYS.preload, all);
      },
      // Overwrites the whole list (the local copy of TorrServer's list).
      replace(map) {
        storage2.set(STORAGE_KEYS.preload, map && typeof map === "object" ? map : {});
      },
      all() {
        const all = read(STORAGE_KEYS.preload);
        return Object.keys(all).map((cardId) => ({ cardId, ...all[cardId] })).sort((a, b) => (b.added || 0) - (a.added || 0));
      }
    };
    function trim(key, field) {
      const all = read(key);
      const ids = Object.keys(all);
      const valid = ids.filter((id) => all[id] && typeof all[id] === "object");
      if (ids.length <= MAX_ENTRIES && valid.length === ids.length) return;
      valid.sort((a, b) => (Number(all[b][field]) || 0) - (Number(all[a][field]) || 0));
      const kept = {};
      for (const id of valid.slice(0, MAX_ENTRIES)) kept[id] = all[id];
      storage2.set(key, kept);
    }
    function prune() {
      trim(STORAGE_KEYS.progress, "updated");
      trim(STORAGE_KEYS.tvcache, "checked");
    }
    return { progress, seen, tvcache, notify, filters, preload: preload2, prune };
  }

  // src/lampa.js
  var storage = {
    get: (key, empty) => window.Lampa.Storage.get(key, empty),
    set: (key, value) => window.Lampa.Storage.set(key, value)
  };
  var noty = (text) => window.Lampa.Noty.show(text);
  var tmdbGet = (url, params, ok, fail3) => window.Lampa.Api.sources.tmdb.get(url, params, ok, fail3);
  var favoriteGet = (params) => window.Lampa.Favorite.get(params) || [];
  var lampa = () => window.Lampa;
  var store = createStore(storage);
  var storageField = (name) => window.Lampa.Storage.field(name);

  // src/episodes.js
  var realSeasons = (seasons) => (seasons || []).filter((s) => s && s.season_number > 0).sort((a, b) => a.season_number - b.season_number);
  var findSeason = (seasons, n) => realSeasons(seasons).find((s) => s.season_number === n);
  function episodeStatus(tv, today) {
    const list = realSeasons(tv && tv.seasons);
    const last = tv && tv.last_episode_to_air;
    const airing = !!tv && (tv.status === "Returning Series" || !!tv.next_episode_to_air);
    if (!last) {
      const s = list[list.length - 1];
      const total2 = s ? s.episode_count : 0;
      return { season: s ? s.season_number : 1, aired: total2, total: total2, airing };
    }
    const season = last.season_number;
    const info = findSeason(list, season);
    const total = info ? info.episode_count : last.episode_number;
    const future = !!last.air_date && !!today && last.air_date > today;
    const aired = future ? Math.max(0, last.episode_number - 1) : last.episode_number;
    return { season, aired, total, airing };
  }
  function absoluteEpisode(seasons, season, episode) {
    let sum = 0;
    for (const s of realSeasons(seasons)) {
      if (s.season_number < season) sum += s.episode_count;
    }
    return sum + episode;
  }
  function nextEpisode(progress, seasons) {
    if (!progress) return { season: 1, episode: 1 };
    const cur = findSeason(seasons, progress.season);
    if (cur && progress.episode < cur.episode_count) {
      return { season: progress.season, episode: progress.episode + 1 };
    }
    if (findSeason(seasons, progress.season + 1)) {
      return { season: progress.season + 1, episode: 1 };
    }
    return { season: progress.season, episode: progress.episode };
  }
  var NOT_EPISODE_NUMBERS = /* @__PURE__ */ new Set([360, 480, 576, 1440, 2160, 4320]);
  var RESOLUTIONS = /* @__PURE__ */ new Set([...NOT_EPISODE_NUMBERS, 720, 1080]);
  function parseEpisode(filename) {
    const result = (season, episode, absolute) => ({ season, episode, absolute });
    let name = String(filename || "").replace(/^.*[\\/]/, "");
    name = name.replace(/(?<![0-9A-Za-z])(?:19|20)\d{2}(?![0-9A-Za-z])/g, " ");
    let m = name.match(/(?<![0-9A-Za-z])s(\d{1,2})[ ._-]?e(\d{1,4})(?!\d)/i);
    if (m) return result(+m[1], +m[2], null);
    m = name.match(/(?<![0-9A-Za-z])(\d{1,2})x(\d{1,4})(?![0-9A-Za-z])/i);
    if (m) return result(+m[1], +m[2], null);
    m = name.match(/сезон\s*(\d{1,2})\D{0,10}?сери[яи]\s*(\d{1,4})/i);
    if (m) return result(+m[1], +m[2], null);
    m = name.match(/(?<![0-9A-Za-z])(?:ep(?:isode)?|e)[ ._-]?(\d{1,4})(?!\d)/i) || name.match(/сери[яи][ ._-]?(\d{1,4})(?!\d)/i);
    if (m) return result(null, +m[1], +m[1]);
    m = name.match(/\[(\d{1,4})\]/);
    if (m && !RESOLUTIONS.has(+m[1])) return result(null, +m[1], +m[1]);
    m = name.match(/\s-\s(\d{1,4})(?=\s|\.|\[|$)/);
    if (m && !NOT_EPISODE_NUMBERS.has(+m[1])) return result(null, +m[1], +m[1]);
    return result(null, null, null);
  }

  // src/torrent-select.js
  var GiB = 1024 ** 3;
  var re = (src) => new RegExp(src, "iu");
  var RE_RUSSIAN = re(RUSSIAN_MARKERS);
  var RE_SUBS = re(SUBTITLE_PHRASES);
  var RE_SCREENER = re(SCREENER_MARKERS);
  var RE_DV = re(DV_MARKERS);
  var RE_DV_P5 = re(DV_P5_MARKERS);
  var RE_HDR = re(HDR_MARKERS);
  var STUDIO_RES = Object.entries(VOICE_STUDIOS).map(([id, src]) => [id, re(src)]);
  function detectStudio(title) {
    for (const [id, rx] of STUDIO_RES) if (rx.test(title)) return id;
    return null;
  }
  function detectResolution(t) {
    if (/(?<![\d])2160\s*p?|\b4k\b|\buhd\b/i.test(t)) return 2160;
    if (/(?<![\d])1080\s*[pi]?(?![\d])/i.test(t)) return 1080;
    if (/(?<![\d])720\s*p?(?![\d])/i.test(t)) return 720;
    if (/(?<![\d])(?:480|576)\s*p?(?![\d])/i.test(t)) return 480;
    return null;
  }
  function detectAudio(t) {
    if (/e-?ac-?3|\bddp/i.test(t)) return "eac3";
    if (/(?<![a-z])ac-?3(?![a-z\d])|\bdd ?5\.1/i.test(t)) return "ac3";
    if (/truehd/i.test(t)) return "truehd";
    if (/\bdts/i.test(t)) return "dts";
    if (/\baac/i.test(t)) return "aac";
    return null;
  }
  function detectVoice(t, studio, audioText) {
    if (studio === "lostfilm" || studio === "hdrezka" || studio === "anidub") return studio;
    if (studio) return "other";
    if (/дубляж|(?<![\p{L}\d])dub(?!bed)/iu.test(t)) return "dub";
    if (/\bmvo\b|многоголос/i.test(t)) return "mvo";
    return RE_RUSSIAN.test(audioText) ? "other" : null;
  }
  function detectSeasons(t) {
    const out = /* @__PURE__ */ new Set();
    const add = (a, b) => {
      for (let s = a; s <= b && s - a < 60; s++) out.add(s);
    };
    let m;
    const sx = /(?<![\p{L}\d])s(\d{1,2})(?:\s*-\s*s?(\d{1,2}))?(?![\d])(?!e\d)/giu;
    while (m = sx.exec(t)) add(+m[1], m[2] ? +m[2] : +m[1]);
    const en = /(?<![\p{L}\d])season\s*(\d{1,2})(?:\s*-\s*(\d{1,2}))?(?![\d])/giu;
    while (m = en.exec(t)) add(+m[1], m[2] ? +m[2] : +m[1]);
    const nth = /(?<![\p{L}\d])(\d{1,2})(?:st|nd|rd|th)\s+season/giu;
    while (m = nth.exec(t)) add(+m[1], +m[1]);
    const tv = /(?<![\p{L}\d])tv-?(\d{1,2})(?![\d])/giu;
    while (m = tv.exec(t)) add(+m[1], +m[1]);
    const before = /(?<![\p{L}\d])(\d{1,2})(?:\s*-\s*(\d{1,2}))?\s*сезон/giu;
    let prefixed = false;
    while (m = before.exec(t)) {
      prefixed = true;
      add(+m[1], m[2] ? +m[2] : +m[1]);
    }
    const ru = /сезон[ы:]*\s*(\d{1,2})(?:\s*-\s*(\d{1,2}))?/giu;
    while (!prefixed && (m = ru.exec(t))) add(+m[1], m[2] ? +m[2] : +m[1]);
    return out.size ? [...out].sort((a, b) => a - b) : null;
  }
  function detectEpisodeRange(t) {
    const patterns = [
      /(?<![\p{L}\d])e(\d{1,4})\s*-\s*e?(\d{1,4})(?!\d)/iu,
      /\[\s*(\d{1,4})\s*-\s*(\d{1,4})\s*\]/,
      /(\d{1,4})\s*-\s*(\d{1,4})\s*(?:of|из|серии|серий|episodes|eps)(?![\p{L}])/iu,
      /(?:серии|серия|episodes?|eps?)[\s:]*(\d{1,4})\s*-\s*(\d{1,4})/iu
    ];
    for (const p of patterns) {
      const m = t.match(p);
      if (m && +m[1] <= +m[2] && +m[1] < 1900) return [+m[1], +m[2]];
    }
    return null;
  }
  function detectSxeRange(t) {
    const m = t.match(/(?<![\p{L}\d])s(\d{1,2})[ ._-]?e(\d{1,4})\s*-\s*e?(\d{1,4})(?!\d)/iu);
    return m && +m[2] <= +m[3] ? { season: +m[1], range: [+m[2], +m[3]] } : null;
  }
  function parseTitle(title) {
    const t = String(title || "");
    const audioText = t.replace(RE_SUBS, " ");
    const studio = detectStudio(t);
    const hdr = RE_HDR.test(t);
    const dv = RE_DV.test(t);
    const dvP5 = dv && RE_DV_P5.test(t);
    const range = detectEpisodeRange(t);
    const ep = parseEpisode(t);
    return {
      resolution: detectResolution(t),
      screener: RE_SCREENER.test(t),
      dvOnly: dv && (dvP5 || !hdr),
      hdr,
      russian: RE_RUSSIAN.test(audioText) || studio !== null,
      voice: detectVoice(t, studio, audioText),
      studio,
      audio: detectAudio(t),
      seasons: detectSeasons(t),
      episodeRange: range,
      sxeRange: detectSxeRange(t),
      episode: ep.episode == null ? null : ep
    };
  }
  function hasEpisode(p, ctx) {
    var _a, _b, _c;
    const wantEp = (_a = ctx.episode) != null ? _a : null;
    const wantAbs = (_c = (_b = ctx.absolute) != null ? _b : ctx.episode) != null ? _c : null;
    const inRange = (n) => n != null && p.episodeRange && n >= p.episodeRange[0] && n <= p.episodeRange[1];
    if (p.sxeRange) {
      const [a, b] = p.sxeRange.range;
      return p.sxeRange.season === ctx.season && wantEp >= a && wantEp <= b;
    }
    if (p.episode && p.episode.season == null && p.episodeRange) return inRange(ctx.kind === "anime" ? wantAbs : wantEp);
    if (p.episode) {
      if (p.episode.season != null) {
        return p.episode.season === ctx.season && p.episode.episode === wantEp;
      }
      return ctx.kind === "anime" ? p.episode.absolute === wantAbs : p.episode.absolute === wantEp;
    }
    if (p.seasons) {
      if (ctx.season != null && !p.seasons.includes(ctx.season)) return false;
      return p.episodeRange ? inRange(wantEp) : true;
    }
    if (p.episodeRange) return inRange(ctx.kind === "anime" ? wantAbs : wantEp);
    return true;
  }
  function rejectReason(p, result, ctx) {
    if (p.screener) return "screener";
    if (p.dvOnly) return "dv-only";
    if (!p.russian) return "no-russian";
    if (ctx.kind === "movie" && Number(result.Size) > LIMITS.maxMovieBytes) return "oversize";
    if ((ctx.kind === "tv" || ctx.kind === "anime") && !hasEpisode(p, ctx)) return "episode-missing";
    return null;
  }
  function score(p, result, ctx) {
    const W = SCORING;
    let quality = W.quality.unknown;
    if (p.resolution === 720) quality = ctx.kind === "anime" ? W.quality.anime720 : W.quality[720];
    else if (p.resolution) quality = W.quality[p.resolution];
    const pref = VOICE_PREFERENCE[ctx.kind] || [];
    const rank = pref.indexOf(p.studio);
    let voice = 0;
    if (rank === 0) voice = W.voiceFirst;
    else if (rank === 1) voice = W.voiceSecond;
    else if (p.russian) voice = W.voiceAnyRussian;
    const audio = ["ac3", "aac", "eac3"].includes(p.audio) ? W.audioLossy : 0;
    const seeders = Math.max(0, Number(result.Seeders) || 0);
    let seeds = Math.min(W.seedsCap, Math.log2(seeders + 1) * W.seedsFactor);
    if (seeders < W.deadSeeders) seeds -= W.deadPenalty;
    const sizePenalty = (Number(result.Size) || 0) / GiB * W.sizePenaltyPerGiB;
    return quality + voice + audio + seeds - sizePenalty;
  }
  function selectTorrent(results, ctx) {
    const scored = (results || []).map((result) => {
      const p = parseTitle(result.Title);
      return { result, score: score(p, result, ctx), rejected: rejectReason(p, result, ctx) };
    });
    scored.sort((a, b) => (a.rejected ? 1 : 0) - (b.rejected ? 1 : 0) || b.score - a.score);
    const top = scored.find((s) => !s.rejected);
    return { chosen: top ? top.result : null, scored };
  }

  // src/queue.js
  function createQueue(limit) {
    let active = 0;
    const waiting = [];
    const next = () => {
      if (active >= limit || !waiting.length) return;
      active++;
      const { job, resolve, reject } = waiting.shift();
      Promise.resolve().then(job).then(resolve, reject).finally(() => {
        active--;
        next();
      });
    };
    return (job) => new Promise((resolve, reject) => {
      waiting.push({ job, resolve, reject });
      next();
    });
  }

  // src/tmdb-queries.js
  var GENRES_MOVIE = [
    { id: 28, title: "\u0411\u043E\u0435\u0432\u0438\u043A" },
    { id: 12, title: "\u041F\u0440\u0438\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F" },
    { id: 16, title: "\u041C\u0443\u043B\u044C\u0442\u0444\u0438\u043B\u044C\u043C" },
    { id: 35, title: "\u041A\u043E\u043C\u0435\u0434\u0438\u044F" },
    { id: 80, title: "\u041A\u0440\u0438\u043C\u0438\u043D\u0430\u043B" },
    { id: 18, title: "\u0414\u0440\u0430\u043C\u0430" },
    { id: 14, title: "\u0424\u044D\u043D\u0442\u0435\u0437\u0438" },
    { id: 27, title: "\u0423\u0436\u0430\u0441\u044B" },
    { id: 9648, title: "\u0414\u0435\u0442\u0435\u043A\u0442\u0438\u0432" },
    { id: 10749, title: "\u041C\u0435\u043B\u043E\u0434\u0440\u0430\u043C\u0430" },
    { id: 878, title: "\u0424\u0430\u043D\u0442\u0430\u0441\u0442\u0438\u043A\u0430" },
    { id: 53, title: "\u0422\u0440\u0438\u043B\u043B\u0435\u0440" },
    { id: 10752, title: "\u0412\u043E\u0435\u043D\u043D\u044B\u0439" }
  ];
  var GENRES_TV = [
    { id: 10759, title: "\u0411\u043E\u0435\u0432\u0438\u043A \u0438 \u043F\u0440\u0438\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F" },
    { id: 16, title: "\u0410\u043D\u0438\u043C\u0430\u0446\u0438\u044F" },
    { id: 35, title: "\u041A\u043E\u043C\u0435\u0434\u0438\u044F" },
    { id: 80, title: "\u041A\u0440\u0438\u043C\u0438\u043D\u0430\u043B" },
    { id: 18, title: "\u0414\u0440\u0430\u043C\u0430" },
    { id: 9648, title: "\u0414\u0435\u0442\u0435\u043A\u0442\u0438\u0432" },
    { id: 10765, title: "\u0424\u0430\u043D\u0442\u0430\u0441\u0442\u0438\u043A\u0430 \u0438 \u0444\u044D\u043D\u0442\u0435\u0437\u0438" },
    { id: "horror", title: "\u0423\u0436\u0430\u0441\u044B" }
    // TV has no horror genre: emulated via keywords
  ];
  var GENRE_HORROR_TV_KEYWORDS = [315058, 12377, 3133, 3358, 12339, 256183];
  var GENRE_ANIMATION = 16;
  var GENRE_DOCUMENTARY = 99;
  function genresFor(kind) {
    if (kind === "tv") return GENRES_TV;
    if (kind === "movie") return GENRES_MOVIE;
    const base = kind === "anime" ? GENRES_TV : kind === "cartoon" ? GENRES_MOVIE : [];
    return base.filter((g) => g.id !== GENRE_ANIMATION);
  }
  function daysAgo(today, n) {
    const [y, m, d] = today.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
  }
  var MOVIE_DATE = "release_date";
  function movieFilter(today) {
    return {
      with_release_type: "4",
      region: "US",
      [`${MOVIE_DATE}.lte`]: today
    };
  }
  function rowQuery(rowKey, today) {
    switch (rowKey) {
      case "movies":
        return {
          url: "discover/movie",
          params: {
            sort_by: `${MOVIE_DATE}.desc`,
            filter: {
              ...movieFilter(today),
              without_genres: `${GENRE_ANIMATION},${GENRE_DOCUMENTARY}`,
              "vote_count.gte": "20"
            }
          }
        };
      case "horror":
        return {
          url: "discover/movie",
          params: {
            genres: 27,
            sort_by: `${MOVIE_DATE}.desc`,
            filter: { ...movieFilter(today), "vote_count.gte": "20" }
          }
        };
      case "anime":
        return {
          url: "discover/tv",
          params: {
            genres: GENRE_ANIMATION,
            sort_by: "popularity.desc",
            // air_date.lte: shows whose only "recent" episode is still announced stay out.
            filter: {
              with_origin_country: "JP",
              "air_date.gte": daysAgo(today, 14),
              "air_date.lte": today,
              "vote_count.gte": "5"
            }
          }
        };
      case "series":
        return {
          url: "discover/tv",
          params: {
            sort_by: "popularity.desc",
            filter: {
              without_genres: String(GENRE_ANIMATION),
              "air_date.gte": daysAgo(today, 30),
              "air_date.lte": today,
              "vote_count.gte": "5"
            }
          }
        };
      case "cartoons":
        return {
          url: "discover/movie",
          params: {
            genres: GENRE_ANIMATION,
            sort_by: `${MOVIE_DATE}.desc`,
            filter: { ...movieFilter(today), "vote_count.gte": "20" }
          }
        };
      default:
        return null;
    }
  }
  function yearRange(year) {
    const m = typeof year === "string" && /^(\d{4})-(\d{4})$/.exec(year);
    return m ? { from: `${m[1]}-01-01`, to: `${m[2]}-12-31` } : null;
  }
  function catalogQuery(kind, filters, page, today) {
    const isTv = kind === "tv" || kind === "anime";
    const params = { page, filter: {} };
    const f = params.filter;
    const fixed = kind === "anime" || kind === "cartoon";
    if (filters.genre === "horror") {
      params.keywords = GENRE_HORROR_TV_KEYWORDS.join("|");
      if (fixed) params.genres = GENRE_ANIMATION;
    } else if (fixed) {
      params.genres = filters.genre != null ? `${GENRE_ANIMATION},${filters.genre}` : GENRE_ANIMATION;
    } else if (filters.genre != null) {
      params.genres = filters.genre;
    }
    if (kind === "anime") f.with_origin_country = "JP";
    if (kind === "movie" && filters.genre !== GENRE_ANIMATION) {
      f.without_genres = `${GENRE_ANIMATION},${GENRE_DOCUMENTARY}`;
    }
    const dateField = isTv ? "first_air_date" : MOVIE_DATE;
    if (!isTv) Object.assign(f, movieFilter(today));
    if (filters.sort === "rating") {
      params.sort_by = "vote_average.desc";
      f["vote_count.gte"] = "100";
    } else {
      params.sort_by = `${dateField}.desc`;
      f[`${dateField}.lte`] = today;
      f["vote_count.gte"] = isTv ? "5" : "10";
    }
    const range = yearRange(filters.year);
    if (range) {
      f[`${dateField}.gte`] = range.from;
      f[`${dateField}.lte`] = range.to;
    } else if (filters.year != null) {
      f[isTv ? "first_air_date_year" : "primary_release_year"] = filters.year;
    }
    return { url: isTv ? "discover/tv" : "discover/movie", params };
  }

  // src/cards.js
  var ROW_TITLES = {
    movies: "\u041D\u043E\u0432\u044B\u0435 \u0444\u0438\u043B\u044C\u043C\u044B",
    horror: "\u041D\u043E\u0432\u044B\u0435 \u0443\u0436\u0430\u0441\u044B",
    anime: "\u0410\u043D\u0438\u043C\u0435: \u043E\u043D\u0433\u043E\u0438\u043D\u0433\u0438",
    series: "\u041D\u043E\u0432\u044B\u0435 \u0441\u0435\u0440\u0438\u0430\u043B\u044B",
    cartoons: "\u041D\u043E\u0432\u044B\u0435 \u043C\u0443\u043B\u044C\u0442\u0444\u0438\u043B\u044C\u043C\u044B",
    history: "\u041D\u0435\u0434\u0430\u0432\u043D\u043E \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u043D\u043E\u0435"
  };
  function rowTitle(rowKey) {
    return ROW_TITLES[rowKey] || rowKey;
  }
  function hasRussianTitle(card) {
    if (!card) return false;
    return /[Ѐ-ӿ]/.test(card.title || card.name || "") || card.original_language === "ru";
  }
  async function fillPages(fetchPage, { min = 12, maxPages = 3, limit = 20 } = {}) {
    let all = [];
    for (let page = 1; page <= maxPages; page++) {
      let part;
      if (page === 1) {
        part = await fetchPage(page);
      } else {
        try {
          part = await fetchPage(page);
        } catch (e) {
          break;
        }
      }
      all = all.concat(part.cards || []);
      if (all.length >= min || part.done) break;
    }
    return all.slice(0, limit);
  }
  function toWideCard(card) {
    const out = { ...card, params: { ...card.params || {}, style: { name: "wide" } } };
    if (!out.backdrop_path && out.poster_path) {
      out.backdrop_path = out.poster_path;
      out.lh_poster_fallback = true;
    }
    return out;
  }
  function badgeText(status2) {
    return `${status2.aired} \u0438\u0437 ${status2.total}`;
  }
  function applyPosterClass(cardEl, cardData) {
    if (!cardEl || !cardData || !cardData.lh_poster_fallback) return;
    cardEl.classList.add("lh-card--poster");
  }
  function applyBadge(cardEl, status2) {
    if (!cardEl || !status2 || !status2.total) return;
    const view = cardEl.querySelector(".card__view");
    if (!view || view.querySelector(".lh-badge")) return;
    const el = document.createElement("div");
    el.className = "lh-badge";
    el.textContent = badgeText(status2);
    view.appendChild(el);
  }
  function pickBannerCard(cards, random, rnd = Math.random) {
    if (!cards || !cards.length) return void 0;
    if (!random) return cards[0];
    return cards[Math.floor(rnd() * Math.min(5, cards.length))];
  }

  // src/tmdb.js
  var HISTORY_LIMIT = 20;
  function todayIso(d = /* @__PURE__ */ new Date()) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function get(url, params) {
    return new Promise((resolve, reject) => tmdbGet(url, params, resolve, reject));
  }
  function loadHistory() {
    return favoriteGet({ type: "history" }).slice(0, HISTORY_LIMIT);
  }
  function loadRow(rowKey, today = todayIso()) {
    const base = { title: rowTitle(rowKey), rowKey, results: [] };
    if (rowKey === "history") {
      try {
        return Promise.resolve({ ...base, results: loadHistory() });
      } catch (e) {
        return Promise.resolve(base);
      }
    }
    const q = rowQuery(rowKey, today);
    if (!q) return Promise.resolve(base);
    let totalPages = 1;
    const fetchPage = (page) => get(q.url, { ...q.params, page }).then((json) => {
      if (page === 1) totalPages = json && json.total_pages || 1;
      return { cards: (json && json.results || []).filter(hasRussianTitle), done: page >= totalPages };
    });
    return fillPages(fetchPage).then(
      (results) => ({ ...base, results, total_pages: totalPages }),
      () => base
    );
  }
  function loadTv(tvId) {
    return get(`tv/${tvId}`, {});
  }
  var tvQueue = createQueue(6);
  function tvStatus(tvId, today = todayIso()) {
    const hit = store.tvcache.get(tvId);
    if (hit) return Promise.resolve(hit.status);
    return tvQueue(() => loadTv(tvId)).then(
      (json) => {
        const genres = json && json.genres || [];
        const status2 = { ...episodeStatus(json, today), animation: genres.some((g) => g && g.id === 16) };
        store.tvcache.set(tvId, status2);
        return status2;
      },
      () => null
    );
  }

  // src/play.js
  var ANIMATION = 16;
  var VIDEO = ["asf", "wmv", "divx", "avi", "mp4", "m4v", "mov", "3gp", "3g2", "mkv", "trp", "tp", "mts", "mpg", "mpeg", "dat", "vob", "rm", "rmvb", "m2ts", "ts"];
  var INDIVIDUAL = ["vob", "m2ts"];
  var FILES_EVERY_MS = 2e3;
  var WATCHED_PERCENT = 85;
  var FILES_TRIES = 45;
  var HASH_TIMEOUT_MS = 2e4;
  var MSG = {
    search: "\u0418\u0449\u0443 \u0440\u0430\u0437\u0434\u0430\u0447\u0443\u2026",
    server: "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E \u0432 TorrServer\u2026",
    files: "\u0416\u0434\u0443 \u0441\u043F\u0438\u0441\u043E\u043A \u0444\u0430\u0439\u043B\u043E\u0432\u2026",
    none: "\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0435\u0439 \u0440\u0430\u0437\u0434\u0430\u0447\u0438 \u043D\u0435 \u043D\u0430\u0448\u0451\u043B, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E",
    noFile: "\u041D\u0443\u0436\u043D\u043E\u0439 \u0441\u0435\u0440\u0438\u0438 \u0432 \u0440\u0430\u0437\u0434\u0430\u0447\u0435 \u043D\u0435 \u043D\u0430\u0448\u0451\u043B, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E",
    parser: "\u041F\u0430\u0440\u0441\u0435\u0440 \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B",
    torrserver: "TorrServer \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
    noServer: "TorrServer \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D",
    noFiles: "TorrServer \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B \u0441\u043F\u0438\u0441\u043E\u043A \u0444\u0430\u0439\u043B\u043E\u0432",
    unknown: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0440\u0430\u0437\u0434\u0430\u0447\u0443"
  };
  var PlayError = class extends Error {
  };
  var fail = (msg) => new PlayError(msg);
  var ext = (path) => String(path || "").split(".").pop().toLowerCase();
  var isVideo = (f) => VIDEO.includes(ext(f.path));
  function genreIds(card) {
    if (!card) return [];
    if (Array.isArray(card.genre_ids) && card.genre_ids.length) return card.genre_ids;
    return (Array.isArray(card.genres) ? card.genres : []).map((g) => g && g.id).filter((id) => id != null);
  }
  function detectKind(card) {
    if (!card || !card.original_name) return "movie";
    const jp = (card.origin_country || []).includes("JP");
    return jp && genreIds(card).includes(ANIMATION) ? "anime" : "tv";
  }
  function titleHasSeason(title) {
    const p = parseTitle(title);
    return !!(p.seasons || p.sxeRange || p.episode && p.episode.season != null);
  }
  function pickFile(files, ctx, infos) {
    const videos = (files || []).filter(isVideo);
    if (!videos.length) return null;
    if (ctx.kind === "movie") {
      return videos.reduce((best, f) => (f.length || 0) > (best.length || 0) ? f : best);
    }
    const parsed = videos.map((f) => ({ f, ep: parseEpisode(f.path) }));
    const bySxe = parsed.find(({ ep }) => ep.season != null && ep.season === ctx.season && ep.episode === ctx.episode);
    if (bySxe) return bySxe.f;
    const bare = parsed.filter(({ ep }) => ep.season == null && ep.absolute != null);
    const absFirst = ctx.kind === "anime" && !ctx.titleHasSeason;
    const numbers = absFirst ? [ctx.absolute, ctx.episode] : [ctx.episode, ctx.absolute];
    const infoOf = (f) => Array.isArray(infos) ? infos.find((i) => i && i.id === f.id) : null;
    const otherSeason = (f) => {
      const i = infoOf(f);
      return !!i && !i.defaultSeason && i.season != null && i.season !== ctx.season;
    };
    let ambiguous = false;
    for (const n of numbers) {
      if (n == null) continue;
      const hits = bare.filter(({ ep }) => ep.absolute === n);
      if (hits.length === 1) {
        if (!otherSeason(hits[0].f)) return hits[0].f;
        ambiguous = true;
        break;
      }
      if (hits.length > 1) {
        ambiguous = true;
        break;
      }
    }
    if (Array.isArray(infos)) {
      const ids = new Set(videos.map((f) => f.id));
      const hits = infos.filter((i) => i && ids.has(i.id) && i.season === ctx.season && i.episode === ctx.episode);
      if (hits.length === 1) return videos.find((f) => f.id === hits[0].id);
    }
    if (ambiguous) return null;
    return videos.length === 1 && parsed[0].ep.episode == null ? videos[0] : null;
  }
  function resumeTarget(progress, view) {
    if (!progress || !view) return null;
    if (!(view.time > 0) || !(view.percent < WATCHED_PERCENT)) return null;
    return { season: progress.season, episode: progress.episode };
  }
  function normalizeTitles(card) {
    const out = { ...card };
    if (!out.title && out.name) out.title = out.name;
    if (!out.original_title && out.original_name) out.original_title = out.original_name;
    return out;
  }
  function advanceWatched(target, seasons, isWatched) {
    let t = { season: target.season, episode: target.episode };
    for (let guard2 = 0; guard2 < 5e3 && isWatched(t.season, t.episode); guard2++) {
      const next = nextEpisode(t, seasons);
      if (next.season === t.season && next.episode === t.episode) break;
      t = next;
    }
    return t;
  }
  function timelineHashString(season, episode, originalTitle) {
    return [season, season > 10 ? ":" : "", episode, originalTitle].join("");
  }
  function buildSearchParams(card, ctx, parseLang) {
    const title = card.title || card.name || "";
    const original = card.original_title || card.original_name || title;
    const year = String(card.first_air_date || card.release_date || "0000").slice(0, 4);
    const combinations = {
      df: original,
      df_year: original + " " + year,
      df_lg: original + " " + title,
      df_lg_year: original + " " + title + " " + year,
      lg: title,
      lg_year: title + " " + year,
      lg_df: title + " " + original,
      lg_df_year: title + " " + original + " " + year
    };
    const s = ctx && ctx.kind !== "movie" && Number.isInteger(ctx.season) && ctx.season >= 0 ? ctx.season : null;
    const season = s == null ? "" : " S" + (s < 10 ? "0" : "") + s;
    return {
      search: (combinations[parseLang] || original || title) + season,
      search_one: title + season,
      search_two: original + season,
      movie: card,
      page: 1
    };
  }
  function withTimeout(promise, ms, msg) {
    let timer;
    const t = new Promise((_, reject) => {
      timer = setTimeout(() => reject(fail(msg)), ms);
    });
    return Promise.race([promise, t]).finally(() => clearTimeout(timer));
  }
  var tmdbDetails = (kind, id) => kind === "movie" ? new Promise((resolve, reject) => lampa().Api.sources.tmdb.get(`movie/${id}`, {}, resolve, reject)) : loadTv(id);
  async function fullCard(card, kind) {
    const L = lampa();
    let movie = card;
    let details = null;
    if (kind !== "movie" || !Array.isArray(card.genres)) {
      try {
        details = await tmdbDetails(kind, card.id);
      } catch (e) {
        details = null;
      }
    }
    if (details && !Array.isArray(card.genres)) {
      movie = { ...card, genres: details.genres || [], number_of_seasons: details.number_of_seasons };
    } else if (!Array.isArray(card.genres)) {
      movie = { ...card, genres: [] };
    }
    if (!movie.img && movie.poster_path) movie = { ...movie, img: L.Api.img(movie.poster_path) };
    return { movie: normalizeTitles(movie), details };
  }
  function searchTorrents(params) {
    const L = lampa();
    const req = new Promise((resolve, reject) => {
      L.Parser.get(params, (data) => resolve(data && data.Results || []), () => reject(fail(MSG.parser)));
    });
    return withTimeout(req, LIMITS.searchTimeoutMs, MSG.parser);
  }
  function addTorrent(result, movie) {
    const L = lampa();
    const req = new Promise((resolve, reject) => {
      L.Torserver.hash(
        {
          title: result.Title,
          link: result.MagnetUri || result.Link,
          poster: movie.img,
          data: { lampa: true, movie }
        },
        (json) => json && json.hash ? resolve(json.hash) : reject(fail(MSG.torrserver)),
        () => reject(fail(MSG.torrserver))
      );
    });
    return withTimeout(req, HASH_TIMEOUT_MS, MSG.torrserver);
  }
  function pollFiles(hash, job) {
    const L = lampa();
    return new Promise((resolve, reject) => {
      let tries = 0;
      const tick = () => {
        if (job.cancelled) return stop(null);
        if (++tries > FILES_TRIES) return stop(fail(MSG.noFiles));
        L.Torserver.files(hash, (json) => {
          if (json && json.file_stats) stop(null, json.file_stats);
        }, () => {
        });
      };
      const stop = (err, files) => {
        clearInterval(job.timer);
        job.timer = null;
        if (err) reject(err);
        else resolve(files || null);
      };
      job.timer = setInterval(tick, FILES_EVERY_MS);
      tick();
    });
  }
  var natural = (p) => p.replace(/\d+/g, (m) => m.length > 3 ? m : ("000" + m).substr(-4));
  function parsePlays(files, movie) {
    const L = lampa();
    const plays = L.Torserver.clearFileName(
      files.filter(isVideo).sort((a, b) => natural(a.path).localeCompare(natural(b.path)))
    );
    return plays.map((file) => ({
      file,
      info: L.Torserver.parse({
        movie,
        files: plays,
        filename: file.path_human,
        path: file.path,
        is_file: INDIVIDUAL.includes(ext(file.path))
      })
    }));
  }
  function fileInfos(files, movie) {
    const L = lampa();
    try {
      return parsePlays(files, movie).map(({ file, info }) => {
        const bare = L.Torserver.parse({ movie: { ...movie, number_of_seasons: 0 }, files: [], filename: file.path_human, path: file.path, is_file: true });
        return { id: file.id, season: info.season, episode: info.episode, defaultSeason: !(bare.season > 0) };
      });
    } catch (e) {
      return null;
    }
  }
  function buildPlaylist(files, movie, hash) {
    const L = lampa();
    return parsePlays(files, movie).map(({ file, info }) => {
      const link = info.by_title && (!info.serial || info.episode) ? L.Timeline.link(movie, info.season, info.episode) : null;
      const timeline = L.Timeline.view(info.hash, link);
      if (movie.runtime) timeline.duration = movie.runtime * 60;
      return {
        id: file.id,
        path: file.path,
        length: file.length,
        season: info.season,
        episode: info.episode,
        title: file.path_human,
        first_title: movie.name || movie.title,
        card: movie,
        url: L.Torserver.stream(file.path, hash, file.id),
        torrent_hash: hash,
        timeline,
        img: "./img/img_broken.svg"
      };
    });
  }
  function openNativeList(params) {
    const L = lampa();
    L.Activity.push({ url: "", title: L.Lang.translate("title_torrents"), component: "torrents", ...params });
  }
  var current = null;
  var isBusy = () => !!current;
  var playingId = null;
  function timelineOf(movie) {
    const L = lampa();
    const title = movie.original_title || movie.original_name || "";
    return (season, episode) => {
      const hash = L.Utils.hash(timelineHashString(season, episode, title));
      return L.Timeline.view(hash, L.Timeline.link(movie, season, episode));
    };
  }
  function isWatchedIn(movie) {
    const view = timelineOf(movie);
    return (season, episode) => {
      const v = view(season, episode);
      return !!v && v.percent >= WATCHED_PERCENT;
    };
  }
  function dropUnlessPreloaded(hash) {
    if (!hash) return;
    if (store.preload.all().some((e) => e && e.hash === hash)) return;
    lampa().Torserver.drop(hash);
  }
  async function resolveTarget(card) {
    const first = detectKind(card);
    const { movie, details } = await fullCard(card, first);
    if (first === "movie") return { kind: first, ctx: { kind: first }, movie, tv: null };
    const kind = details && Array.isArray(details.genres) ? detectKind({
      original_name: movie.original_name,
      origin_country: details.origin_country || movie.origin_country,
      genres: details.genres
    }) : first;
    const seasons = details && details.seasons || card.seasons || [];
    const progress = store.progress.get(card.id);
    let target = resumeTarget(progress, progress && timelineOf(movie)(progress.season, progress.episode)) || advanceWatched(nextEpisode(progress, seasons), seasons, isWatchedIn(movie));
    const status2 = details ? episodeStatus(details, todayIso()) : null;
    if (status2 && (target.season > status2.season || target.season === status2.season && target.episode > status2.aired)) {
      if (status2.aired >= 1) target = { season: status2.season, episode: status2.aired };
      else if (progress) target = { season: progress.season, episode: progress.episode };
    }
    const ctx = { kind, season: target.season, episode: target.episode, absolute: absoluteEpisode(seasons, target.season, target.episode) };
    return { kind, ctx, movie, tv: details };
  }
  function beginJob(text, onCancel) {
    const L = lampa();
    if (current) return null;
    const job = { cancelled: false, timer: null, hash: null };
    current = job;
    job.finish = () => {
      if (job.timer) clearInterval(job.timer);
      if (current === job) current = null;
      L.Loading.stop();
    };
    L.Loading.start(() => {
      job.cancelled = true;
      onCancel(job);
      job.finish();
    }, text);
    return job;
  }
  async function playFiles(job, card, movie, ctx) {
    const L = lampa();
    L.Loading.setText(MSG.files);
    const files = await pollFiles(job.hash, job);
    if (job.cancelled || !files) return "cancelled";
    const playlist = buildPlaylist(files, movie, job.hash);
    const file = ctx.index != null ? files.find((f) => f.id === ctx.index) : pickFile(files, ctx, fileInfos(files, movie));
    const element = file && playlist.find((p) => p.id === file.id);
    if (!element) return "nofile";
    job.finish();
    if (movie.id) L.Favorite.add("history", { ...movie, genre_ids: genreIds(movie) }, 100);
    playingId = ctx.kind === "movie" ? null : card.id;
    const start3 = { ...element, playlist };
    L.Player.play(start3);
    L.Player.playlist(playlist);
    L.Player.callback(() => L.Controller.toggle("content"));
    if (ctx.kind !== "movie") {
      store.progress.set(card.id, { season: ctx.season, episode: ctx.episode, hash: job.hash });
    }
    return "played";
  }
  async function run(card) {
    const L = lampa();
    if (!card || current) return;
    const job = beginJob(MSG.search, (j) => dropUnlessPreloaded(j.hash));
    const finish = job.finish;
    const kind = detectKind(card);
    let params = buildSearchParams(card, { kind }, storageField("parse_lang"));
    try {
      const { movie, ctx } = await resolveTarget(card);
      if (job.cancelled) return;
      params = buildSearchParams(movie, ctx, storageField("parse_lang"));
      const results = await searchTorrents(params);
      if (job.cancelled) return;
      const { chosen } = selectTorrent(results, ctx);
      if (!chosen) {
        finish();
        L.Noty.show(MSG.none);
        return openNativeList(params);
      }
      if (!L.Torserver.url()) throw fail(MSG.noServer);
      L.Loading.setText(MSG.server);
      job.hash = await addTorrent(chosen, movie);
      if (job.cancelled) return dropUnlessPreloaded(job.hash);
      const outcome = await playFiles(job, card, movie, { ...ctx, titleHasSeason: titleHasSeason(chosen.Title) });
      if (outcome === "nofile") {
        dropUnlessPreloaded(job.hash);
        finish();
        L.Noty.show(MSG.noFile);
        return openNativeList(params);
      }
    } catch (err) {
      if (job.cancelled) return;
      dropUnlessPreloaded(job.hash);
      finish();
      const msg = err instanceof PlayError ? err.message : MSG.unknown;
      if (!(err instanceof PlayError)) console.error("lampa-home play", err);
      L.Noty.show(msg);
      openNativeList(params);
    }
  }
  async function startFromHash(hash, card, ctx, title) {
    const L = lampa();
    if (!hash || !card || current) return;
    const job = beginJob(MSG.files, () => {
    });
    job.hash = hash;
    try {
      if (!L.Torserver.url()) throw fail(MSG.noServer);
      const kind = ctx && ctx.kind || detectKind(card);
      let movie = normalizeTitles(card);
      if (!movie.img && movie.poster_path) movie = { ...movie, img: L.Api.img(movie.poster_path) };
      if (kind !== "movie" && !movie.number_of_seasons) {
        movie = { ...movie, number_of_seasons: Math.max(1, ctx && ctx.season || 1) };
      }
      const outcome = await playFiles(job, card, movie, { kind, ...ctx, titleHasSeason: titleHasSeason(title) });
      if (outcome === "nofile") {
        job.finish();
        L.Noty.show(MSG.noFile);
      }
    } catch (err) {
      if (job.cancelled) return;
      job.finish();
      if (!(err instanceof PlayError)) console.error("lampa-home play", err);
      L.Noty.show(err instanceof PlayError ? err.message : MSG.unknown);
    }
  }
  var PLAY_ICON = '<svg viewBox="0 0 28 29" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14.5" r="13" stroke="currentColor" stroke-width="2.7"></circle><path d="M18.0739 13.634C18.7406 14.0189 18.7406 14.9811 18.0739 15.366L11.751 19.0166C11.0843 19.4015 10.251 18.9204 10.251 18.1506L10.251 10.8494C10.251 10.0796 11.0843 9.5985 11.751 9.9834L18.0739 13.634Z" fill="currentColor"></path></svg>';
  function addButton(e) {
    const card = e.data && e.data.movie;
    if (!card || !e.body) return;
    let row = e.body.find(".full-start-new__buttons");
    if (!row.length) row = e.body.find(".full-start__buttons");
    if (!row.length || row.find(".lh-play").length) return;
    const btn = $(`<div class="full-start__button selector lh-play">${PLAY_ICON}<span>\u0418\u0433\u0440\u0430\u0442\u044C</span></div>`);
    btn.on("hover:enter", () => run(card));
    row.first().prepend(btn);
  }
  function onPlayerStart(data) {
    if (!playingId || !data || !data.card || data.card.id !== playingId) return;
    if (!data.torrent_hash || !(data.season > 0) || !(data.episode > 0)) return;
    store.progress.set(playingId, { season: data.season, episode: data.episode, hash: data.torrent_hash });
  }
  function init() {
    const L = lampa();
    L.Listener.follow("full", (e) => {
      if (e.type == "complite") addButton(e);
    });
    if (L.Player.listener) L.Player.listener.follow("start", onPlayerStart);
  }

  // src/catalog.js
  var NAME = "lh_catalog";
  var FILTER_CONTROLLER = "lh_catalog_filter";
  var COLS = 4;
  var FIRST_YEAR = 2010;
  var DECADES = ["2000-2009", "1990-1999"];
  var KIND_TITLES = { movie: "\u0424\u0438\u043B\u044C\u043C\u044B", tv: "\u0421\u0435\u0440\u0438\u0430\u043B\u044B", cartoon: "\u041C\u0443\u043B\u044C\u0442\u0444\u0438\u043B\u044C\u043C\u044B", anime: "\u0410\u043D\u0438\u043C\u0435" };
  var SORT_TITLES = { new: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043D\u043E\u0432\u044B\u0435", rating: "\u041F\u043E \u0440\u0435\u0439\u0442\u0438\u043D\u0433\u0443" };
  var FRESH = { genre: null, year: null, sort: "new" };
  var ROW_PRESETS = {
    movies: { kind: "movie", preset: FRESH },
    horror: { kind: "movie", preset: { ...FRESH, genre: 27 } },
    anime: { kind: "anime", preset: FRESH },
    series: { kind: "tv", preset: FRESH },
    cartoons: { kind: "cartoon", preset: FRESH }
  };
  function presetFor(rowKey) {
    const p = ROW_PRESETS[rowKey];
    return p ? { kind: p.kind, preset: { ...p.preset } } : null;
  }
  function applyPreset(stored, preset) {
    return { ...stored, ...preset || {} };
  }
  var decadeTitle = (range) => range.replace("-", "\u2013");
  function yearOptions(today) {
    const current2 = Number(today.slice(0, 4));
    const out = [{ title: "\u0412\u0441\u0435", value: null }];
    for (let y = current2; y >= FIRST_YEAR; y--) out.push({ title: String(y), value: y });
    for (const d of DECADES) out.push({ title: decadeTitle(d), value: d });
    return out;
  }
  function genreName(kind, id) {
    const g = id != null && genresFor(kind).find((x) => x.id === id);
    return g ? g.title : "\u0432\u0441\u0435";
  }
  function chosenLabels(kind, f) {
    const year = f.year == null ? "\u0432\u0441\u0435" : typeof f.year === "string" ? decadeTitle(f.year) : String(f.year);
    return {
      genre: `\u0416\u0430\u043D\u0440: ${genreName(kind, f.genre)}`,
      year: `\u0413\u043E\u0434: ${year}`,
      sort: SORT_TITLES[f.sort] || SORT_TITLES.new
    };
  }
  function guarded(comp, fn) {
    return (...args) => {
      if (!comp.destroyed) fn(...args);
    };
  }
  function dedupe(results, seen) {
    return results.filter((card) => {
      if (!card || card.id == null) return true;
      if (seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    });
  }
  var nav = () => typeof Navigator !== "undefined" ? Navigator : null;
  var canMove = (dir) => {
    const n = nav();
    return !!(n && n.canmove(dir));
  };
  var move = (dir) => nav().move(dir);
  var EXTRA_PAGES = 3;
  function load(object, kind, f, page, seen, ok, fail3, extra = EXTRA_PAGES) {
    const q = catalogQuery(kind, f, page, todayIso());
    tmdbGet(
      q.url,
      q.params,
      (json) => {
        const results = dedupe((json && json.results || []).filter(hasRussianTitle), seen).map(toWideCard);
        const total = json && json.total_pages || 1;
        if (!results.length && extra > 0 && page < total) {
          object.page = page + 1;
          load(object, kind, f, page + 1, seen, ok, fail3, extra - 1);
          return;
        }
        ok({ ...json, results });
      },
      fail3
    );
  }
  function component(object) {
    const L = lampa();
    const kind = object.kind;
    object.params = { ...object.params || {}, items: { mapping: "grid", cols: COLS } };
    const comp = L.Maker.make("Category", object, (m) => m.toggle(m.MASK.base, "Pagination"));
    const f = store.filters.get(kind);
    const filter = new L.Filter(object);
    const head = document.createElement("div");
    head.className = "lh-catalog__head";
    let lastChip = false;
    const seen = /* @__PURE__ */ new Set();
    function toggleFilter() {
      L.Controller.toggle(FILTER_CONTROLLER);
    }
    function apply(patch) {
      store.filters.set(kind, { ...f, ...patch });
      L.Activity.replace({ page: 1 });
    }
    function pick(title, items, current2, onPick) {
      L.Select.show({
        title,
        items: items.map((it) => ({ title: it.title, value: it.value, selected: it.value === current2 })),
        onSelect: (a) => onPick(a.value),
        onBack: toggleFilter
      });
    }
    function buildFilter() {
      const labels = chosenLabels(kind, f);
      filter.set("filter", [
        { title: labels.genre, lh: "genre" },
        { title: labels.year, lh: "year" }
      ]);
      filter.set("sort", Object.keys(SORT_TITLES).map((key) => ({
        title: SORT_TITLES[key],
        lh: key,
        selected: key === f.sort
      })));
      filter.onBack = toggleFilter;
      filter.onSelect = (type, a) => {
        if (type === "sort") {
          if (a.lh === f.sort) toggleFilter();
          else apply({ sort: a.lh });
        } else if (a.lh === "genre") {
          const genres = [{ title: "\u0412\u0441\u0435", value: null }].concat(
            genresFor(kind).map((g) => ({ title: g.title, value: g.id }))
          );
          pick("\u0416\u0430\u043D\u0440", genres, f.genre, (genre) => apply({ genre }));
        } else {
          pick("\u0413\u043E\u0434", yearOptions(todayIso()), f.year, (year) => apply({ year }));
        }
      };
      const line = filter.render();
      line.find(".filter--search").remove();
      line.find(".filter--filter > div").text(`${labels.genre}, ${labels.year}`).removeClass("hide");
      line.find(".filter--sort > div").text(labels.sort).removeClass("hide");
      line.find(".selector").on("hover:focus", (e) => {
        lastChip = e.target;
      });
      head.append(line[0]);
    }
    const addFilterController = () => L.Controller.add(FILTER_CONTROLLER, {
      toggle: () => {
        L.Controller.collectionSet(head);
        L.Controller.collectionFocus(lastChip, head);
      },
      left: () => {
        if (canMove("left")) move("left");
        else L.Controller.toggle("menu");
      },
      right: () => {
        if (canMove("right")) move("right");
      },
      up: () => L.Controller.toggle("head"),
      down: () => comp.start(),
      back: () => L.Activity.backward()
    });
    comp.use({
      onStart: addFilterController,
      onCreate() {
        this.render(true).classList.add("lh-catalog");
        buildFilter();
        this.render(true).prepend(head);
        this.scroll.minus(head);
        load(object, kind, f, 1, seen, guarded(this, this.build.bind(this)), guarded(this, this.empty.bind(this)));
      },
      onNext(resolve, reject) {
        load(object, kind, f, object.page, seen, guarded(this, resolve.bind(this)), guarded(this, reject.bind(this)));
      },
      onController(controller) {
        controller.up = () => {
          if (canMove("up")) move("up");
          else toggleFilter();
        };
      },
      onEmpty() {
        if (this.empty_class) {
          this.empty_class.use({
            onStart: addFilterController,
            onController: (controller) => {
              controller.up = toggleFilter;
            }
          });
        }
      },
      onInstance(item, data) {
        item.use({
          onCreate() {
            applyPosterClass(item.render(true), data);
          },
          onEnter: L.Router.call.bind(L.Router, "full", data),
          onFocus() {
            L.Background.change(L.Utils.cardImgBackground(data));
          }
        });
      },
      onDestroy() {
        this.destroyed = true;
        filter.destroy();
        head.remove();
      }
    });
    return comp;
  }
  function register() {
    lampa().Component.add(NAME, component);
  }
  function open(kind, preset) {
    if (preset) store.filters.set(kind, applyPreset(store.filters.get(kind), preset));
    lampa().Activity.push({ url: "", component: NAME, kind, title: KIND_TITLES[kind], page: 1, source: "tmdb" });
  }
  function openHistory() {
    const L = lampa();
    const fav = L.Favorite;
    const base = fav && typeof fav.historyActivity === "function" ? fav.historyActivity() : { component: "favorite", type: "history", title: L.Lang.translate("title_history") };
    L.Activity.push({ url: "", page: 1, ...base });
  }
  function openForRow(rowKey) {
    if (rowKey === "history") return openHistory();
    const p = presetFor(rowKey);
    if (p) open(p.kind, p.preset);
  }

  // src/templates.js
  var BANNER = "lh_banner";
  var BANNER_HTML = `<div class="lh-banner" style="background-image:url('{backdrop}')">
  <div class="lh-banner__shade"></div>
  <div class="lh-banner__body">
    <div class="lh-banner__title">{title}</div>
    <div class="lh-banner__meta">{meta}</div>
    <div class="lh-banner__overview">{overview}</div>
    <div class="lh-banner__buttons">
      <div class="lh-banner__button lh-banner__play selector">&#9654; \u0418\u0433\u0440\u0430\u0442\u044C</div>
      <div class="lh-banner__button lh-banner__more selector">\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435</div>
    </div>
  </div>
</div>`;
  function esc(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/\$/g, "&#36;").replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
  }
  function genreMap(tmdbGenres, translate) {
    const map = {};
    if (!tmdbGenres) return map;
    ["movie", "tv"].forEach((type) => {
      (tmdbGenres[type] || []).forEach((g) => {
        if (map[g.id]) return;
        const name = String(translate(g.title) || "");
        if (name) map[g.id] = name.charAt(0).toUpperCase() + name.slice(1);
      });
    });
    return map;
  }
  function truncate(text, max) {
    const str = String(text == null ? "" : text);
    if (str.length <= max) return str;
    const head = str.slice(0, max - 3);
    const space = head.lastIndexOf(" ");
    const cut = space > 0 ? head.slice(0, space) : str.slice(0, max - 1);
    return cut.replace(/[\s,.;:—-]+$/, "") + "\u2026";
  }
  function bannerVars(card, { img, genres = {} }) {
    const date = card.release_date || card.first_air_date || "";
    const genre = (card.genre_ids || []).map((id) => genres[id]).find(Boolean);
    const rating = Number(card.vote_average) > 0 ? "\u2605 " + Number(card.vote_average).toFixed(1) : "";
    const meta = [date.slice(0, 4), genre, rating].filter(Boolean).join(" \xB7 ");
    const path = card.backdrop_path || card.poster_path;
    return {
      title: esc(card.title || card.name),
      meta: esc(meta),
      overview: esc(truncate(card.overview, 180)),
      backdrop: path ? esc(img(path, "w1280")) : ""
    };
  }
  function register2() {
    lampa().Template.add(BANNER, BANNER_HTML);
  }

  // src/home.js
  var NAME2 = "lh_home";
  var TITLE = "\u0413\u043B\u0430\u0432\u043D\u0430\u044F";
  var MARKER = "lh_home_live";
  function wantsBadge(rowKey, cardData) {
    if (rowKey === "anime" || rowKey === "series") return true;
    return rowKey === "history" && !!cardData.original_name;
  }
  function bannerCard(rows) {
    const row = rows.find((r) => r.params.lh_row === "movies") || rows[0];
    return row && pickBannerCard(row.results, storageField("lh_banner_random") === true);
  }
  function createBanner(comp, card) {
    const L = lampa();
    const vars = bannerVars(card, {
      img: L.Api.img,
      genres: genreMap(L.Api.sources.tmdb.genres, L.Lang.translate)
    });
    const html = L.Template.get(BANNER, vars);
    const el = html[0];
    let last = false;
    html.find(".selector").on("hover:focus", function() {
      last = this;
      comp.scroll.update(el);
      L.Background.change(L.Utils.cardImgBackground(card));
    });
    html.find(".lh-banner__play").on("hover:enter", () => run(card));
    html.find(".lh-banner__more").on("hover:enter", () => L.Router.call("full", card));
    return {
      toggle() {
        L.Controller.add("lh_banner", {
          link: this,
          toggle: () => {
            L.Controller.collectionSet(el);
            L.Controller.collectionFocus(last, el);
          },
          left: () => {
            if (Navigator.canmove("left")) Navigator.move("left");
            else L.Controller.toggle("menu");
          },
          right: () => {
            if (Navigator.canmove("right")) Navigator.move("right");
          },
          up: () => comp.emit("up"),
          down: () => comp.emit("down"),
          back: () => comp.emit("back")
        });
        L.Controller.toggle("lh_banner");
      },
      render: (js) => js ? el : html,
      destroy: () => html.remove()
    };
  }
  function buildRows(loaded) {
    return loaded.filter((row) => row.results.length).map((row) => ({
      title: row.title,
      results: row.results.map(toWideCard),
      total_pages: row.total_pages || 1,
      params: { items: { view: 6 }, lh_row: row.rowKey }
    }));
  }
  function fallbackToNative(err) {
    const L = lampa();
    console.error("lampa-home home", err);
    L.Noty.show("Lampa Home: \u043E\u0448\u0438\u0431\u043A\u0430, \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u044E \u0448\u0442\u0430\u0442\u043D\u0443\u044E \u0433\u043B\u0430\u0432\u043D\u0443\u044E");
    const active = L.Activity.active();
    if (!active || active.component !== NAME2) return;
    L.Activity.replace({ component: "main", title: L.Lang.translate("title_main") });
  }
  function component2(object) {
    const L = lampa();
    const comp = L.Maker.make("Main", object);
    comp[MARKER] = true;
    comp.use({
      onCreate() {
        this.render(true).classList.add("lh-home");
        const today = todayIso();
        Promise.all(ROWS.map((key) => loadRow(key, today))).then((loaded) => {
          if (this.destroyed) return;
          const rows = buildRows(loaded);
          if (!rows.length) return this.empty();
          const bcard = storageField("lh_banner") === false ? null : bannerCard(rows);
          const banner = bcard && createBanner(this, bcard);
          if (banner) {
            this.render(true).querySelector(".scroll__body").prepend(banner.render(true));
            this.items.push(banner);
          }
          this.build(rows);
        }).catch((e) => {
          if (!this.destroyed) fallbackToNative(e);
        });
      },
      onNext(resolve, reject) {
        reject.call(this);
      },
      onDestroy() {
        this.destroyed = true;
      },
      onInstance(item, data) {
        const rowKey = data.params && data.params.lh_row;
        item.use({
          onMore: () => openForRow(rowKey),
          onInstance(card, cardData) {
            card.use({
              onCreate() {
                applyPosterClass(card.render(true), cardData);
              },
              onEnter: L.Router.call.bind(L.Router, "full", cardData),
              onVisible() {
                if (this.lhBadged || !wantsBadge(rowKey, cardData)) return;
                this.lhBadged = true;
                tvStatus(cardData.id, todayIso()).then((status2) => {
                  if (!this.destroyed) applyBadge(card.render(true), status2);
                });
              },
              onDestroy() {
                this.destroyed = true;
              },
              onFocus() {
                L.Background.change(L.Utils.cardImgBackground(cardData));
              }
            });
          }
        });
      }
    });
    return comp;
  }
  function register3() {
    lampa().Component.add(NAME2, component2);
  }
  function open2() {
    lampa().Activity.push({ component: NAME2, title: TITLE, url: "", page: 1, source: "tmdb" });
  }
  var COMPONENT = NAME2;
  var HOME_TITLE = TITLE;

  // src/downloads.js
  var NAME3 = "lh_downloads";
  var TITLE2 = "\u0421\u043A\u0430\u0447\u0430\u043D\u043D\u043E\u0435";
  var HELPER_DEFAULT = "http://192.168.31.7:8091";
  var COLS2 = 4;
  var POLL_MS = 5e3;
  var FILES_EVERY_MS2 = 2e3;
  var FILES_TRIES2 = 30;
  var PRELOAD_ABORT_MS = 3e3;
  var HELPER_TIMEOUT_MS = 1e4;
  var LIST_TIMEOUT_MS = 8e3;
  var MSG2 = {
    search: "\u0418\u0449\u0443 \u0440\u0430\u0437\u0434\u0430\u0447\u0443\u2026",
    server: "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E \u0432 TorrServer\u2026",
    files: "\u0416\u0434\u0443 \u0441\u043F\u0438\u0441\u043E\u043A \u0444\u0430\u0439\u043B\u043E\u0432\u2026",
    started: "\u0417\u0430\u043A\u0430\u0447\u043A\u0430 \u043D\u0430\u0447\u0430\u0442\u0430",
    none: "\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0435\u0439 \u0440\u0430\u0437\u0434\u0430\u0447\u0438 \u043D\u0435 \u043D\u0430\u0448\u0451\u043B",
    noFile: "\u041D\u0443\u0436\u043D\u043E\u0433\u043E \u0444\u0430\u0439\u043B\u0430 \u0432 \u0440\u0430\u0437\u0434\u0430\u0447\u0435 \u043D\u0435 \u043D\u0430\u0448\u0451\u043B",
    parser: "\u041F\u0430\u0440\u0441\u0435\u0440 \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B",
    noServer: "TorrServer \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D",
    torrserver: "TorrServer \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
    noFiles: "TorrServer \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B \u0441\u043F\u0438\u0441\u043E\u043A \u0444\u0430\u0439\u043B\u043E\u0432",
    helper: "\u041F\u043E\u043C\u043E\u0449\u043D\u0438\u043A \u043D\u0430 \u041F\u041A \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
    removed: "\u0423\u0434\u0430\u043B\u0435\u043D\u043E \u0441 \u0434\u0438\u0441\u043A\u0430",
    removing: "\u0423\u0434\u0430\u043B\u044F\u044E \u0441 \u0434\u0438\u0441\u043A\u0430\u2026",
    replaced: "\u041F\u0440\u0435\u0436\u043D\u044F\u044F \u0437\u0430\u043A\u0430\u0447\u043A\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0430",
    replaceFailed: "\u041F\u043E\u043C\u043E\u0449\u043D\u0438\u043A \u043D\u0430 \u041F\u041A \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D: \u043F\u0440\u0435\u0436\u043D\u044F\u044F \u0437\u0430\u043A\u0430\u0447\u043A\u0430 \u043D\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u0430, \u043D\u043E\u0432\u0430\u044F \u043D\u0435 \u043D\u0430\u0447\u0430\u0442\u0430",
    confirm: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441 \u0434\u0438\u0441\u043A\u0430?",
    missing: "\u0423\u0434\u0430\u043B\u0435\u043D\u043E \u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435",
    forget: "\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430",
    forgotten: "\u0423\u0431\u0440\u0430\u043D\u043E \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430",
    offline: "TorrServer \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D, \u043F\u043E\u043A\u0430\u0437\u0430\u043D \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A"
  };
  var SNAPSHOT_FIELDS = [
    "id",
    "title",
    "name",
    "original_title",
    "original_name",
    "original_language",
    "backdrop_path",
    "poster_path",
    "genre_ids",
    "origin_country",
    "release_date",
    "first_air_date",
    "runtime",
    "number_of_seasons"
  ];
  function preloadProgress({ loaded_size, file_stats, index }) {
    const file = (file_stats || []).find((f) => f.id === index);
    const size = file && file.length || 0;
    const loaded = loaded_size || 0;
    if (!size) return { percent: 0, done: false };
    const done = loaded >= size;
    return { percent: done ? 100 : Math.min(99, Math.floor(loaded / size * 100)), done };
  }
  function cardSnapshot(card) {
    const out = {};
    for (const key of SNAPSHOT_FIELDS) {
      if (card[key] !== void 0 && card[key] !== null) out[key] = card[key];
    }
    if (!out.genre_ids && Array.isArray(card.genres)) out.genre_ids = card.genres.map((g) => g && g.id).filter((id) => id != null);
    return out;
  }
  function replacePlan(existing, newHash) {
    if (!existing || !existing.hash) return "new";
    return existing.hash === newHash ? "same" : "replace";
  }
  function badgeLabel(progress) {
    if (!progress) return "";
    if (progress.missing) return MSG2.missing;
    return progress.done ? "\u0421\u043A\u0430\u0447\u0430\u043D\u043E" : `\u041A\u0430\u0447\u0430\u0435\u0442\u0441\u044F ${progress.percent} %`;
  }
  var entryKey = (card) => (card.original_name || card.name ? "tv" : "movie") + ":" + card.id;
  function preloadData(snapshot, meta) {
    return JSON.stringify({ lampa: true, movie: snapshot, lh_preload: meta });
  }
  var parseData = (data) => {
    if (data && typeof data === "object") return data;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  };
  function parseDownloadEntries(list) {
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const t of list) {
      if (!t || !t.hash) continue;
      const data = parseData(t.data);
      const meta = data && data.lh_preload;
      const card = data && data.movie;
      if (!meta || typeof meta !== "object" || !card || typeof card !== "object" || card.id == null) continue;
      out.push({
        key: entryKey(card),
        hash: t.hash,
        card,
        index: typeof meta.index === "number" ? meta.index : void 0,
        season: meta.season,
        episode: meta.episode,
        absolute: meta.absolute,
        kind: meta.kind,
        added: Number(meta.added) || (Number(t.timestamp) || 0) * 1e3,
        size: t.torrent_size,
        title: String(t.title || "").replace(/^\[LAMPA\]\s*/, "")
      });
    }
    return out.sort((a, b) => b.added - a.added);
  }
  function legacyEntries(list, cached) {
    if (!Array.isArray(list) || !Array.isArray(cached)) return [];
    const marked = new Set(parseDownloadEntries(list).map((e) => e.hash));
    const onServer = new Map(list.filter((t) => t && t.hash).map((t) => [t.hash, t]));
    return cached.filter((e) => e && e.hash && e.card && e.key && onServer.has(e.hash) && !marked.has(e.hash)).map((e) => ({ ...e, server: onServer.get(e.hash) }));
  }
  function findExisting(entries, key, hash) {
    const same = (entries || []).filter((e) => e && e.key === key);
    return same.find((e) => e.hash === hash) || same[0] || null;
  }
  var DlError = class extends Error {
  };
  var fail2 = (msg) => new DlError(msg);
  function tsBase() {
    const L = lampa();
    const url = L.Torserver.url();
    if (!url) throw fail2(MSG2.noServer);
    return url.replace(/\/+$/, "");
  }
  function tsHeaders() {
    const L = lampa();
    const headers = { "Content-Type": "application/json" };
    if (storageField("torrserver_auth")) {
      headers.Authorization = "Basic " + btoa(unescape(encodeURIComponent(
        L.Storage.get("torrserver_login", "") + ":" + L.Storage.get("torrserver_password", "")
      )));
    }
    return headers;
  }
  async function tsTorrents(body, timeoutMs) {
    const url = tsBase() + "/torrents";
    const ctrl = timeoutMs && typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctrl && setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(url, { method: "POST", headers: tsHeaders(), body: JSON.stringify(body), signal: ctrl && ctrl.signal });
    } catch (e) {
      throw fail2(MSG2.torrserver);
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const err = fail2(MSG2.torrserver);
      err.status = res.status;
      throw err;
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
  function firePreload(hash, index) {
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctrl && setTimeout(() => ctrl.abort(), PRELOAD_ABORT_MS);
    fetch(`${tsBase()}/stream?link=${hash}&index=${index}&preload`, { headers: tsHeaders(), signal: ctrl && ctrl.signal }).then((res) => res.body && res.body.cancel && res.body.cancel()).catch(() => {
    }).finally(() => clearTimeout(timer));
  }
  async function waitFiles(hash, job) {
    for (let i = 0; i < FILES_TRIES2 && !job.cancelled; i++) {
      const json = await tsTorrents({ action: "get", hash }).catch(() => null);
      if (json && json.file_stats && json.file_stats.length) return json.file_stats;
      await new Promise((r) => setTimeout(r, FILES_EVERY_MS2));
    }
    if (job.cancelled) return null;
    throw fail2(MSG2.noFiles);
  }
  function tsRem(hash) {
    return tsTorrents({ action: "rem", hash }).catch(() => {
    });
  }
  async function helperDelete(hash) {
    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctrl && setTimeout(() => ctrl.abort(), HELPER_TIMEOUT_MS);
    try {
      const res = await fetch(helperUrl() + "/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash }),
        signal: ctrl && ctrl.signal
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json || !json.ok) throw new Error(json && json.error || String(res.status));
    } finally {
      clearTimeout(timer);
    }
  }
  var deviceName = () => String(lampa().Storage.get("lh_device", "") || "lampa");
  function helperUrl() {
    const v = lampa().Storage.get("lh_helper_url", HELPER_DEFAULT);
    return String(v || HELPER_DEFAULT).trim().replace(/\/+$/, "");
  }
  var busy = false;
  var cacheEntry = (e) => ({
    hash: e.hash,
    index: e.index,
    title: e.title,
    kind: e.kind,
    season: e.season,
    episode: e.episode,
    absolute: e.absolute,
    size: e.size,
    added: e.added,
    card: e.card
  });
  function syncCache(entries) {
    const map = {};
    for (const e of [...entries].reverse()) map[e.key] = cacheEntry(e);
    store.preload.replace(map);
  }
  async function listDownloads() {
    const list = await tsTorrents({ action: "list" }, LIST_TIMEOUT_MS);
    const entries = parseDownloadEntries(list);
    const legacy = legacyEntries(list, cachedDownloads());
    for (const e of legacy) {
      const { server, ...entry } = e;
      const meta = {
        index: entry.index,
        kind: entry.kind,
        season: entry.season,
        episode: entry.episode,
        absolute: entry.absolute,
        added: entry.added || Date.now(),
        by: deviceName()
      };
      const fields = { title: server.title || "", poster: server.poster || "", category: server.category || "" };
      tsTorrents({ action: "set", hash: entry.hash, ...fields, data: preloadData(entry.card, meta) }).catch(() => {
      });
      entries.push({ ...entry, size: server.torrent_size });
    }
    entries.sort((a, b) => (b.added || 0) - (a.added || 0));
    syncCache(entries);
    return entries;
  }
  function cachedDownloads() {
    return store.preload.all().filter((e) => e.card && e.hash).map(({ cardId, ...e }) => ({ ...e, key: cardId }));
  }
  async function preload(card) {
    const L = lampa();
    if (!card || busy || isBusy()) return;
    busy = true;
    const job = { cancelled: false, hash: null, kicked: false };
    let before = [];
    const dropAdded = () => {
      if (!job.hash || job.kicked) return;
      if (before.some((e) => e.hash === job.hash)) return;
      if (store.preload.all().some((e) => e.hash === job.hash)) return;
      tsRem(job.hash);
    };
    const finish = () => {
      busy = false;
      L.Loading.stop();
    };
    L.Loading.start(() => {
      job.cancelled = true;
      dropAdded();
      finish();
    }, MSG2.search);
    try {
      tsBase();
      const { movie, ctx } = await resolveTarget(card);
      if (job.cancelled) return;
      const results = await searchTorrents(buildSearchParams(movie, ctx, storageField("parse_lang")));
      if (job.cancelled) return;
      const { chosen } = selectTorrent(results, ctx);
      if (!chosen) throw fail2(MSG2.none);
      L.Loading.setText(MSG2.server);
      before = await listDownloads().catch(() => cachedDownloads());
      if (job.cancelled) return;
      const snapshot = cardSnapshot(movie);
      const title = String(chosen.Title).replace("??", "?");
      const meta = {
        kind: ctx.kind,
        season: ctx.season,
        episode: ctx.episode,
        absolute: ctx.absolute,
        added: Date.now(),
        by: deviceName()
      };
      const fields = {
        title: "[LAMPA] " + title,
        poster: movie.poster_path ? L.Api.img(movie.poster_path) : "",
        category: ctx.kind === "movie" ? "movie" : "tv"
      };
      const added = await tsTorrents({
        action: "add",
        link: chosen.MagnetUri || chosen.Link,
        ...fields,
        data: preloadData(snapshot, meta),
        save_to_db: true
      });
      const hash = added && added.hash;
      if (!hash) throw fail2(MSG2.torrserver);
      job.hash = hash;
      if (job.cancelled) return dropAdded();
      L.Loading.setText(MSG2.files);
      const files = await waitFiles(hash, job);
      if (job.cancelled || !files) return;
      const file = pickFile(files, { ...ctx, titleHasSeason: titleHasSeason(chosen.Title) }, fileInfos(files, movie));
      if (!file) throw fail2(MSG2.noFile);
      const key = entryKey(movie);
      const existing = findExisting(before, key, hash);
      let replaced = false;
      if (replacePlan(existing, hash) === "replace") {
        L.Loading.setText(MSG2.removing);
        try {
          await helperDelete(existing.hash);
        } catch (e) {
          throw fail2(MSG2.replaceFailed);
        }
        store.preload.remove(key);
        replaced = true;
      }
      if (job.cancelled) return;
      job.kicked = true;
      firePreload(hash, file.id);
      meta.index = file.id;
      tsTorrents({ action: "set", hash, ...fields, data: preloadData(snapshot, meta) }).catch(() => {
      });
      store.preload.set(key, cacheEntry({ ...meta, hash, title: chosen.Title, size: file.length, card: snapshot }));
      finish();
      L.Noty.show(replaced ? `${MSG2.replaced}. ${MSG2.started}` : MSG2.started);
    } catch (err) {
      if (job.cancelled) return;
      dropAdded();
      finish();
      if (!(err instanceof DlError)) console.error("lampa-home preload", err);
      L.Noty.show(err instanceof DlError ? err.message : MSG2.torrserver);
    }
  }
  async function status(hash, index) {
    let json;
    try {
      json = await tsTorrents({ action: "get", hash });
    } catch (err) {
      if (err && err.status === 404) return { loaded: 0, size: 0, percent: 0, done: false, missing: true };
      throw err;
    }
    const stats = json && json.file_stats || [];
    const id = index != null ? index : (stats.reduce((b, f) => (f.length || 0) > (b && b.length || 0) ? f : b, null) || {}).id;
    const p = preloadProgress({ loaded_size: json && json.loaded_size, file_stats: stats, index: id });
    const file = stats.find((f) => f.id === id);
    return { loaded: json && json.loaded_size || 0, size: file && file.length || 0, ...p };
  }
  async function remove(entry) {
    const L = lampa();
    if (!entry || !entry.hash) return true;
    L.Loading.start(() => L.Loading.stop(), MSG2.removing);
    try {
      await helperDelete(entry.hash);
    } catch (e) {
      L.Loading.stop();
      L.Noty.show(MSG2.helper);
      return false;
    }
    L.Loading.stop();
    store.preload.remove(entry.key);
    L.Noty.show(MSG2.removed);
    return true;
  }
  async function forget(entry) {
    if (!entry) return;
    if (entry.hash) await tsRem(entry.hash);
    store.preload.remove(entry.key);
    lampa().Noty.show(MSG2.forgotten);
  }
  var pollQueue = createQueue(2);
  function component3(object) {
    const L = lampa();
    object.params = { ...object.params || {}, items: { mapping: "grid", cols: COLS2 } };
    const comp = L.Maker.make("Category", object, (m) => m.MASK.base);
    const badges = /* @__PURE__ */ new Map();
    let timer = null;
    let pending = 0;
    const isActive = () => {
      const a = L.Activity.active();
      return !!a && a.component === NAME3 && !comp.destroyed;
    };
    function refresh(first) {
      if (!first && !isActive() || pending) return;
      badges.forEach(({ el, entry }) => {
        pending++;
        pollQueue(() => status(entry.hash, entry.index)).then((p) => {
          const state = badges.get(entry.hash);
          if (state) state.missing = !!p.missing;
          el.textContent = badgeLabel(p);
          el.classList.toggle("lh-dl-badge--done", p.done);
        }).catch(() => {
          el.textContent = "\u041D\u0435\u0442 \u0441\u0432\u044F\u0437\u0438";
        }).finally(() => {
          pending--;
        });
      });
    }
    const reload = () => {
      if (isActive()) L.Activity.replace();
    };
    function ask(title, items, onPick) {
      const enabled = L.Controller.enabled().name;
      L.Select.show({
        title,
        items: [...items, { title: "\u041E\u0442\u043C\u0435\u043D\u0430" }],
        onSelect: (a) => {
          L.Controller.toggle(enabled);
          onPick(a);
        },
        onBack: () => L.Controller.toggle(enabled)
      });
    }
    function offerForget(entry) {
      ask(MSG2.helper, [{ title: MSG2.forget, forget: true }], (a) => {
        if (a.forget) forget(entry).then(reload);
      });
    }
    function confirmRemove(entry) {
      const state = badges.get(entry.hash);
      if (state && state.missing) {
        ask(MSG2.missing, [{ title: MSG2.forget, forget: true }, { title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441 \u0434\u0438\u0441\u043A\u0430", remove: true }], (a) => {
          if (a.forget) {
            forget(entry).then(reload);
          } else if (a.remove) {
            remove(entry).then((ok) => ok ? reload() : offerForget(entry));
          }
        });
        return;
      }
      ask(MSG2.confirm, [{ title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", remove: true }], (a) => {
        if (!a.remove) return;
        remove(entry).then((ok) => ok ? reload() : offerForget(entry));
      });
    }
    comp.use({
      onCreate() {
        this.render(true).classList.add("lh-catalog", "lh-downloads");
        const show = guarded(this, (entries) => {
          const results = entries.map((e) => {
            const card = toWideCard(e.card);
            card.lh_entry = e;
            return card;
          });
          if (!results.length) return this.empty();
          this.build({ results, total_pages: 1 });
          refresh(true);
          timer = setInterval(refresh, POLL_MS);
        });
        listDownloads().catch((err) => {
          if (!(err instanceof DlError)) console.error("lampa-home downloads", err);
          L.Noty.show(MSG2.offline);
          return cachedDownloads();
        }).then(show);
      },
      onInstance(item, data) {
        const entry = data.lh_entry;
        item.use({
          onCreate() {
            const el = item.render(true);
            applyPosterClass(el, data);
            item.menu_list = [];
            const view = el.querySelector(".card__view");
            if (view) {
              const badge = document.createElement("div");
              badge.className = "lh-dl-badge";
              badge.textContent = "\u2026";
              view.appendChild(badge);
              badges.set(entry.hash, { el: badge, entry });
            }
            el.addEventListener("hover:long", guarded(comp, () => confirmRemove(entry)));
          },
          onEnter: guarded(comp, () => {
            const state = badges.get(entry.hash);
            if (state && state.missing) return confirmRemove(entry);
            const { card, hash, index, kind, season, episode, absolute, title } = entry;
            startFromHash(hash, card, { kind, season, episode, absolute, index }, title);
          }),
          onFocus() {
            L.Background.change(L.Utils.cardImgBackground(data));
          }
        });
      },
      onDestroy() {
        this.destroyed = true;
        clearInterval(timer);
        badges.clear();
      }
    });
    return comp;
  }
  function register4() {
    lampa().Component.add(NAME3, component3);
  }
  function open3() {
    lampa().Activity.push({ url: "", component: NAME3, title: TITLE2, page: 1 });
  }
  function init2() {
    const L = lampa();
    L.Listener.follow("full", (e) => {
      if (e.type !== "options" || !Array.isArray(e.options)) return;
      const card = e.link && e.link.card || e.data && e.data.movie;
      if (!card || !card.id) return;
      e.options.push({ title: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0437\u0430\u0440\u0430\u043D\u0435\u0435", onSelect: () => preload(card) });
    });
  }

  // src/menu.js
  var CATALOG_ACTIONS = ["movie", "tv", "cartoon", "anime"];
  var DOWNLOADS_ACTION = "lh_downloads";
  var KEEP_ACTIONS = ["main", "movie", "tv", "cartoon", "anime", "settings", DOWNLOADS_ACTION];
  var DOWNLOADS_ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 19h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var HIDE_CLASS = "lh-hide";
  function shouldHide(action) {
    return !KEEP_ACTIONS.includes(action);
  }
  function hideItems(root) {
    if (!root || typeof root.find !== "function") return;
    root.find(".menu__item").each(function() {
      const el = window.$(this);
      if (shouldHide(el.attr("data-action"))) el.addClass(HIDE_CLASS);
    });
  }
  function needsSwap(active) {
    if (!active) return false;
    if (active.component === "main") return true;
    if (active.component === COMPONENT) {
      const comp = active.activity && active.activity.component;
      return !(comp && comp[MARKER]);
    }
    return false;
  }
  function swapStart() {
    const L = lampa();
    const active = L.Activity.active();
    if (!needsSwap(active)) return false;
    const old = active.activity;
    if (old && typeof old.pause === "function") old.pause();
    L.Activity.replace({ component: COMPONENT, title: HOME_TITLE, source: "tmdb" });
    return true;
  }
  function addDownloadsItem() {
    const L = lampa();
    if (!L.Menu || typeof L.Menu.addButton !== "function") return;
    if (window.$('.menu .menu__item[data-action="' + DOWNLOADS_ACTION + '"]').length) return;
    const item = L.Menu.addButton(DOWNLOADS_ICON, TITLE2, () => open3());
    if (item && item.attr) item.attr("data-action", DOWNLOADS_ACTION);
  }
  function init3() {
    const L = lampa();
    addDownloadsItem();
    L.Listener.follow("menu", (e) => {
      if (e.type !== "action") return;
      if (e.action === "main") {
        e.abort();
        open2();
      } else if (CATALOG_ACTIONS.includes(e.action)) {
        e.abort();
        open(e.action);
      }
    });
    const $2 = window.$;
    const watch = (root) => {
      hideItems(root);
      if (typeof MutationObserver === "function" && root[0]) {
        new MutationObserver(() => hideItems(root)).observe(root[0], { childList: true, subtree: true });
      }
    };
    L.Listener.follow("menu", (e) => {
      if (e.type === "start") watch(e.body);
    });
    L.Listener.follow("app", (e) => {
      if (e.type === "ready") hideItems($2(".menu"));
    });
    if ($2(".menu").length) watch($2(".menu"));
    if (L.Activity.active()) {
      swapStart();
    } else {
      const once = (e) => {
        if (e.type !== "start") return;
        L.Listener.remove("activity", once);
        setTimeout(swapStart, 0);
      };
      L.Listener.follow("activity", once);
    }
  }

  // src/notify.js
  var TOAST_MS = 5e3;
  var START_DELAY_MS = 3e3;
  function diffNewEpisodes(items, seenGetter) {
    const out = [];
    for (const { card, status: status2 } of items) {
      if (!status2 || !status2.airing) continue;
      const seen = seenGetter(card.id);
      if (seen != null && status2.aired > seen) out.push({ id: card.id, aired: status2.aired, card });
    }
    return out;
  }
  function shouldMark(items) {
    return items.some((i) => i.status);
  }
  function toastLines(newItems) {
    const lines = newItems.slice(0, LIMITS.maxToasts).map((n) => `\u0412\u044B\u0448\u043B\u0430 ${n.aired} \u0441\u0435\u0440\u0438\u044F: ${n.card.name || n.card.original_name || ""}`);
    if (newItems.length > LIMITS.maxToasts) lines.push(`\u0438 \u0435\u0449\u0451 ${newItems.length - LIMITS.maxToasts}`);
    return lines;
  }
  function candidateKind(card) {
    if (!card || card.id == null || !card.original_name) return null;
    if (detectKind(card) === "anime") return "anime";
    const jp = (card.origin_country || []).includes("JP");
    return jp && !genreIds(card).length ? "maybe" : null;
  }
  function confirmAnime(items) {
    return items.filter(({ card, status: status2 }) => candidateKind(card) === "anime" || !!(status2 && status2.animation));
  }
  function candidates() {
    const byId = /* @__PURE__ */ new Map();
    for (const type of ["history", "book"]) {
      let list = [];
      try {
        list = favoriteGet({ type });
      } catch (e) {
        list = [];
      }
      for (const card of list || []) {
        if (candidateKind(card) && !byId.has(card.id)) byId.set(card.id, card);
      }
    }
    return [...byId.values()];
  }
  async function checkNewEpisodes() {
    const loaded = await Promise.all(
      candidates().map((card) => tvStatus(card.id).then((status2) => ({ card, status: status2 }), () => ({ card, status: null })))
    );
    const items = confirmAnime(loaded);
    const fresh = diffNewEpisodes(items, (id) => store.seen.get(id));
    for (const { card, status: status2 } of items) if (status2) store.seen.set(card.id, status2.aired);
    return { fresh, learned: shouldMark(loaded) };
  }
  function showSequential(lines) {
    lines.forEach((line, i) => setTimeout(() => lampa().Noty.show(line, { time: TOAST_MS }), i * TOAST_MS));
  }
  async function check() {
    try {
      if (storageField("lh_notify") === false) return;
      if (!store.notify.due()) return;
      const { fresh, learned } = await checkNewEpisodes();
      if (!learned) return;
      store.notify.mark();
      showSequential(toastLines(fresh));
    } catch (e) {
      console.error("lampa-home notify", e);
    }
  }
  function start() {
    try {
      setTimeout(check, START_DELAY_MS);
    } catch (e) {
    }
  }

  // src/settings.js
  var COMPONENT2 = "lh_settings";
  var ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  function resetCache() {
    storage.set(STORAGE_KEYS.tvcache, {});
    storage.set(STORAGE_KEYS.seen, {});
    noty("\u041E\u0447\u0438\u0449\u0435\u043D\u043E");
  }
  function register5() {
    const api = lampa().SettingsApi;
    api.addComponent({ component: COMPONENT2, name: "Lampa Home", icon: ICON });
    api.addParam({
      component: COMPONENT2,
      param: { name: "lh_banner", type: "trigger", default: true },
      field: { name: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0431\u0430\u043D\u043D\u0435\u0440", description: "\u0411\u043E\u043B\u044C\u0448\u043E\u0439 \u0431\u0430\u043D\u043D\u0435\u0440 \u0441\u0432\u0435\u0440\u0445\u0443 \u0433\u043B\u0430\u0432\u043D\u043E\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B" }
    });
    api.addParam({
      component: COMPONENT2,
      param: { name: "lh_banner_random", type: "trigger", default: false },
      field: { name: "\u0421\u043B\u0443\u0447\u0430\u0439\u043D\u044B\u0439 \u0431\u0430\u043D\u043D\u0435\u0440", description: "\u0421\u043B\u0443\u0447\u0430\u0439\u043D\u044B\u0439 \u0444\u0438\u043B\u044C\u043C \u0438\u0437 \u043F\u0435\u0440\u0432\u044B\u0445 \u043F\u044F\u0442\u0438 \u0432\u043C\u0435\u0441\u0442\u043E \u043F\u0435\u0440\u0432\u043E\u0433\u043E" }
    });
    api.addParam({
      component: COMPONENT2,
      param: { name: "lh_notify", type: "trigger", default: true },
      field: { name: "\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E \u043D\u043E\u0432\u044B\u0445 \u0441\u0435\u0440\u0438\u044F\u0445", description: "\u041F\u0440\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0435 \u0441\u043E\u043E\u0431\u0449\u0430\u0442\u044C \u043E \u043D\u043E\u0432\u044B\u0445 \u0441\u0435\u0440\u0438\u044F\u0445 \u043F\u0440\u043E\u0441\u043C\u0430\u0442\u0440\u0438\u0432\u0430\u0435\u043C\u043E\u0433\u043E \u0430\u043D\u0438\u043C\u0435" }
    });
    api.addParam({
      component: COMPONENT2,
      param: { name: "lh_helper_url", type: "input", values: "", placeholder: HELPER_DEFAULT, default: HELPER_DEFAULT },
      field: { name: "\u0410\u0434\u0440\u0435\u0441 \u043F\u043E\u043C\u043E\u0449\u043D\u0438\u043A\u0430 \u043D\u0430 \u041F\u041A", description: "\u041D\u0443\u0436\u0435\u043D, \u0447\u0442\u043E\u0431\u044B \u0443\u0434\u0430\u043B\u044F\u0442\u044C \u0441\u043A\u0430\u0447\u0430\u043D\u043D\u043E\u0435 \u0441 \u0434\u0438\u0441\u043A\u0430 (helper/ts-clean.js)" }
    });
    api.addParam({
      component: COMPONENT2,
      param: { name: "lh_reset_cache", type: "button" },
      field: { name: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u043A\u044D\u0448", description: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u043A\u044D\u0448 \u0441\u0442\u0430\u0442\u0443\u0441\u043E\u0432 \u0441\u0435\u0440\u0438\u0430\u043B\u043E\u0432 \u0438 \u043E\u0442\u043C\u0435\u0442\u043A\u0438 \u043E \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u043D\u044B\u0445 \u0441\u0435\u0440\u0438\u044F\u0445" },
      onChange: resetCache
    });
  }

  // src/index.js
  function guard() {
    const L = window.Lampa;
    return !!(L && L.Maker && L.Activity && L.Api && L.Api.sources && L.Api.sources.tmdb && L.Api.sources.tmdb.get && L.Parser && L.Torserver && L.Player && L.Loading && L.SettingsApi && L.Template && L.Select && L.Favorite && L.Menu);
  }
  function injectCss(text) {
    if (document.getElementById("lh-style")) return;
    const style = document.createElement("style");
    style.id = "lh-style";
    style.textContent = text;
    document.head.appendChild(style);
  }
  var STEPS = [
    ["styles", () => injectCss(styles_default)],
    ["storage", () => store.prune()],
    ["templates", () => register2()],
    ["settings", () => register5()],
    ["home", () => register3()],
    ["catalog", () => register()],
    ["downloads", () => register4()],
    ["play", () => init()],
    ["downloads-menu", () => init2()],
    ["menu", () => init3()],
    ["notify", () => start()]
  ];
  function init4() {
    for (const [name, step] of STEPS) {
      try {
        step();
      } catch (e) {
        console.error("lampa-home", name, e);
        Lampa.Noty.show("Lampa Home: \u043E\u0448\u0438\u0431\u043A\u0430 \u043C\u043E\u0434\u0443\u043B\u044F " + name);
      }
    }
  }
  function start2() {
    if (!guard()) {
      Lampa.Noty.show("Lampa Home: \u043D\u0435\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F Lampa");
      return;
    }
    init4();
  }
  if (!window.lampa_home_ready) {
    window.lampa_home_ready = true;
    if (window.appready) start2();
    else Lampa.Listener.follow("app", (e) => {
      if (e.type == "ready") start2();
    });
  }
})();
