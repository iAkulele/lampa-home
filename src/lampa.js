// Thin wrappers over the global Lampa API; the only module that touches window.Lampa.
export const storage = {
  get: (key, empty) => window.Lampa.Storage.get(key, empty),
  set: (key, value) => window.Lampa.Storage.set(key, value),
};

export const noty = (text) => window.Lampa.Noty.show(text);

export const t = (key) => window.Lampa.Lang.translate(key);

export const isAndroid = () => window.Lampa.Platform.is('android');

export const tmdbGet = (url, params, ok, fail) =>
  window.Lampa.Api.sources.tmdb.get(url, params, ok, fail);
