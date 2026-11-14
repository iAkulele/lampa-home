// Row keys in the order defined by the spec.
export const ROWS = ['movies', 'horror', 'anime', 'series', 'cartoons', 'history'];

export const STORAGE_KEYS = {
  progress: 'lh_progress',
  seen: 'lh_seen',
  tvcache: 'lh_tvcache',
  notifyAt: 'lh_notify_at',
  filters: 'lh_filters',
  settings: 'lh_settings',
};

export const LIMITS = {
  searchTimeoutMs: 12000,
  maxMovieBytes: 60 * 1024 ** 3,
  maxToasts: 3,
  notifyEveryMs: 6 * 3600e3,
  tvCacheMs: 12 * 3600e3,
};
