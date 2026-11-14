// Row keys in the order defined by the spec.
export const ROWS = ['movies', 'horror', 'anime', 'series', 'cartoons', 'history'];

export const STORAGE_KEYS = {
  progress: 'lh_progress',
  seen: 'lh_seen',
  tvcache: 'lh_tvcache',
  notifyAt: 'lh_notify_at',
  filters: 'lh_filters',
  preload: 'lh_preload',
  settings: 'lh_settings',
};

export const LIMITS = {
  searchTimeoutMs: 12000,
  maxMovieBytes: 60 * 1024 ** 3,
  maxToasts: 3,
  notifyEveryMs: 6 * 3600e3,
  tvCacheMs: 12 * 3600e3,
};

// --- Torrent release selection dictionaries (used by src/torrent-select.js) ---

// Voice studios: id -> regex source (matched case-insensitively, unicode).
export const VOICE_STUDIOS = {
  lostfilm: 'lostfilm|лост ?фильм|лост',
  hdrezka: 'hd ?rezka|rezka',
  anidub: 'anidub',
  anilibria: 'anilibria',
  jaskier: 'jaskier',
  kubik: 'кубик в кубе|kubik',
  newstudio: 'newstudio',
  amedia: 'amedia',
};

// Preferred studios per content kind, best first: index 0 -> +40, index 1 -> +30.
export const VOICE_PREFERENCE = {
  movie: ['lostfilm', 'hdrezka'],
  tv: ['lostfilm', 'hdrezka'],
  anime: ['anidub', 'anilibria'],
};

// Markers of a Russian audio track (regex source). Plain English "dub" is
// deliberately absent: a "Dub" release without RUS is not counted as Russian.
export const RUSSIAN_MARKERS =
  '(?<![\\p{L}\\d])(?:rus(?![\\p{L}\\d])|рус)|дубляж|\\bmvo\\b|\\bdvo\\b|\\bavo\\b|многоголос|двухголос|одноголос|лицензия|itunes|\\bp[12]\\b|(?<![\\p{L}\\d])д(?![\\p{L}\\d])|лост';

export const SCREENER_MARKERS =
  'camrip|\\bcam\\b|telesync|\\bts\\b|\\btc\\b|hdts|hdtc|telecine|экранк|\\bline\\b';

export const DV_MARKERS = '\\bdv\\b|dolby ?vision';
export const HDR_MARKERS = 'hdr10|hdr\\b|\\bp8\\b|profile ?8';

// Scoring weights (penalty-based, not lexicographic).
export const SCORING = {
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
};

// Subtitle-only mentions ("Rus Sub", "RusSub", "Sub Rus", "Русские субтитры",
// "субтитры: рус"): stripped before Russian-audio detection.
export const SUBTITLE_PHRASES =
  '(?<![\\p{L}\\d])(?:rus|рус\\p{L}*)\\s*(?:sub\\p{L}*|субтитр\\p{L}*)|(?:sub\\p{L}*|субтитр\\p{L}*)[\\s:.\\-]*(?:rus(?![\\p{L}\\d])|рус\\p{L}*)';
