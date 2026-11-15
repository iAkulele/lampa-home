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
/* Focus animation: transform only, on the GPU. The frame (::after) has a fixed size, so no layout or paint work per key press. */
.lh-home .card--wide,
.lh-catalog .card--wide {
  will-change: transform;
  backface-visibility: hidden;
}
body:not(.no--animation) .lh-home .card--wide,
body:not(.no--animation) .lh-catalog .card--wide {
  transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
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

/* Sticky hero banner: a fixed slot above Main's scroll (the rows scroll under it).
   The slot height includes its padding (Layer subtracts its bounding box). */
.lh-home__hero {
  height: 38vh;
  padding: 0.5em 1.5em 0.5em 1.5em;
}
.lh-home .lh-banner {
  position: relative;
  height: 100%;
  border-radius: 0.4em;
  overflow: hidden;
  background-color: #111;
}
/* Two backdrop layers crossfade when the banner follows the focused card. */
.lh-home .lh-banner__bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0;
  transition: opacity 0.4s ease;
}
.lh-home .lh-banner__bg--on {
  opacity: 1;
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
.lh-home .lh-badge,
.lh-catalog .lh-badge {
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

/* Airing-status badge, top-right; below the rating badge on wide cards (see .lh-badge--status). */
.lh-home .lh-badge--status,
.lh-catalog .lh-badge--status {
  left: auto;
  right: 0.4em;
}
.lh-home .lh-badge--airing,
.lh-catalog .lh-badge--airing {
  border-left: 3px solid #e50914;
}
.lh-home .lh-badge--done,
.lh-catalog .lh-badge--done {
  color: #aaa;
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
  var ROWS = ["movies", "horror", "anime", "series", "cartoons", "russian", "history"];
  var STORAGE_KEYS = {
    progress: "lh_progress",
    seen: "lh_seen",
    tvcache: "lh_tvcache",
    seasonmap: "lh_seasonmap",
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
    anilibria: "anilibria|aniliberty",
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
  var RUSSIAN_MARKERS = "(?<![\\p{L}\\d])(?:rus(?![\\p{L}\\d])|\u0440\u0443\u0441)|\u0434\u0443\u0431\u043B\u044F\u0436|\u0434\u0443\u0431\u043B\\.|(?<![\\p{L}\\d])\u0434\u0431(?![\\p{L}\\d])|\u043E\u0437\u0432\u0443\u0447|(?<![\\p{L}\\d])\u043E\u0437\u0432\\.|\\|\\s*d\\s*(?=\\||$)|\\bmvo\\b|\\bdvo\\b|\\bavo\\b|\u043C\u043D\u043E\u0433\u043E\u0433\u043E\u043B\u043E\u0441|\u0434\u0432\u0443\u0445\u0433\u043E\u043B\u043E\u0441|\u043E\u0434\u043D\u043E\u0433\u043E\u043B\u043E\u0441|\u043B\u0438\u0446\u0435\u043D\u0437\u0438\u044F|itunes|\\bp[12]\\b|(?<![\\p{L}\\d])\u0434(?![\\p{L}\\d])|\u043B\u043E\u0441\u0442";
  var VOICE_MARKERS = "\u0434\u0443\u0431\u043B\u044F\u0436|\u0434\u0443\u0431\u043B\\.|(?<![\\p{L}\\d])\u0434\u0431(?![\\p{L}\\d])|\u043E\u0437\u0432\u0443\u0447|(?<![\\p{L}\\d])\u043E\u0437\u0432\\.|\\bmvo\\b|\\bdvo\\b|\\bavo\\b|\u043C\u043D\u043E\u0433\u043E\u0433\u043E\u043B\u043E\u0441|\u0434\u0432\u0443\u0445\u0433\u043E\u043B\u043E\u0441|\u043E\u0434\u043D\u043E\u0433\u043E\u043B\u043E\u0441|\\|\\s*d\\s*(?=\\||$)";
  var EXT_AUDIO_MARKERS = "rus[\\s.]*\\(?\\s*ext|\u0432\u043D\u0435\u0448\u043D";
  var RAW_MARKERS = "(?<![\\p{L}\\d])raws?(?![\\p{L}\\d])";
  var SUBS_ONLY_MARKERS = "subsplease|erai-raws|\u0441\u0443\u0431\u0442\u0438\u0442\u0440|(?<![\\p{L}])subs?(?![\\p{L}])|(?<![\\p{L}\\d])\u0441\u0442(?![\\p{L}\\d])";
  var ANIME_VOICE_STUDIOS = "anidub|anilibria|aniliberty|anistar|studio ?band|dream ?cast|(?<![\\p{L}\\d])jam(?![\\p{L}\\d])|animaunt|shiza|(?<![\\p{L}\\d])nda(?![\\p{L}\\d])|(?<![\\p{L}\\d])amber(?![\\p{L}\\d])|anirise|persona99|ancord|cuba77";
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
    sizePenaltyPerGiB: 0.2,
    // Russian audio only as an external track.
    extAudioPenalty: 25,
    // Anime release with no audio info at all: used only when nothing explicit is there.
    unknownVoicePenalty: 40
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
      },
      clear(cardId) {
        const all = read(STORAGE_KEYS.progress);
        delete all[cardId];
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
    const seasonmap = {
      get(tvId) {
        const e = read(STORAGE_KEYS.seasonmap)[tvId];
        if (!e || now() - e.checked > LIMITS.tvCacheMs) return null;
        return e;
      },
      set(tvId, map) {
        const all = read(STORAGE_KEYS.seasonmap);
        all[tvId] = { map: map || null, checked: now() };
        storage2.set(STORAGE_KEYS.seasonmap, all);
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
      trim(STORAGE_KEYS.seasonmap, "checked");
    }
    return { progress, seen, tvcache, seasonmap, notify, filters, preload: preload2, prune };
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
  function trackerPosition(map, absolute) {
    if (!Array.isArray(map) || !(absolute > 0)) return null;
    for (const s of map) {
      const list = Array.isArray(s.episodes) && s.episodes.length ? s.episodes : null;
      const i = list ? list.indexOf(absolute) : absolute - s.start;
      if (list ? i >= 0 : i >= 0 && i < s.count) return { season: s.season, episode: i + 1, start: s.start, count: s.count };
    }
    return null;
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
  var RE_VOICE = re(VOICE_MARKERS);
  var RE_EXT = re(EXT_AUDIO_MARKERS);
  var RE_RAW = re(RAW_MARKERS);
  var RE_SUBS_ONLY = re(SUBS_ONLY_MARKERS);
  var RE_ANIME_STUDIO = re(ANIME_VOICE_STUDIOS);
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
    const tv = /(?<![\p{L}\d])(?:tv|тв)-?(\d{1,2})(?![\d])/giu;
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
      explicitVoice: studio !== null || RE_VOICE.test(audioText),
      extAudio: RE_EXT.test(audioText),
      raw: RE_RAW.test(t),
      subsOnly: RE_SUBS_ONLY.test(t),
      animeStudio: RE_ANIME_STUDIO.test(audioText),
      studio,
      audio: detectAudio(t),
      seasons: detectSeasons(t),
      episodeRange: range,
      sxeRange: detectSxeRange(t),
      episode: ep.episode == null ? null : ep,
      total: statedTotal(t)
    };
  }
  var seasonTagged = (p) => !!(p.seasons || p.sxeRange || p.episode && p.episode.season != null);
  function hasEpisode(p, ctx) {
    if (ctx.trackerSeason == null) return hasEpisodePlain(p, ctx);
    const plain = { ...ctx, trackerSeason: null };
    if (!seasonTagged(p)) {
      if (!p.episodeRange && !p.episode && p.total > 0) return ctx.absolute <= p.total;
      return hasEpisodePlain(p, plain);
    }
    const tracker = { ...plain, season: ctx.trackerSeason, episode: ctx.trackerEpisode, absolute: ctx.trackerEpisode };
    const otherSeason = !!p.seasons && !p.seasons.includes(ctx.trackerSeason);
    if (!otherSeason && hasEpisodePlain(p, tracker)) return true;
    const r = p.episodeRange;
    const one = !!p.seasons && p.seasons.length === 1 && (p.seasons[0] === 1 || p.seasons[0] === ctx.trackerSeason);
    return ctx.trackerSeason > 1 && one && !p.sxeRange && !!r && ctx.absolute >= r[0] && ctx.absolute <= r[1];
  }
  function hasEpisodePlain(p, ctx) {
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
  var norm = (s) => String(s || "").toLowerCase().replace(/ё/g, "\u0435").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  var SHORT_NAME = 8;
  function containsName(title, name) {
    const n = norm(name);
    if (!n) return false;
    const t = norm(title);
    return n.length < SHORT_NAME ? (" " + t + " ").includes(" " + n + " ") : t.includes(n);
  }
  function isRelevant(title, names) {
    const list = (names || []).filter((n) => norm(n));
    if (!list.length) return true;
    return list.some((n) => containsName(title, n));
  }
  var RU_LANG = /^(?:rus?|russian)$/i;
  var UKR_LETTERS = /[іїєґ]|укр/i;
  var UNKNOWN_LANG = /^(?:|und|unk|unknown|mis|mul|zxx)$/i;
  function streamIsRussian(s) {
    const tags = s && s.tags || {};
    const lang = String(tags.language || "").trim();
    if (RU_LANG.test(lang)) return true;
    if (!UNKNOWN_LANG.test(lang)) return false;
    const name = String(tags.title || "");
    return /\p{Script=Cyrillic}/u.test(name) && !UKR_LETTERS.test(name) || /(?<![\p{L}])rus/iu.test(name);
  }
  function audioFromFfprobe(ffprobe) {
    const audio = (Array.isArray(ffprobe) ? ffprobe : []).filter((s) => s && s.codec_type === "audio");
    if (!audio.length) return "unknown";
    if (audio.some(streamIsRussian)) return "ru";
    return audio.every((s) => !UNKNOWN_LANG.test(String(s.tags && s.tags.language || "").trim())) ? "none" : "unknown";
  }
  function audioFromResult(result) {
    const probe = audioFromFfprobe(result && result.ffprobe);
    if (probe === "ru") return "ru";
    const langs = Array.isArray(result && result.languages) ? result.languages.map(String) : [];
    if (langs.some((l) => RU_LANG.test(l))) return "ru";
    if (probe === "none" || langs.length) return "none";
    return "unknown";
  }
  var cyrillic = (s) => /\p{Script=Cyrillic}/u.test(String(s || ""));
  function classifyAudio(p, result, ctx) {
    const anime = ctx.kind === "anime";
    const title = String(result && result.Title || "");
    const info = result && result.info;
    const voices = info && Array.isArray(info.voices) ? info.voices.join(" ") : "";
    const animeStudio = anime && (p.animeStudio || RE_ANIME_STUDIO.test(voices));
    const out = (russian, voice, extra) => ({ russian, voice, studio: p.studio, penalty: 0, reason: null, ...extra });
    if (anime && p.raw && !(p.explicitVoice || animeStudio)) return out(false, null, { reason: "raw" });
    if (p.extAudio) return out(true, p.voice || "other", { penalty: SCORING.extAudioPenalty });
    if (p.russian || animeStudio) return out(true, p.voice || "other");
    const meta = audioFromResult(result);
    if (meta === "ru") {
      const studio = detectStudio(voices);
      return out(true, detectVoice("", studio, "") || "other", { studio });
    }
    if (meta === "none") return out(false, null, { reason: "no-russian" });
    const ruNames = (ctx.names || []).filter(cyrillic);
    if (anime && !p.subsOnly && ruNames.some((n) => containsName(title, n))) {
      return out(false, "unknown", { penalty: SCORING.unknownVoicePenalty });
    }
    return out(false, null, { reason: "no-russian" });
  }
  function rejectReason(p, result, ctx) {
    if (!isRelevant(result.Title, ctx.names)) return "unrelated";
    if (p.screener) return "screener";
    if (p.dvOnly) return "dv-only";
    if (p.audioReason) return p.audioReason;
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
    return quality + voice + audio + seeds - sizePenalty - (p.audioPenalty || 0);
  }
  function selectTorrent(results, ctx) {
    const scored = (results || []).map((result) => {
      const title = parseTitle(result.Title);
      const a = classifyAudio(title, result, ctx);
      const p = { ...title, russian: a.russian, voice: a.voice, studio: a.studio, audioPenalty: a.penalty, audioReason: a.reason };
      return { result, score: score(p, result, ctx), rejected: rejectReason(p, result, ctx), voice: p.voice };
    });
    scored.sort((a, b) => (a.rejected ? 1 : 0) - (b.rejected ? 1 : 0) || b.score - a.score);
    const top = scored.find((s) => !s.rejected);
    return { chosen: top ? top.result : null, scored };
  }
  function statedTotal(t) {
    const m = String(t || "").match(/(?<![\p{L}\d])(?:\d{1,4}\s*-\s*)?\d{1,4}\s*(?:из|of)\s*(\d{1,4})(?!\d)/iu);
    return m ? +m[1] : null;
  }
  function inferSeasonMap(results, { names, total } = {}) {
    const totals = /* @__PURE__ */ new Map();
    for (const r of results || []) {
      if (!r || !isRelevant(r.Title, names)) continue;
      const p = parseTitle(r.Title);
      const seasons = p.seasons || (p.sxeRange ? [p.sxeRange.season] : null);
      if (!seasons || seasons.length !== 1) continue;
      const n = statedTotal(r.Title);
      if (!(n > 0) || n > 500) continue;
      totals.set(seasons[0], Math.max(totals.get(seasons[0]) || 0, n));
    }
    const map = [];
    let start3 = 1;
    for (let season = 1; totals.has(season); season++) {
      if (total > 0 && start3 > total) break;
      const count = totals.get(season);
      const episodes = [];
      for (let i = 0; i < count; i++) episodes.push(start3 + i);
      map.push({ season, start: start3, count, episodes });
      start3 += count;
    }
    return map.length >= 2 ? map : null;
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
  var DIGITAL_LOOKAHEAD_DAYS = 7;
  function digitalCutoff(today) {
    return daysAgo(today, -DIGITAL_LOOKAHEAD_DAYS);
  }
  var MOVIE_DATE = "release_date";
  function movieFilter(today) {
    return {
      with_release_type: "4",
      region: "US",
      [`${MOVIE_DATE}.lte`]: digitalCutoff(today)
    };
  }
  var PREMIERE_DATE = "primary_release_date";
  var PREMIERE_WINDOW_DAYS = 365;
  function premiereWindow(today) {
    return {
      [`${PREMIERE_DATE}.gte`]: daysAgo(today, PREMIERE_WINDOW_DAYS),
      [`${PREMIERE_DATE}.lte`]: digitalCutoff(today)
    };
  }
  function rowQuery(rowKey, today) {
    switch (rowKey) {
      case "movies":
        return {
          url: "discover/movie",
          params: {
            sort_by: `${PREMIERE_DATE}.desc`,
            filter: {
              ...movieFilter(today),
              ...premiereWindow(today),
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
            sort_by: `${PREMIERE_DATE}.desc`,
            filter: { ...movieFilter(today), ...premiereWindow(today), "vote_count.gte": "20" }
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
            sort_by: `${PREMIERE_DATE}.desc`,
            filter: { ...movieFilter(today), ...premiereWindow(today), "vote_count.gte": "20" }
          }
        };
      case "russian":
        return {
          url: "discover/movie",
          params: {
            orig_lang: "ru",
            sort_by: `${PREMIERE_DATE}.desc`,
            filter: {
              [`${PREMIERE_DATE}.gte`]: daysAgo(today, PREMIERE_WINDOW_DAYS),
              [`${PREMIERE_DATE}.lte`]: today,
              [`${MOVIE_DATE}.lte`]: today,
              without_genres: String(GENRE_DOCUMENTARY),
              "vote_count.gte": "10"
            }
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
    if (!isTv && filters.lang === "ru") f.with_original_language = "ru";
    else if (!isTv) Object.assign(f, movieFilter(today));
    if (filters.sort === "rating") {
      params.sort_by = "vote_average.desc";
      f["vote_count.gte"] = "100";
    } else {
      params.sort_by = `${isTv ? dateField : PREMIERE_DATE}.desc`;
      if (isTv) f[`${dateField}.lte`] = today;
      else if (filters.lang === "ru") {
        f[`${PREMIERE_DATE}.lte`] = today;
        f[`${MOVIE_DATE}.lte`] = today;
      } else f[`${PREMIERE_DATE}.lte`] = digitalCutoff(today);
      f["vote_count.gte"] = isTv ? "5" : "10";
    }
    const range = yearRange(filters.year);
    if (range) {
      const rangeField = isTv ? dateField : PREMIERE_DATE;
      f[`${rangeField}.gte`] = range.from;
      f[`${rangeField}.lte`] = range.to;
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
    russian: "\u0420\u0443\u0441\u0441\u043A\u043E\u0435",
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
  function statusText(status2) {
    return status2 && status2.airing ? "\u041E\u043D\u0433\u043E\u0438\u043D\u0433" : "\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043D";
  }
  function applyBadge(cardEl, status2) {
    if (!cardEl || !status2 || !status2.total) return;
    const view = cardEl.querySelector(".card__view");
    if (!view || view.querySelector(".lh-badge")) return;
    const el = document.createElement("div");
    el.className = "lh-badge";
    el.textContent = badgeText(status2);
    view.appendChild(el);
    const st = document.createElement("div");
    st.className = `lh-badge lh-badge--status lh-badge--${status2.airing ? "airing" : "done"}`;
    st.textContent = statusText(status2);
    view.appendChild(st);
  }
  function attachEpisodeBadge(card, data, tvStatus2, today) {
    card.use({
      onVisible() {
        if (this.lhBadged) return;
        this.lhBadged = true;
        tvStatus2(data.id, today()).then((status2) => {
          if (!this.destroyed) applyBadge(card.render(true), status2);
        });
      },
      onDestroy() {
        this.destroyed = true;
      }
    });
  }
  function pickBannerCard(cards, random, rnd = Math.random) {
    if (!cards || !cards.length) return void 0;
    if (!random) return cards[0];
    return cards[Math.floor(rnd() * Math.min(5, cards.length))];
  }
  var realTimers = { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id) };
  function latestWins(apply, delay, timers = realTimers) {
    let timer = null;
    const push = (value) => {
      if (timer !== null) timers.clear(timer);
      timer = timers.set(() => {
        timer = null;
        apply(value);
      }, delay);
    };
    push.cancel = () => {
      if (timer !== null) timers.clear(timer);
      timer = null;
    };
    return push;
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
  var GROUP_TV = 6;
  var SEASON_MAP_TIMEOUT_MS = 6e3;
  function buildSeasonMap(groupJson) {
    const groups = (groupJson && groupJson.groups || []).filter((g) => g && Array.isArray(g.episodes)).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    const map = [];
    for (const g of groups) {
      const eps = g.episodes.filter((e) => e && e.season_number === 1 && e.episode_number > 0).slice().sort((a, b) => {
        var _a, _b;
        return ((_a = a.order) != null ? _a : 0) - ((_b = b.order) != null ? _b : 0) || a.episode_number - b.episode_number;
      }).map((e) => e.episode_number);
      if (!eps.length) continue;
      map.push({ season: map.length + 1, start: Math.min(...eps), count: eps.length, episodes: eps });
    }
    return map.length >= 2 ? map : null;
  }
  function isSingleSeason(tv) {
    if (!tv) return false;
    const real = (tv.seasons || []).filter((s) => s && s.season_number > 0);
    return tv.number_of_seasons === 1 || real.length === 1;
  }
  var seasonMapMemory = /* @__PURE__ */ new Map();
  function loadSeasonMap(tvId, tv) {
    if (tvId == null) return Promise.resolve(null);
    if (seasonMapMemory.has(tvId)) return Promise.resolve(seasonMapMemory.get(tvId));
    const hit = store.seasonmap.get(tvId);
    if (hit) {
      seasonMapMemory.set(tvId, hit.map);
      return Promise.resolve(hit.map);
    }
    const remember = (map) => {
      seasonMapMemory.set(tvId, map);
      store.seasonmap.set(tvId, map);
      return map;
    };
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), SEASON_MAP_TIMEOUT_MS);
    });
    const req = (tv ? Promise.resolve(tv) : loadTv(tvId)).then((details) => {
      if (!isSingleSeason(details)) return remember(null);
      return get(`tv/${tvId}/episode_groups`, {}).then((list) => {
        const group = (list && list.results || []).find((g) => g && g.type === GROUP_TV);
        if (!group) return remember(null);
        return get(`tv/episode_group/${group.id}`, {}).then((json) => remember(buildSeasonMap(json)));
      });
    }).catch(() => null);
    return Promise.race([req, timeout]).finally(() => clearTimeout(timer));
  }

  // src/episode-picker.js
  var WATCHED_PERCENT = 85;
  var SEASON_TIMEOUT_MS = 5e3;
  function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
    return m ? `${m[3]}.${m[2]}.${m[1]}` : "";
  }
  var isAired = (ep, today) => ep.aired === true || !!ep.air_date && (!today || ep.air_date <= today);
  function seasonEpisodeList(json) {
    if (!json) return null;
    if (Array.isArray(json.episodes_original) && json.episodes_original.length) return json.episodes_original;
    return Array.isArray(json.episodes) ? json.episodes : null;
  }
  function fallbackEpisodes(season, count) {
    const out = [];
    for (let n = 1; n <= count; n++) out.push({ episode_number: n, season_number: season, name: "", air_date: null, aired: true });
    return out;
  }
  function watchedEpisodes(season, numbers, progress, view) {
    const out = /* @__PURE__ */ new Set();
    for (const n of numbers || []) {
      const later = !!progress && (progress.season > season || progress.season === season && progress.episode > n);
      const v = view ? view(season, n) : null;
      if (later || v && v.percent >= WATCHED_PERCENT) out.add(n);
    }
    return out;
  }
  function inProgressEpisodes(season, numbers, view) {
    const out = {};
    for (const n of numbers || []) {
      const v = view ? view(season, n) : null;
      if (v && v.time > 0 && v.percent < WATCHED_PERCENT) out[n] = v.percent;
    }
    return out;
  }
  var episodeTitle = (ep) => `\u0421\u0435\u0440\u0438\u044F ${ep.episode_number}` + (ep.name && ep.absolute == null ? ` \u2014 ${ep.name}` : "");
  var mappedSubtitle = (ep) => [`#${ep.absolute}`, ep.name || formatDate(ep.air_date)].filter(Boolean).join(" \xB7 ");
  function pickerItems({ season, target, episodes, watchedSet, inProgress, today, seasonsCount = 1 }) {
    const aired = (episodes || []).filter((ep) => ep && ep.episode_number > 0 && isAired(ep, today));
    const watched = watchedSet || /* @__PURE__ */ new Set();
    const progress = inProgress || {};
    const items = [];
    const other = seasonsCount > 1 ? { title: "\u0414\u0440\u0443\u0433\u043E\u0439 \u0441\u0435\u0437\u043E\u043D\u2026", subtitle: `\u0421\u0435\u0439\u0447\u0430\u0441: \u0441\u0435\u0437\u043E\u043D ${season} \xB7 \u0432\u0441\u0435\u0433\u043E \u0441\u0435\u0437\u043E\u043D\u043E\u0432 ${seasonsCount}`, season, episode: null, kind: "season", selected: false } : null;
    if (target && target.season === season) {
      const ep = aired.find((e) => e.episode_number === target.episode);
      const item = {
        title: `\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C: \u0441\u0435\u0440\u0438\u044F ${target.episode}`,
        subtitle: ep && (ep.absolute != null ? mappedSubtitle(ep) : ep.name) || "",
        season,
        episode: target.episode,
        kind: "continue",
        selected: true
      };
      if (ep && ep.absolute != null) item.absolute = ep.absolute;
      items.push(item);
    }
    if (other) items.push(other);
    for (const ep of aired) {
      const n = ep.episode_number;
      const mapped = ep.absolute != null;
      const key = mapped ? ep.absolute : n;
      let prefix = "";
      if (progress[key] != null) prefix = `\u25B6 ${Math.max(1, Math.round(progress[key]))}% `;
      else if (watched.has(key)) prefix = "\u2713 ";
      const item = {
        title: prefix + episodeTitle(ep),
        subtitle: mapped ? mappedSubtitle(ep) : formatDate(ep.air_date),
        season,
        episode: n,
        kind: "episode",
        selected: false
      };
      if (mapped) item.absolute = ep.absolute;
      items.push(item);
    }
    items.push({ title: "\u0412\u0441\u0435 \u0440\u0430\u0437\u0434\u0430\u0447\u0438", subtitle: "", season, episode: null, kind: "list", selected: false });
    return items;
  }
  function episodesWord(n) {
    const m = n % 100, d = n % 10;
    const w = m >= 11 && m <= 14 ? "\u0441\u0435\u0440\u0438\u0439" : d === 1 ? "\u0441\u0435\u0440\u0438\u044F" : d >= 2 && d <= 4 ? "\u0441\u0435\u0440\u0438\u0438" : "\u0441\u0435\u0440\u0438\u0439";
    return `${n} ${w}`;
  }
  function seasonItems(tv, current2, today) {
    const status2 = tv ? episodeStatus(tv, today) : null;
    return (tv && tv.seasons || []).filter((s) => s && s.season_number > 0 && s.episode_count > 0).filter((s) => s.air_date ? s.air_date <= today : !status2 || s.season_number <= status2.season).filter((s) => !status2 || s.season_number <= status2.season).sort((a, b) => a.season_number - b.season_number).map((s) => {
      const live = !!status2 && status2.airing && s.season_number === status2.season;
      const state = live ? `\u0432\u044B\u0445\u043E\u0434\u0438\u0442, \u0432\u044B\u0448\u043B\u043E ${status2.aired} \u0438\u0437 ${status2.total}` : "\u0432\u044B\u0448\u0435\u043B \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E";
      const date = formatDate(s.air_date);
      return {
        title: `${s.season_number === current2 ? "\u2713 " : ""}\u0421\u0435\u0437\u043E\u043D ${s.season_number} \xB7 ${episodesWord(s.episode_count)}`,
        subtitle: date ? `${state} \xB7 \u0441 ${date}` : state,
        season: s.season_number,
        selected: s.season_number === current2
      };
    });
  }
  function mappedEpisodes(map, season, tmdbEpisodes, airedAbs) {
    const s = (map || []).find((x) => x && x.season === season);
    if (!s) return [];
    const byNumber = new Map((tmdbEpisodes || []).filter(Boolean).map((e) => [e.episode_number, e]));
    const list = Array.isArray(s.episodes) && s.episodes.length ? s.episodes : Array.from({ length: s.count }, (_, i) => s.start + i);
    return list.map((abs, i) => {
      const e = byNumber.get(abs);
      const base = e || { name: "", air_date: null, aired: airedAbs == null || abs <= airedAbs };
      return { ...base, episode_number: i + 1, season_number: season, absolute: abs };
    });
  }
  function mappedSeasonItems(map, current2, airedAbs) {
    return (map || []).filter((s) => s && s.count > 0 && (airedAbs == null || s.start <= airedAbs)).map((s) => {
      const list = s.episodes && s.episodes.length ? s.episodes : Array.from({ length: s.count }, (_, i) => s.start + i);
      const last = list[list.length - 1];
      const out = airedAbs == null ? s.count : list.filter((a) => a <= airedAbs).length;
      const state = out < s.count ? `\u0432\u044B\u0445\u043E\u0434\u0438\u0442, \u0432\u044B\u0448\u043B\u043E ${out} \u0438\u0437 ${s.count}` : "\u0432\u044B\u0448\u0435\u043B \u043F\u043E\u043B\u043D\u043E\u0441\u0442\u044C\u044E";
      return {
        title: `${s.season === current2 ? "\u2713 " : ""}\u0421\u0435\u0437\u043E\u043D ${s.season} \xB7 ${episodesWord(s.count)}`,
        subtitle: `${state} \xB7 #${s.start}\u2013#${last}`,
        season: s.season,
        selected: s.season === current2
      };
    });
  }
  function mappedTarget(map, target) {
    if (!target || target.season !== 1) return null;
    const pos = trackerPosition(map, target.episode);
    return pos ? { season: pos.season, episode: pos.episode } : null;
  }
  function airedCount(tv, season, today) {
    const s = (tv && tv.seasons || []).find((x) => x && x.season_number === season);
    const status2 = tv ? episodeStatus(tv, today) : null;
    if (status2 && season === status2.season) return status2.aired;
    if (status2 && season > status2.season) return 0;
    return s ? s.episode_count : 0;
  }
  var seasonCache = /* @__PURE__ */ new Map();
  function seasonEpisodes(tv, season, today) {
    const key = tv.id + ":" + season;
    if (seasonCache.has(key)) return Promise.resolve(seasonCache.get(key));
    const fallback = () => fallbackEpisodes(season, airedCount(tv, season, today));
    let timer;
    const req = new Promise((resolve, reject) => {
      timer = setTimeout(reject, SEASON_TIMEOUT_MS);
      tmdbGet(`tv/${tv.id}/season/${season}`, {}, resolve, reject);
    });
    return req.then(
      (json) => {
        const eps = seasonEpisodeList(json);
        if (!eps || !eps.length) return fallback();
        seasonCache.set(key, eps);
        return eps;
      },
      fallback
    ).finally(() => clearTimeout(timer));
  }
  function askEpisode(opts) {
    const tracker = opts.seasonMap ? mappedTarget(opts.seasonMap, opts.target) : null;
    return tracker ? askMapped(opts, tracker) : askPlain(opts);
  }
  function askMapped({ title, tv, target, progress, view, seasonMap }, tracker) {
    const L = lampa();
    const today = todayIso();
    const name = L.Controller.enabled().name;
    const enabled = !name || name === "select" || name === "loading" ? "content" : name;
    const status2 = tv ? episodeStatus(tv, today) : null;
    const airedAbs = status2 && status2.season === 1 ? status2.aired : null;
    const seasons = mappedSeasonItems(seasonMap, tracker.season, airedAbs);
    return new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        L.Controller.toggle(enabled);
        resolve(value);
      };
      const showSeasons = (current2) => {
        L.Select.show({
          title: title || "\u0421\u0435\u0437\u043E\u043D",
          items: mappedSeasonItems(seasonMap, current2, airedAbs),
          onSelect: (a) => showEpisodes(a.season, false),
          onBack: () => showEpisodes(current2, current2 === tracker.season)
        });
      };
      function showEpisodes(season, withTarget) {
        seasonEpisodes(tv || { id: 0 }, 1, today).then((tmdb) => {
          if (done) return;
          const episodes = mappedEpisodes(seasonMap, season, tmdb, airedAbs);
          const numbers = episodes.map((e) => e.absolute);
          const items = pickerItems({
            season,
            target: withTarget ? tracker : null,
            episodes,
            watchedSet: watchedEpisodes(1, numbers, progress, view),
            inProgress: inProgressEpisodes(1, numbers, view),
            today,
            seasonsCount: seasons.length
          });
          L.Select.show({
            title: `${title ? title + " \xB7 " : ""}\u0421\u0435\u0437\u043E\u043D ${season}`,
            items,
            onSelect: (a) => {
              if (a.kind === "season") return showSeasons(season);
              if (a.kind === "list") return finish("list");
              finish({ season: 1, episode: a.absolute });
            },
            onBack: () => season === tracker.season ? finish(null) : showEpisodes(tracker.season, true)
          });
        });
      }
      showEpisodes(tracker.season, true);
    });
  }
  function askPlain({ title, tv, target, progress, view }) {
    const L = lampa();
    const today = todayIso();
    const name = L.Controller.enabled().name;
    const enabled = !name || name === "select" || name === "loading" ? "content" : name;
    const seasons = tv ? seasonItems(tv, target.season, today) : [];
    return new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        L.Controller.toggle(enabled);
        resolve(value);
      };
      const showSeasons = (current2) => {
        L.Select.show({
          title: title || "\u0421\u0435\u0437\u043E\u043D",
          items: seasonItems(tv, current2, today),
          onSelect: (a) => showEpisodes(a.season, false),
          onBack: () => showEpisodes(current2, current2 === target.season)
        });
      };
      function showEpisodes(season, withTarget) {
        seasonEpisodes(tv || { id: 0 }, season, today).then((episodes) => {
          if (done) return;
          const numbers = episodes.map((e) => e.episode_number);
          const items = pickerItems({
            season,
            target: withTarget ? target : null,
            episodes,
            watchedSet: watchedEpisodes(season, numbers, progress, view),
            inProgress: inProgressEpisodes(season, numbers, view),
            today,
            seasonsCount: seasons.length
          });
          L.Select.show({
            title: `${title ? title + " \xB7 " : ""}\u0421\u0435\u0437\u043E\u043D ${season}`,
            items,
            onSelect: (a) => {
              if (a.kind === "season") return showSeasons(season);
              if (a.kind === "list") return finish("list");
              finish({ season: a.season, episode: a.episode });
            },
            // Back from another season returns to the target's season first.
            onBack: () => season === target.season ? finish(null) : showEpisodes(target.season, true)
          });
        });
      }
      showEpisodes(target.season, true);
    });
  }

  // src/search-query.js
  var MIN_TITLE = 4;
  var MAX_TITLE = 60;
  var MIN_TWO_WORDS = 12;
  var LONG_TITLE = 40;
  var FEW_RESULTS = 5;
  var FOREIGN = /(?=\p{L})[^\p{Script=Latin}\p{Script=Cyrillic}]/u;
  function isLatinOrCyrillic(str) {
    const s = String(str || "");
    return /\p{L}/u.test(s) && !FOREIGN.test(s);
  }
  function isLatin(str) {
    const s = String(str || "");
    return isLatinOrCyrillic(s) && /\p{Script=Latin}/u.test(s) && !/\p{Script=Cyrillic}/u.test(s);
  }
  var hasCyrillic = (str) => /\p{Script=Cyrillic}/u.test(String(str || ""));
  function shortTitle(name) {
    const original = String(name || "").trim();
    let s = original;
    const cuts = [":", " \u2014 ", " \u2013 ", " ~ ", "("].map((c) => s.indexOf(c)).filter((i) => i >= 0);
    if (cuts.length) s = s.slice(0, Math.min(...cuts)).trim();
    if (s.length < MIN_TITLE) s = original;
    if (s.length > MAX_TITLE) {
      const head = s.slice(0, MAX_TITLE + 1);
      const space = head.lastIndexOf(" ");
      s = (space >= MIN_TITLE ? head.slice(0, space) : s.slice(0, MAX_TITLE)).trim();
    }
    return s;
  }
  function queryTitle(name, kind) {
    const s = String(name || "").trim();
    if (!isLatinOrCyrillic(s)) return "";
    if (kind === "movie") return s;
    return s.length > LONG_TITLE ? shortTitle(s) : s;
  }
  function altList(json) {
    return json && (json.results || json.titles) || [];
  }
  function uniqueShort(titles) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
    titles.forEach((title) => {
      const s = shortTitle(title);
      const key = s.toLowerCase();
      if (s.length >= MIN_TITLE && !seen.has(key)) {
        seen.add(key);
        out.push(s);
      }
    });
    return out;
  }
  function latinAltTitles(json) {
    const rank = (c) => c === "JP" ? 0 : 1;
    return uniqueShort(altList(json).filter((t) => t && (t.iso_3166_1 === "JP" || t.iso_3166_1 === "US") && isLatin(t.title)).sort((a, b) => rank(a.iso_3166_1) - rank(b.iso_3166_1)).map((t) => t.title));
  }
  function cyrillicAltTitles(json) {
    return uniqueShort(altList(json).filter((t) => t && (t.iso_3166_1 === "RU" || t.iso_3166_1 === "UA") && hasCyrillic(t.title) && isLatinOrCyrillic(t.title)).map((t) => t.title));
  }
  function nameForms(name) {
    const s = String(name || "").trim();
    if (!s || !isLatinOrCyrillic(s)) return [];
    const cuts = [":", " \u2014 ", "("].map((c) => s.indexOf(c)).filter((i) => i >= 0);
    const head = cuts.length ? s.slice(0, Math.min(...cuts)).trim() : s;
    const out = [head.length >= MIN_TITLE ? head : s, shortTitle(s)];
    if (s.length > LONG_TITLE) {
      const two = s.split(/\s+/).slice(0, 2).join(" ").replace(/[:,.(—–~]+$/, "");
      if (two.length >= MIN_TWO_WORDS) out.push(two);
    }
    return out;
  }
  function queryTitles(card, alts = [], opts = {}) {
    const kind = opts.kind;
    const rawRu = card.title || card.name || "";
    const rawOriginal = card.original_title || card.original_name || "";
    const ru = queryTitle(rawRu, kind);
    const original = queryTitle(rawOriginal, kind);
    const alt = alts[0] || "";
    const title = ru || alt || original;
    const short = ru ? shortTitle(ru) : "";
    let names = [];
    const add = (n) => {
      if (n && !names.some((x) => x.toLowerCase() === n.toLowerCase())) names.push(n);
    };
    [rawRu, rawOriginal, ...alts, ...opts.cyrillic || []].forEach((n) => nameForms(n).forEach(add));
    if (kind === "anime" && !names.some(isLatin)) names = [];
    return { title, original: original || title, alt, short: short !== title ? short : "", names };
  }
  function searchParamsFor(card, ctx, parseLang, title, original) {
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
    const s = ctx && ctx.kind !== "movie" && !ctx.seasonMap && Number.isInteger(ctx.season) && ctx.season >= 0 ? ctx.season : null;
    const season = s == null ? "" : " S" + (s < 10 ? "0" : "") + s;
    return {
      search: (combinations[parseLang] || original || title) + season,
      search_one: title + season,
      search_two: original + season,
      movie: card,
      page: 1
    };
  }
  var withTitles = (card, title, original) => ({ ...card, title, original_title: original });
  function firstQuery(card, ctx, parseLang, t) {
    const movie = withTitles(card, t.title, t.original);
    return searchParamsFor(movie, ctx, parseLang, t.title, t.original);
  }
  var same = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();
  function secondQuery(card, ctx, t) {
    if (!t.alt) return null;
    if (same(t.alt, t.title) || same(t.alt, t.original)) return null;
    const movie = withTitles(card, t.title, t.alt);
    return searchParamsFor(movie, ctx, "df", t.title, t.alt);
  }
  function shortQuery(card, ctx, t) {
    if (!t.short || same(t.short, t.title)) return null;
    const movie = withTitles(card, t.short, t.short);
    return searchParamsFor(movie, ctx, "lg", t.short, t.short);
  }
  var needSecond = (kind, count) => kind === "anime" || count < FEW_RESULTS;
  function followUpQueries(card, ctx, t, firstCount) {
    const out = [];
    if (firstCount < FEW_RESULTS) out.push(shortQuery(card, ctx, t));
    if (needSecond(ctx.kind, firstCount)) out.push(secondQuery(card, ctx, t));
    return out.filter(Boolean);
  }
  function mergeResults(...lists) {
    const out = [];
    const links = /* @__PURE__ */ new Set();
    const titles = /* @__PURE__ */ new Set();
    for (const list of lists) {
      for (const r of list || []) {
        if (!r) continue;
        const link = r.MagnetUri || r.Link || "";
        const title = String(r.Title || "").trim().toLowerCase();
        if (link && links.has(link) || title && titles.has(title)) continue;
        if (link) links.add(link);
        if (title) titles.add(title);
        out.push(r);
      }
    }
    return out;
  }

  // src/play.js
  var ANIMATION = 16;
  var VIDEO = ["asf", "wmv", "divx", "avi", "mp4", "m4v", "mov", "3gp", "3g2", "mkv", "trp", "tp", "mts", "mpg", "mpeg", "dat", "vob", "rm", "rmvb", "m2ts", "ts"];
  var INDIVIDUAL = ["vob", "m2ts"];
  var FILES_EVERY_MS = 2e3;
  var WATCHED_PERCENT2 = 85;
  var FILES_TRIES = 20;
  var FILES_TRIES_EXTRA = 10;
  var HASH_TIMEOUT_MS = 2e4;
  var MAX_CANDIDATES = 3;
  var RUN_TIMEOUT_MS = 9e4;
  var QUERY_GAP_MS = 1200;
  var RETRY_FAST_MS = 500;
  var RETRY_AFTER_MS = 2e3;
  var RESULTS_TTL_MS = 6e4;
  var ALT_TIMEOUT_MS = 5e3;
  var MSG = {
    search: "\u0418\u0449\u0443 \u0440\u0430\u0437\u0434\u0430\u0447\u0443\u2026",
    server: "\u041E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E \u0432 TorrServer\u2026",
    files: "\u0416\u0434\u0443 \u0441\u043F\u0438\u0441\u043E\u043A \u0444\u0430\u0439\u043B\u043E\u0432\u2026",
    filesOf: (i, n) => `\u0416\u0434\u0443 \u0441\u043F\u0438\u0441\u043E\u043A \u0444\u0430\u0439\u043B\u043E\u0432 (${i}/${n})\u2026`,
    none: "\u041F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0435\u0439 \u0440\u0430\u0437\u0434\u0430\u0447\u0438 \u043D\u0435 \u043D\u0430\u0448\u0451\u043B, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E",
    noFile: "\u041D\u0443\u0436\u043D\u043E\u0439 \u0441\u0435\u0440\u0438\u0438 \u0432 \u0440\u0430\u0437\u0434\u0430\u0447\u0435 \u043D\u0435 \u043D\u0430\u0448\u0451\u043B, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E",
    notYet: (n) => `\u0421\u0435\u0440\u0438\u044F ${n} \u0435\u0449\u0451 \u043D\u0435 \u043F\u043E\u044F\u0432\u0438\u043B\u0430\u0441\u044C \u0432 \u0440\u0430\u0437\u0434\u0430\u0447\u0430\u0445`,
    retry: (i, n) => `\u041F\u0440\u043E\u0431\u0443\u044E \u0434\u0440\u0443\u0433\u0443\u044E \u0440\u0430\u0437\u0434\u0430\u0447\u0443 (${i}/${n})\u2026`,
    timeout: "\u0420\u0430\u0437\u0434\u0430\u0447\u0430 \u043D\u0435 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u043B\u0430\u0441\u044C \u0432\u043E\u0432\u0440\u0435\u043C\u044F, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0440\u0443\u0447\u043D\u0443\u044E",
    parser: "\u041F\u0430\u0440\u0441\u0435\u0440 \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B",
    torrserver: "TorrServer \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D",
    noServer: "TorrServer \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D",
    noFiles: "TorrServer \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u043B \u0441\u043F\u0438\u0441\u043E\u043A \u0444\u0430\u0439\u043B\u043E\u0432",
    unknown: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0440\u0430\u0437\u0434\u0430\u0447\u0443"
  };
  var PlayError = class extends Error {
    constructor(msg, fatal = false) {
      super(msg);
      this.fatal = fatal;
    }
  };
  var fail = (msg, fatal) => new PlayError(msg, fatal);
  var ext = (path) => String(path || "").split(".").pop().toLowerCase();
  var isVideo = (f) => VIDEO.includes(ext(f.path));
  function genreIds(card) {
    if (!card) return [];
    if (Array.isArray(card.genre_ids) && card.genre_ids.length) return card.genre_ids;
    return (Array.isArray(card.genres) ? card.genres : []).map((g) => g && g.id).filter((id) => id != null);
  }
  function progressAfterOutcome(prev, picked, outcome) {
    return outcome === "played" ? picked : prev;
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
  function trackerFields(o) {
    if (!o || o.trackerSeason == null) return {};
    return { trackerSeason: o.trackerSeason, trackerEpisode: o.trackerEpisode, trackerStart: o.trackerStart };
  }
  function withTracker(ctx, map, keepMap = true) {
    if (!ctx || !map) return ctx;
    const { trackerSeason, trackerEpisode, trackerStart, ...rest } = ctx;
    const out = keepMap ? { ...rest, seasonMap: map } : rest;
    const pos = trackerPosition(map, ctx.absolute);
    return pos ? { ...out, trackerSeason: pos.season, trackerEpisode: pos.episode, trackerStart: pos.start } : out;
  }
  function inferTracker(ctx, results, names) {
    if (!ctx || ctx.trackerSeason != null || ctx.seasonMap || !(ctx.inferTotal > 0)) return ctx;
    const map = inferSeasonMap(results, { names, total: ctx.inferTotal });
    return map ? withTracker(ctx, map, false) : ctx;
  }
  function absoluteInPack(episode, ctx) {
    if (!(episode > 0) || !ctx || !(ctx.trackerStart > 0)) return episode;
    return ctx.trackerStart > 1 && episode >= ctx.trackerStart ? episode : ctx.trackerStart - 1 + episode;
  }
  function isTrackerPackFile(file, ctx) {
    if (!file || !ctx || !(ctx.trackerStart > 0)) return false;
    const n = parseEpisode(file.path).episode;
    return n != null && n !== ctx.absolute && n === ctx.trackerEpisode;
  }
  function pickFile(files, ctx, infos) {
    const videos = (files || []).filter(isVideo);
    if (!videos.length) return null;
    if (ctx.trackerSeason != null && ctx.kind !== "movie") {
      const { trackerSeason, trackerEpisode, trackerStart, ...plain } = ctx;
      const sxe = videos.find((f) => {
        const ep = parseEpisode(f.path);
        return ep.season != null && ep.season === trackerSeason && ep.episode === trackerEpisode;
      });
      if (sxe) return sxe;
      const abs = pickFile(videos, { ...plain, titleHasSeason: false }, infos);
      if (abs) return abs;
      return pickFile(videos, { ...plain, season: trackerSeason, episode: trackerEpisode, absolute: trackerEpisode, titleHasSeason: true }, infos);
    }
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
  function nextCandidates(scored, max = MAX_CANDIDATES) {
    const out = [];
    const seen = /* @__PURE__ */ new Set();
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
  async function tryCandidates(candidates2, attempt, { cancelled = () => false, onMiss = () => {
  } } = {}) {
    let prevSeen = false;
    for (let i = 0; i < (candidates2 || []).length; i++) {
      let outcome;
      try {
        outcome = await attempt(candidates2[i], i);
      } catch (err) {
        if (cancelled() || !(err instanceof PlayError) || err.fatal) throw err;
        outcome = "nofile";
      }
      if (outcome === "played" || outcome === "cancelled") return outcome;
      if (cancelled()) return "cancelled";
      if (outcome === "nofile-prev") prevSeen = true;
      onMiss();
    }
    return prevSeen ? "nofile-prev" : "nofile";
  }
  function previousEpisodeCtx(ctx) {
    if (!ctx || ctx.kind === "movie" || !(ctx.episode > 1)) return null;
    const prev = { ...ctx, episode: ctx.episode - 1, absolute: ctx.absolute > 1 ? ctx.absolute - 1 : ctx.absolute };
    if (ctx.trackerSeason == null) return prev;
    if (!(ctx.trackerEpisode > 1)) return null;
    return { ...prev, trackerEpisode: ctx.trackerEpisode - 1 };
  }
  function resumeTarget(progress, view) {
    if (!progress || !view) return null;
    if (!(view.time > 0) || !(view.percent < WATCHED_PERCENT2)) return null;
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
    return searchParamsFor(card, ctx, parseLang, title, original);
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
  var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function searchOnce(params, job) {
    const started = Date.now();
    try {
      return await searchTorrents(params);
    } catch (err) {
      if (job && job.cancelled || Date.now() - started >= RETRY_FAST_MS) throw err;
      await sleep(RETRY_AFTER_MS);
      if (job && job.cancelled) throw err;
      return searchTorrents(params);
    }
  }
  var altCache = /* @__PURE__ */ new Map();
  function altTitles(kind, id) {
    if (id == null) return Promise.resolve(null);
    const key = (kind === "movie" ? "movie/" : "tv/") + id;
    if (altCache.has(key)) return Promise.resolve(altCache.get(key));
    const req = new Promise((resolve, reject) => {
      lampa().Api.sources.tmdb.get(key + "/alternative_titles", {}, resolve, reject);
    });
    return withTimeout(req, ALT_TIMEOUT_MS, MSG.parser).then(
      (json) => {
        const alts = { latin: latinAltTitles(json), cyrillic: cyrillicAltTitles(json) };
        altCache.set(key, alts);
        return alts;
      },
      () => null
    );
  }
  var resultsCache = /* @__PURE__ */ new Map();
  async function findReleases(movie, ctx, job) {
    const key = [movie.id, ctx.kind, ctx.seasonMap ? "map" : ctx.season].join(":");
    const hit = resultsCache.get(key);
    if (hit && Date.now() - hit.at < RESULTS_TTL_MS) return hit.value;
    const cancelled = () => !!(job && job.cancelled);
    const original = movie.original_title || movie.original_name || "";
    const titlesOf = (alts2) => queryTitles(movie, alts2 && alts2.latin || [], { kind: ctx.kind, cyrillic: alts2 && alts2.cyrillic });
    let alts = ctx.kind === "anime" || !isLatinOrCyrillic(original) ? await altTitles(ctx.kind, movie.id) : void 0;
    let titles = titlesOf(alts);
    const params = firstQuery(movie, ctx, storageField("parse_lang"), titles);
    const lists = [await searchOnce(params, job)];
    let lastDone = Date.now();
    let failed = false;
    if (!cancelled() && lists[0].length < FEW_RESULTS && alts === void 0) {
      alts = await altTitles(ctx.kind, movie.id);
      titles = { ...titlesOf(alts), title: titles.title, original: titles.original };
    }
    for (const q of cancelled() ? [] : followUpQueries(movie, ctx, titles, lists[0].length)) {
      const wait = QUERY_GAP_MS - (Date.now() - lastDone);
      if (wait > 0) await sleep(wait);
      if (cancelled()) break;
      try {
        lists.push(await searchOnce(q, job));
      } catch (e) {
        failed = true;
      }
      lastDone = Date.now();
    }
    const value = { results: mergeResults(...lists), names: titles.names, params };
    if (!cancelled() && !failed) resultsCache.set(key, { at: Date.now(), value });
    return value;
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
        () => reject(fail(MSG.torrserver, true))
      );
    });
    return withTimeout(req, HASH_TIMEOUT_MS, MSG.torrserver);
  }
  function pollFiles(hash, job, maxTries = FILES_TRIES) {
    const L = lampa();
    return new Promise((resolve, reject) => {
      let tries = 0;
      const tick = () => {
        if (job.cancelled) return stop(null);
        if (++tries > maxTries) return stop(fail(MSG.noFiles));
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
  function buildPlaylist(files, movie, hash, ctx) {
    const L = lampa();
    const tracker = !!ctx && ctx.trackerStart > 0;
    const title = movie.original_title || movie.original_name || "";
    return parsePlays(files, movie).map(({ file, info: parsed }) => {
      let info = parsed;
      if (tracker && info.episode > 0) {
        const episode = absoluteInPack(info.episode, ctx);
        info = { ...info, season: 1, episode, hash: L.Utils.hash(timelineHashString(1, episode, title)) };
      }
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
      return !!v && v.percent >= WATCHED_PERCENT2;
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
    let ctx = { kind, season: target.season, episode: target.episode, absolute: absoluteEpisode(seasons, target.season, target.episode) };
    let seasonMap = null;
    if (kind === "anime" && details && isSingleSeason(details)) {
      seasonMap = await loadSeasonMap(card.id, details);
      if (seasonMap) ctx = withTracker(ctx, seasonMap);
      else {
        const s1 = (details.seasons || []).find((s) => s && s.season_number === 1);
        ctx = { ...ctx, inferTotal: s1 && s1.episode_count || status2 && status2.total || 0 };
      }
    }
    return { kind, ctx, movie, tv: details, seasonMap };
  }
  var asksEpisode = (ctx) => !!ctx && ctx.kind !== "movie" && storageField("lh_ask_episode") !== false;
  async function chooseEpisode(card, { movie, ctx, tv, seasonMap }) {
    const seasons = tv && tv.seasons || card.seasons || [];
    const picked = await askEpisode({
      title: movie.title || movie.name || card.title || card.name || "",
      tv: tv ? { ...tv, id: tv.id != null ? tv.id : card.id } : { id: card.id, seasons },
      target: { season: ctx.season, episode: ctx.episode },
      progress: store.progress.get(card.id),
      view: timelineOf(movie),
      seasonMap
    });
    if (!picked || picked === "list") return picked;
    const next = { ...ctx, season: picked.season, episode: picked.episode, absolute: absoluteEpisode(seasons, picked.season, picked.episode) };
    return seasonMap ? withTracker(next, seasonMap) : next;
  }
  function beginJob(text, onCancel) {
    const L = lampa();
    if (current) return null;
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
    job.restart = (t) => {
      job.loading = true;
      L.Loading.start(cancel, t);
    };
    job.finish = () => {
      if (job.timer) clearInterval(job.timer);
      if (job.deadline) clearTimeout(job.deadline);
      if (current === job) current = null;
      if (job.loading) L.Loading.stop();
      job.loading = false;
    };
    L.Loading.start(cancel, text);
    return job;
  }
  async function playFiles(job, card, movie, ctx, maxTries, filesText = MSG.files) {
    const L = lampa();
    L.Loading.setText(filesText);
    const files = await pollFiles(job.hash, job, maxTries);
    if (job.cancelled || !files) return "cancelled";
    const infos = ctx.index != null ? null : fileInfos(files, movie);
    const file = ctx.index != null ? files.find((f) => f.id === ctx.index) : pickFile(files, ctx, infos);
    const playlist = buildPlaylist(files, movie, job.hash, isTrackerPackFile(file, ctx) ? ctx : null);
    const element = file && playlist.find((p) => p.id === file.id);
    if (!element) {
      const prev = ctx.index != null ? null : previousEpisodeCtx(ctx);
      return prev && pickFile(files, prev, infos) ? "nofile-prev" : "nofile";
    }
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
    const arm = () => {
      clearTimeout(job.deadline);
      job.deadline = setTimeout(() => {
        if (current !== job || job.cancelled) return;
        job.cancelled = true;
        dropUnlessPreloaded(job.hash);
        finish();
        L.Noty.show(MSG.timeout);
        openNativeList(params);
      }, RUN_TIMEOUT_MS);
    };
    arm();
    let rollback = null;
    let played = false;
    try {
      const target = await resolveTarget(card);
      const { movie } = target;
      let { ctx } = target;
      if (job.cancelled) return;
      if (asksEpisode(ctx)) {
        clearTimeout(job.deadline);
        job.deadline = null;
        job.pause();
        const picked = await chooseEpisode(card, target);
        if (job.cancelled) return;
        if (!picked || picked === "list") {
          job.cancelled = true;
          finish();
          if (picked === "list") openNativeList(buildSearchParams(movie, ctx, storageField("parse_lang")));
          return;
        }
        ctx = picked;
        rollback = { prev: store.progress.get(card.id) };
        store.progress.set(card.id, { season: ctx.season, episode: ctx.episode, hash: null });
        job.restart(MSG.search);
        arm();
      }
      params = buildSearchParams(movie, ctx, storageField("parse_lang"));
      const found = await findReleases(movie, ctx, job);
      if (job.cancelled) return;
      params = { ...params, search: found.params.search };
      ctx = inferTracker(ctx, found.results, found.names);
      const candidates2 = nextCandidates(selectTorrent(found.results, { ...ctx, names: found.names }).scored);
      if (!candidates2.length) {
        finish();
        L.Noty.show(MSG.none);
        return openNativeList(params);
      }
      if (!L.Torserver.url()) throw fail(MSG.noServer, true);
      const n = candidates2.length;
      const outcome = await tryCandidates(candidates2, async (cand, i) => {
        L.Loading.setText(i === 0 ? MSG.server : MSG.retry(i + 1, n));
        const hash = await addTorrent(cand, movie);
        job.hash = hash;
        if (job.cancelled) {
          dropUnlessPreloaded(hash);
          return "cancelled";
        }
        return playFiles(
          job,
          card,
          movie,
          { ...ctx, titleHasSeason: titleHasSeason(cand.Title) },
          i === 0 ? FILES_TRIES : FILES_TRIES_EXTRA,
          i === 0 ? MSG.files : MSG.filesOf(i + 1, n)
        );
      }, {
        cancelled: () => job.cancelled,
        onMiss: () => {
          dropUnlessPreloaded(job.hash);
          job.hash = null;
        }
      });
      played = outcome === "played";
      if (outcome === "played" || outcome === "cancelled" || job.cancelled) return;
      finish();
      L.Noty.show(outcome === "nofile-prev" ? MSG.notYet(ctx.episode) : MSG.noFile);
      return openNativeList(params);
    } catch (err) {
      if (job.cancelled) return;
      dropUnlessPreloaded(job.hash);
      finish();
      const msg = err instanceof PlayError ? err.message : MSG.unknown;
      if (!(err instanceof PlayError)) console.error("lampa-home play", err);
      L.Noty.show(msg);
      openNativeList(params);
    } finally {
      if (rollback && !played) {
        const prev = progressAfterOutcome(rollback.prev, null, "failed");
        if (prev) store.progress.set(card.id, { season: prev.season, episode: prev.episode, hash: prev.hash });
        else store.progress.clear(card.id);
      }
    }
  }
  async function startFromHash(hash, card, ctx, title) {
    const L = lampa();
    if (!hash || !card || current) return;
    const job = beginJob(MSG.files, () => {
    });
    job.hash = hash;
    try {
      if (!L.Torserver.url()) throw fail(MSG.noServer, true);
      const kind = ctx && ctx.kind || detectKind(card);
      let movie = normalizeTitles(card);
      if (!movie.img && movie.poster_path) movie = { ...movie, img: L.Api.img(movie.poster_path) };
      if (kind !== "movie" && !movie.number_of_seasons) {
        movie = { ...movie, number_of_seasons: Math.max(1, ctx && ctx.season || 1) };
      }
      const outcome = await playFiles(job, card, movie, { kind, ...ctx, titleHasSeason: titleHasSeason(title) });
      if (outcome === "nofile" || outcome === "nofile-prev") {
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
  var FRESH = { genre: null, year: null, sort: "new", lang: null };
  var ROW_PRESETS = {
    movies: { kind: "movie", preset: FRESH },
    horror: { kind: "movie", preset: { ...FRESH, genre: 27 } },
    anime: { kind: "anime", preset: FRESH },
    series: { kind: "tv", preset: FRESH },
    cartoons: { kind: "cartoon", preset: FRESH },
    russian: { kind: "movie", preset: { ...FRESH, lang: "ru" } }
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
    const f = { ...store.filters.get(kind), lang: object.lang || null };
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
        if ((kind === "tv" || kind === "anime") && data.original_name) attachEpisodeBadge(item, data, tvStatus, todayIso);
        item.use({
          onCreate() {
            applyPosterClass(item.render(true), data);
          },
          onEnter: L.Router.call.bind(L.Router, "full", data)
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
    const lang = preset && preset.lang || null;
    const title = lang === "ru" ? "\u0420\u0443\u0441\u0441\u043A\u043E\u0435" : KIND_TITLES[kind];
    lampa().Activity.push({ url: "", component: NAME, kind, lang, title, page: 1, source: "tmdb" });
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
  var BANNER_HTML = `<div class="lh-banner">
  <div class="lh-banner__bg lh-banner__bg--on" style="background-image:url('{backdrop}')"></div>
  <div class="lh-banner__bg"></div>
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
  function bannerText(card, { img, genres = {} }) {
    const date = card.release_date || card.first_air_date || "";
    const genre = (card.genre_ids || []).map((id) => genres[id]).find(Boolean);
    const rating = Number(card.vote_average) > 0 ? "\u2605 " + Number(card.vote_average).toFixed(1) : "";
    const path = card.backdrop_path || card.poster_path;
    return {
      title: String(card.title || card.name || ""),
      meta: [date.slice(0, 4), genre, rating].filter(Boolean).join(" \xB7 "),
      overview: truncate(card.overview, 180),
      backdrop: path ? img(path, "w1280") : ""
    };
  }
  function bannerVars(card, opts) {
    const raw = bannerText(card, opts);
    return {
      title: esc(raw.title),
      meta: esc(raw.meta),
      overview: esc(raw.overview),
      backdrop: raw.backdrop ? esc(raw.backdrop) : ""
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
  var FADE_MS = 400;
  function createBanner(comp, card) {
    const L = lampa();
    const opts = {
      img: L.Api.img,
      genres: genreMap(L.Api.sources.tmdb.genres, L.Lang.translate)
    };
    const html = L.Template.get(BANNER, bannerVars(card, opts));
    const el = html[0];
    const bgs = el.querySelectorAll(".lh-banner__bg");
    const field = (name) => el.querySelector(".lh-banner__" + name);
    let shown = card;
    let front = 0;
    let token = 0;
    let last = false;
    let destroyed = false;
    function swapBackdrop(url) {
      const my = ++token;
      const apply = () => {
        if (destroyed || my !== token) return;
        const next = 1 - front;
        bgs[next].style.backgroundImage = url ? `url('${url.replace(/'/g, "%27")}')` : "none";
        bgs[next].classList.add("lh-banner__bg--on");
        const old = bgs[front];
        old.classList.remove("lh-banner__bg--on");
        front = next;
        setTimeout(() => {
          if (!destroyed && !old.classList.contains("lh-banner__bg--on")) old.style.backgroundImage = "none";
        }, FADE_MS + 100);
      };
      if (!url) return apply();
      const img = new Image();
      img.onload = apply;
      img.onerror = apply;
      img.src = url;
    }
    function show(next) {
      if (destroyed || !next || next === shown) return;
      shown = next;
      const raw = bannerText(next, opts);
      field("title").textContent = raw.title;
      field("meta").textContent = raw.meta;
      field("overview").textContent = raw.overview;
      swapBackdrop(raw.backdrop);
    }
    html.find(".selector").on("hover:focus", function() {
      last = this;
      comp.lhOnBanner = true;
      L.Background.change(L.Utils.cardImgBackground(shown));
    });
    html.find(".selector").on("hover:enter", () => {
      comp.lhOnBanner = true;
    });
    html.find(".lh-banner__play").on("hover:enter", () => run(shown));
    html.find(".lh-banner__more").on("hover:enter", () => L.Router.call("full", shown));
    return {
      follow: latestWins(show, 250),
      toggle() {
        L.Controller.add("lh_banner", {
          link: this,
          toggle: () => {
            comp.lhOnBanner = true;
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
          up: () => L.Controller.toggle("head"),
          down: () => comp.lhRows(),
          back: () => comp.emit("back")
        });
        L.Controller.toggle("lh_banner");
      },
      render: (js) => js ? el : html,
      destroy() {
        destroyed = true;
        this.follow.cancel();
        html.remove();
      }
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
        const root = this.render(true);
        root.classList.add("lh-home");
        let hero = null;
        const dropHero = () => {
          if (hero) hero.remove();
          hero = null;
          this.scroll.minus();
        };
        if (storageField("lh_banner") !== false) {
          hero = document.createElement("div");
          hero.className = "lh-home__hero";
          root.prepend(hero);
          this.scroll.minus(hero);
        }
        this.lhRows = () => {
          if (!this.items.length) return;
          this.lhOnBanner = false;
          this.active = 0;
          this.items[0].toggle();
        };
        const today = todayIso();
        Promise.all(ROWS.map((key) => loadRow(key, today))).then((loaded) => {
          if (this.destroyed) return;
          const rows = buildRows(loaded);
          if (!rows.length) {
            dropHero();
            return this.empty();
          }
          const bcard = hero && bannerCard(rows);
          if (bcard) {
            this.lhBanner = createBanner(this, bcard);
            this.lhOnBanner = true;
            hero.append(this.lhBanner.render(true));
          } else dropHero();
          this.build(rows);
        }).catch((e) => {
          if (!this.destroyed) fallbackToNative(e);
        });
      },
      // Main re-enters the activity via the content controller: resume where focus was.
      onController(controller) {
        const rowsToggle = controller.toggle;
        controller.toggle = () => {
          if (this.lhBanner && this.lhOnBanner && L.Platform.screen("tv")) this.lhBanner.toggle();
          else rowsToggle();
        };
      },
      // Replaces Main's onUp: from the first row go to the banner instead of the head.
      onlyUp() {
        if (this.active > 0) {
          this.active--;
          this.items[this.active].toggle();
        } else if (this.lhBanner) {
          this.active = 0;
          this.lhOnBanner = true;
          this.lhBanner.toggle();
        } else {
          this.active = 0;
          L.Controller.toggle("head");
        }
      },
      // Replaces Main's onDown (also the wheel): from the banner into the first row.
      onlyDown() {
        if (this.lhOnBanner) return this.lhRows();
        if (!this.items.length) return;
        this.active = Math.min(this.active + 1, this.items.length - 1);
        this.items[this.active].toggle();
      },
      onNext(resolve, reject) {
        reject.call(this);
      },
      onDestroy() {
        if (this.lhBanner) this.lhBanner.destroy();
        this.destroyed = true;
      },
      onInstance(item, data) {
        const rowKey = data.params && data.params.lh_row;
        item.use({
          onMore: () => openForRow(rowKey),
          onInstance(card, cardData) {
            if (wantsBadge(rowKey, cardData)) attachEpisodeBadge(card, cardData, tvStatus, todayIso);
            card.use({
              onCreate() {
                applyPosterClass(card.render(true), cardData);
              },
              onEnter: L.Router.call.bind(L.Router, "full", cardData),
              onFocus() {
                comp.lhOnBanner = false;
                if (comp.lhBanner) comp.lhBanner.follow(cardData);
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
    offline: "TorrServer \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D, \u043F\u043E\u043A\u0430\u0437\u0430\u043D \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A",
    notStarted: "\u041D\u0435 \u043D\u0430\u0447\u0430\u0442\u0430",
    start: "\u041D\u0430\u0447\u0430\u0442\u044C \u0437\u0430\u043A\u0430\u0447\u043A\u0443"
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
  function preloadState({ index, loaded_size, file_stats }) {
    const stats = file_stats || [];
    const largest = stats.reduce((b, f) => (f.length || 0) > (b && b.length || 0) ? f : b, null);
    const id = index != null ? index : largest && largest.id;
    const notStarted = index == null && !(loaded_size > 0);
    return { ...preloadProgress({ loaded_size, file_stats: stats, index: id }), notStarted, id };
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
    if (progress.notStarted) return MSG2.notStarted;
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
        ...trackerFields(meta),
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
    const same2 = (entries || []).filter((e) => e && e.key === key);
    return same2.find((e) => e.hash === hash) || same2[0] || null;
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
    ...trackerFields(e),
    size: e.size,
    added: e.added,
    card: e.card
  });
  function cacheUpdate(entries, cachedCount) {
    if (!Array.isArray(entries)) return null;
    if (!entries.length && cachedCount > 0) return null;
    const map = {};
    for (const e of [...entries].sort((a, b) => (a.added || 0) - (b.added || 0))) map[e.key] = cacheEntry(e);
    return map;
  }
  function syncCache(entries) {
    const map = cacheUpdate(entries, store.preload.all().length);
    if (map) store.preload.replace(map);
  }
  async function listDownloads() {
    const list = await tsTorrents({ action: "list" }, LIST_TIMEOUT_MS);
    if (!Array.isArray(list)) throw fail2(MSG2.torrserver);
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
        ...trackerFields(entry),
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
    L.Loading.start(cancel, MSG2.search);
    try {
      tsBase();
      const target = await resolveTarget(card);
      const { movie } = target;
      let { ctx } = target;
      if (job.cancelled) return;
      if (asksEpisode(ctx)) {
        loading = false;
        L.Loading.stop();
        const picked = await chooseEpisode(card, target);
        if (job.cancelled) return;
        if (!picked || picked === "list") {
          job.cancelled = true;
          finish();
          if (picked === "list") openNativeList(buildSearchParams(movie, ctx, storageField("parse_lang")));
          return;
        }
        ctx = picked;
        loading = true;
        L.Loading.start(cancel, MSG2.search);
      }
      const found = await findReleases(movie, ctx, job);
      if (job.cancelled) return;
      ctx = inferTracker(ctx, found.results, found.names);
      const { chosen } = selectTorrent(found.results, { ...ctx, names: found.names });
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
        ...trackerFields(ctx),
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
        data: JSON.stringify({ lampa: true, movie: snapshot }),
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
      await tsTorrents({ action: "set", hash, ...fields, data: preloadData(snapshot, meta) }).catch(() => {
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
    const p = preloadState({ index, loaded_size: json && json.loaded_size, file_stats: stats });
    const file = stats.find((f) => f.id === p.id);
    return { loaded: json && json.loaded_size || 0, size: file && file.length || 0, ...p };
  }
  async function startPreload(entry) {
    const L = lampa();
    L.Loading.start(() => L.Loading.stop(), MSG2.files);
    try {
      const json = await tsTorrents({ action: "get", hash: entry.hash });
      const files = json && json.file_stats || [];
      if (!files.length) throw fail2(MSG2.noFiles);
      const ctx = { kind: entry.kind, season: entry.season, episode: entry.episode, absolute: entry.absolute, ...trackerFields(entry) };
      const file = pickFile(files, { ...ctx, titleHasSeason: titleHasSeason(entry.title || "") }, fileInfos(files, entry.card));
      if (!file) throw fail2(MSG2.noFile);
      firePreload(entry.hash, file.id);
      const meta = { ...ctx, index: file.id, added: entry.added || Date.now(), by: deviceName() };
      const fields = { title: json.title || "", poster: json.poster || "", category: json.category || "" };
      await tsTorrents({ action: "set", hash: entry.hash, ...fields, data: preloadData(entry.card, meta) }).catch(() => {
      });
      store.preload.set(entry.key, cacheEntry({ ...entry, ...meta, size: file.length }));
      L.Loading.stop();
      L.Noty.show(MSG2.started);
      return true;
    } catch (err) {
      L.Loading.stop();
      if (!(err instanceof DlError)) console.error("lampa-home preload", err);
      L.Noty.show(err instanceof DlError ? err.message : MSG2.torrserver);
      return false;
    }
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
    try {
      if (entry.hash) await tsTorrents({ action: "rem", hash: entry.hash });
    } catch (e) {
    }
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
          if (state) {
            state.missing = !!p.missing;
            state.notStarted = !!p.notStarted;
          }
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
    function offerStart(entry) {
      ask(MSG2.notStarted, [{ title: MSG2.start, start: true }, { title: MSG2.forget, forget: true }], (a) => {
        if (a.start) startPreload(entry).then((ok) => ok && reload());
        else if (a.forget) forget(entry).then(reload);
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
            if (state && state.notStarted) return offerStart(entry);
            const { card, hash, index, kind, season, episode, absolute, title } = entry;
            startFromHash(hash, card, { kind, season, episode, absolute, index, ...trackerFields(entry) }, title);
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
    storage.set(STORAGE_KEYS.seasonmap, {});
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
      param: { name: "lh_ask_episode", type: "trigger", default: true },
      field: { name: "\u0421\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0442\u044C \u0441\u0435\u0440\u0438\u044E \u043F\u0440\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0435", description: "\u041F\u0435\u0440\u0435\u0434 \xAB\u0418\u0433\u0440\u0430\u0442\u044C\xBB \u0438 \xAB\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0437\u0430\u0440\u0430\u043D\u0435\u0435\xBB \u0443 \u0441\u0435\u0440\u0438\u0430\u043B\u0430 \u043F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A \u0441\u0435\u0440\u0438\u0439 \u0441 \u043E\u0442\u043C\u0435\u0442\u043A\u0430\u043C\u0438 \u043E \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u043D\u044B\u0445" }
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
