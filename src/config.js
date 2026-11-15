// Row keys in the order defined by the spec.
export const ROWS = ['movies', 'horror', 'anime', 'series', 'cartoons', 'russian', 'history'];

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
  anilibria: 'anilibria|aniliberty',
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
  '(?<![\\p{L}\\d])(?:rus(?![\\p{L}\\d])|рус)|дубляж|дубл\\.|(?<![\\p{L}\\d])дб(?![\\p{L}\\d])|озвуч|(?<![\\p{L}\\d])озв\\.|\\|\\s*d\\s*(?=\\||$)|\\bmvo\\b|\\bdvo\\b|\\bavo\\b|многоголос|двухголос|одноголос|лицензия|itunes|\\bp[12]\\b|(?<![\\p{L}\\d])д(?![\\p{L}\\d])|лост';

// Explicit voice-over / dub markers (stronger than a bare "Rus"): a raw-looking
// title with one of these is still a voiced release.
export const VOICE_MARKERS =
  'дубляж|дубл\\.|(?<![\\p{L}\\d])дб(?![\\p{L}\\d])|озвуч|(?<![\\p{L}\\d])озв\\.|\\bmvo\\b|\\bdvo\\b|\\bavo\\b|многоголос|двухголос|одноголос|\\|\\s*d\\s*(?=\\||$)';

// Russian audio as a separate (external) track: Russian, but scored lower.
export const EXT_AUDIO_MARKERS = 'rus[\\s.]*\\(?\\s*ext|внешн';

// Raw: original audio without a voice-over (anime only: "Raw" is also a film title).
export const RAW_MARKERS = '(?<![\\p{L}\\d])raws?(?![\\p{L}\\d])';

// Subtitle-only releases (fansub groups, "Sub", "СТ", "субтитры").
export const SUBS_ONLY_MARKERS =
  'subsplease|erai-raws|субтитр|(?<![\\p{L}])subs?(?![\\p{L}])|(?<![\\p{L}\\d])ст(?![\\p{L}\\d])';

// Russian anime voice-over studios (Russian audio); checked for anime only:
// "JAM", "Amber" are ordinary words in other titles.
export const ANIME_VOICE_STUDIOS =
  'anidub|anilibria|aniliberty|anistar|studio ?band|dream ?cast|(?<![\\p{L}\\d])jam(?![\\p{L}\\d])|animaunt|shiza|(?<![\\p{L}\\d])nda(?![\\p{L}\\d])|(?<![\\p{L}\\d])amber(?![\\p{L}\\d])|anirise|persona99|ancord|cuba77';

export const SCREENER_MARKERS =
  'camrip|\\bcam\\b|telesync|\\bts\\b|\\btc\\b|hdts|hdtc|telecine|экранк|\\bline\\b';

export const DV_MARKERS = '\\bdv\\b|\\bdovi\\b|dolby[ ._-]?vision';
// Dolby Vision profile 5 has no HDR10 base layer: rejected even when HDR10 is named.
export const DV_P5_MARKERS = '\\bp5\\b|profile ?5';
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
  // Russian audio only as an external track.
  extAudioPenalty: 25,
  // Anime release with no audio info at all: used only when nothing explicit is there.
  unknownVoicePenalty: 40,
};

// Subtitle-only mentions are stripped before Russian-audio detection:
// "Rus Sub", "RusSub", "Rus. Sub", "Русские субтитры" (language before the word) and
// "Sub Rus", "субтитры: рус", "Subs: Rus, Eng", "Sub (Rus, Eng)" (a language list after it).
const SUB_WORD = '(?:sub(?:s|titles?)?(?!\\p{L})|субтитр\\p{L}*)';
const SUB_LANG = '(?:(?:rus|eng|ukr|jap)\\p{L}*|рус\\p{L}*|англ\\p{L}*|укр\\p{L}*)';
export const SUBTITLE_PHRASES =
  '(?<![\\p{L}\\d])(?:rus|рус\\p{L}*)[\\s.]*' + SUB_WORD +
  '|(?<![\\p{L}\\d])' + SUB_WORD + '[\\s:.(\\-]*(?:' + SUB_LANG + '[\\s,+/.]*)+\\)?';
