// Settings section "Lampa Home": banner, random banner, notifications, cache reset.
import { lampa, storage, noty } from './lampa.js';
import { STORAGE_KEYS } from './config.js';

const COMPONENT = 'lh_settings';
const ICON = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

export function resetCache() {
  storage.set(STORAGE_KEYS.tvcache, {});
  storage.set(STORAGE_KEYS.seen, {});
  noty('Очищено');
}

export function register() {
  const api = lampa().SettingsApi;
  api.addComponent({ component: COMPONENT, name: 'Lampa Home', icon: ICON });
  api.addParam({
    component: COMPONENT,
    param: { name: 'lh_banner', type: 'trigger', default: true },
    field: { name: 'Показывать баннер', description: 'Большой баннер сверху главной страницы' },
  });
  api.addParam({
    component: COMPONENT,
    param: { name: 'lh_banner_random', type: 'trigger', default: false },
    field: { name: 'Случайный баннер', description: 'Случайный фильм из первых пяти вместо первого' },
  });
  api.addParam({
    component: COMPONENT,
    param: { name: 'lh_notify', type: 'trigger', default: true },
    field: { name: 'Уведомления о новых сериях', description: 'При запуске сообщать о новых сериях просматриваемого аниме' },
  });
  api.addParam({
    component: COMPONENT,
    param: { name: 'lh_reset_cache', type: 'button' },
    field: { name: 'Сбросить кэш', description: 'Очистить кэш статусов сериалов и отметки о просмотренных сериях' },
    onChange: resetCache,
  });
}
