# Lampa Home — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Один JS-плагин для Lampa 3.4.7, который заменяет главную на Netflix-подобный экран из лент, добавляет каталоги с фильтрами, кнопку «Играть» с автовыбором раздачи и запуском внешнего плеера, бейджи серий и уведомления о новых сериях аниме.

**Architecture:** Исходники — ES-модули в `src/`, esbuild собирает один IIFE-файл `lampa-home.js` в корне репозитория (его и отдаёт GitHub Pages). Вся чистая логика (запросы TMDB, расчёт серий, выбор раздачи, хранилища) — модули без обращения к `Lampa.*`, покрыты `node:test`. UI-слой (`home`, `catalog`, `play`, `menu`, `notify`) — тонкие обёртки над `Lampa.Maker`/`Activity`/`Torserver`/`Player`, проверяются вручную на стенде (Lampa web в Chrome + Lampa Desktop) и на приставке.

**Tech Stack:** JavaScript (ES2019, без TypeScript), esbuild (единственная dev-зависимость), `node:test`, Node 24, Python 3.13 (только `http.server` при необходимости), git + GitHub Pages, Lampa API 3.4.7 (`Lampa.Maker`, `Lampa.Activity`, `Lampa.Api.sources.tmdb.get`, `Lampa.Parser.get`, `Lampa.Torserver`, `Lampa.Player`, `Lampa.Favorite`, `Lampa.Storage`, `Lampa.Noty`, `Lampa.Select`, `Lampa.SettingsApi`, `Lampa.Filter`).

**Spec:** `I:\DISC\DEV\lampa-home\docs\2026-11-14-lampa-home-design.md`

**Справочник API Lampa:** клон исходников `C:\Users\Akulele\AppData\Local\Temp\claude\67192bcef9c345e1\ecf4856e-f3c5-4e86-aa6e-c05d7c646251\scratchpad\lampa-source` (только чтение; если папки нет — `git clone --depth 1 https://github.com/yumata/lampa-source` в новую пустую папку scratchpad). Ключевые файлы: `src/components/main.js` (образец компонента на `Maker`), `src/interaction/items/line/base.js`, `src/interaction/items/category/base.js`, `src/components/category/full.js`, `src/core/api/sources/tmdb.js` (`get/url/list/main`), `src/core/api/sources/parser.js` (`Parser.get`), `src/interaction/torrent.js` (`list()` — образец сборки плейлиста), `src/interaction/torserver.js`, `src/interaction/player.js:592` (ветка Android), `src/core/android.js`, `src/interaction/timeline.js`, `src/core/favorite.js`, `src/interaction/menu/menu.js`, `src/components/full.js:224` (событие `full complite`), `src/templates/filter.js`, `docs/en/*.md`, `UPGRADE.md`.

## Global Constraints

- Lampa 3.4.7 на приставке (клиент rootu 1.13.6) и в Lampa Desktop на ПК; использовать только `window.Lampa.*`, никаких приватных путей.
- Один выходной файл `lampa-home.js`, без внешних зависимостей в рантайме, CSS инлайнится в него.
- Все ключи `Lampa.Storage` с префиксом `lh_`; все ключи `Lampa.Lang` с префиксом `lh_`; все CSS-классы с префиксом `lh-`; имена компонентов `lh_home`, `lh_catalog`; компонент настроек `lh_settings`.
- Порядок лент: `movies, horror, anime, series, cartoons, history` (ровно так и в этом порядке).
- Меню: видимы только `main, movie, tv, cartoon, anime` (+ `settings`), остальные `data-action` скрыты.
- Таймаут поиска раздачи 12 000 мс; фильмы > 60 ГБ отсеиваются; тостов за запуск ≤ 3; проверка новых серий не чаще раза в 6 ч; кэш TV-деталей 12 ч; лимит данных плагина в Storage ≈ 200 КБ.
- Интерфейс только на русском.
- В репозиторий сайта `euro-build-style` ничего не писать. Работа в `I:\DISC\DEV\lampa-home` (отдельный git-репозиторий).
- Регион цифрового релиза `US`, `with_release_type=4`.
- Качество: не-аниме `2160 → 1080` (720 — только если выше нет вообще); аниме `2160 → 1080 → 720`. Озвучка: фильмы/сериалы `LostFilm → HDRezka → любая русская`; аниме `AniDub → любая русская`.

## Review Focus

1. Раздача с «DV» в названии и без «HDR10»/«P8» — должна быть отсеяна, иначе зелёно-фиолетовая картинка (Task 4: `test_rejects_dv_without_hdr10`).
2. Карточка TMDB без `backdrop_path` — лента не должна ломать сетку и падать (Task 6: `test_card_without_backdrop_gets_poster_fallback`).
3. TorrServer недоступен или парсер вернул ошибку при «Играть» — пользователь должен увидеть тост и штатный список, а не вечный лоадер (Task 11: ручная проверка с выключенным TorrServer).
4. Аниме со сквозной нумерацией (раздача «One Piece — 1095», TMDB S21E20) — «Играть» должен найти файл, а не откатиться (Task 3: `test_absolute_episode_from_seasons`, Task 4: `test_parses_absolute_episode_from_filename`).
5. Lampa обновилась и `Lampa.Maker`/`Api.sources.tmdb.get` отсутствуют — плагин должен откатиться на штатную главную и показать тост, а не оставить чёрный экран (Task 1: `guard()` + ручная проверка подменой `window.Lampa.Maker = undefined` на стенде).

---

## Структура файлов

```
I:\DISC\DEV\lampa-home\
  package.json              build / test / serve
  .gitignore                node_modules, .superpowers
  lampa-home.js             сборка (коммитится, отдаётся GitHub Pages)
  src/index.js              точка входа: guard(), init() после app ready, регистрация модулей
  src/config.js             константы: ROWS, GENRES, лимиты, словари озвучки/качества
  src/lampa.js              тонкие обёртки над Lampa.* (storage, tmdbGet, noty, lang) — единственное место, где UI-модули берут Lampa
  src/tmdb-queries.js       ЧИСТЫЙ: построение url+params для лент и каталогов
  src/tmdb.js               загрузка через Lampa.Api.sources.tmdb.get + кэш TV-деталей
  src/episodes.js           ЧИСТЫЙ: «N из M», сквозной номер, следующая серия, разбор имени файла
  src/torrent-select.js     ЧИСТЫЙ: разбор названия раздачи, отсев, оценка, выбор
  src/store.js              ЧИСТЫЙ (storage инжектится): прогресс серий, «виденные» серии, кэш TV
  src/cards.js              подготовка карточек TMDB к wide-виду + бейджи
  src/home.js               компонент lh_home: баннер + ленты
  src/catalog.js            компонент lh_catalog: чипсы + сетка
  src/menu.js               скрытие пунктов меню, перехват действия main
  src/play.js               кнопка «Играть»: парсер → выбор → TorrServer → плеер
  src/notify.js             тосты о новых сериях при старте
  src/settings.js           раздел настроек
  src/styles.css            тема (инлайнится esbuild loader text)
  test/*.test.js            node:test для чистых модулей
  dev/serve.js              статика: lampa-home.js + стенд
  dev/index.html            стенд: Lampa web 3.4.7 из Roaming + преднастроенный localStorage
  docs/                     спека, план
```

---

### Task 1: Каркас, сборка, стенд

**Files:**
- Create: `package.json`, `.gitignore`, `src/index.js`, `src/lampa.js`, `src/config.js`, `src/styles.css`, `dev/serve.js`, `dev/index.html`, `test/smoke.test.js`

**Interfaces:**
- Produces: `src/lampa.js` экспортирует `storage = {get(key, empty), set(key, value)}` (обёртка `Lampa.Storage.get/set`), `noty(text)`, `t(key)` (= `Lampa.Lang.translate`), `isAndroid()`, `tmdbGet(url, params, ok, fail)` (= `Lampa.Api.sources.tmdb.get`). `src/index.js` экспортирует ничего; на загрузке вызывает `guard()` и `init()`.
- Produces: `src/config.js` экспортирует `ROWS` (массив ключей в порядке спеки), `STORAGE_KEYS = {progress:'lh_progress', seen:'lh_seen', tvcache:'lh_tvcache', notifyAt:'lh_notify_at', filters:'lh_filters', settings:'lh_settings'}`, `LIMITS = {searchTimeoutMs:12000, maxMovieBytes:60*1024**3, maxToasts:3, notifyEveryMs:6*3600e3, tvCacheMs:12*3600e3}`.

- [ ] **Step 1: `git init` в `I:\DISC\DEV\lampa-home`, `package.json`**

`npm init -y`, затем `npm i -D esbuild@0.24`. Скрипты: `"build": "esbuild src/index.js --bundle --format=iife --target=es2019 --loader:.css=text --outfile=lampa-home.js"`, `"test": "node --test test/"`, `"serve": "node dev/serve.js"`. `.gitignore`: `node_modules/`, `.superpowers/`.

- [ ] **Step 2: Smoke-тест сборки**

`test/smoke.test.js`: `test_build_output_is_iife` — после `execSync('npm run build')` файл `lampa-home.js` существует, начинается с `(()=>{` или `(function`, содержит строку `lampa-home`.

- [ ] **Step 3: Запустить тест, убедиться, что падает** — `npm test` → FAIL (нет `src/index.js`).

- [ ] **Step 4: `src/lampa.js`, `src/config.js`, `src/styles.css` (пустая тема с `.lh-home{}`), `src/index.js`**

`src/index.js`:
```js
import css from './styles.css';
const PLUGIN = 'lampa-home', VERSION = '0.1.0';
function guard(){ const L = window.Lampa; return !!(L && L.Maker && L.Activity && L.Api && L.Api.sources && L.Api.sources.tmdb && L.Api.sources.tmdb.get && L.Parser && L.Torserver && L.Player); }
function init(){ /* Task 5+: injectCss(css); menu.init(); home.register(); ... */ console.log(PLUGIN, VERSION, 'loaded'); }
function start(){ if(!guard()){ Lampa.Noty.show('Lampa Home: несовместимая версия Lampa'); return; } init(); }
if(window.lampa_home_ready) {} else { window.lampa_home_ready = true; if(window.appready) start(); else Lampa.Listener.follow('app', e => { if(e.type == 'ready') start(); }); }
```

- [ ] **Step 5: `npm run build && npm test`** → PASS.

- [ ] **Step 6: Стенд `dev/index.html` + `dev/serve.js`**

`dev/serve.js`: HTTP-сервер на `127.0.0.1:8099` (node `http` + `fs`), отдаёт: `/lampa-home.js` из корня, `/` → `dev/index.html`, `/core/app.js` и `/core/app.css` из `C:\Users\Akulele\AppData\Roaming\Lampa\lampa-core\3.4.7\`, заголовок `Access-Control-Allow-Origin: *`, `Cache-Control: no-store`.
`dev/index.html`: копия структуры `index.html` из `lampa-source` (корень репо), но `<link href="/core/app.css">`, `<script src="/core/app.js">`, и ПЕРЕД app.js инлайн-скрипт, который один раз (если нет `localStorage.lh_dev_seeded`) выставляет: `plugins=[{"url":"http://127.0.0.1:8099/lampa-home.js","status":1}]`, `torrserver_url="http://192.168.31.7:8090"`, `jackett_url="jacred.xyz"`, `parser_use=true`, `parser_torrent_type="jackett"`, `language="ru"`, `tmdb_lang="ru"`, `start_page="main"` (значения в формате, в котором их хранит `Lampa.Storage.set` — строки JSON для объектов, как есть для примитивов; сверить с `src/core/storage/storage.js`).

- [ ] **Step 7: Проверить стенд**

Run: `npm run serve` (в фоне), открыть `http://127.0.0.1:8099/` в Chrome (расширение claude-in-chrome) — Lampa загружается, в консоли есть `lampa-home 0.1.0 loaded`. Если Lampa блокирует http-плагин с другого origin — плагин грузится через `Utils.putScriptAsync`, CORS-заголовок уже стоит; проверить консоль.

- [ ] **Step 8: Commit** — `git add -A && git commit -m "chore: scaffold lampa-home plugin, build, dev stand"`.

---

### Task 2: Запросы TMDB (чистый модуль)

**Files:**
- Create: `src/tmdb-queries.js`, `test/tmdb-queries.test.js`

**Interfaces:**
- Produces: `rowQuery(rowKey, today)` → `{url, params}` где `params` — объект в формате `Lampa.Api.sources.tmdb.url` (`genres`, `sort_by`, `page`, `filter:{...}`), `today` — строка `YYYY-MM-DD`. `catalogQuery(kind, filters, page, today)` → то же; `kind ∈ 'movie'|'tv'|'cartoon'|'anime'`, `filters = {genre:number|null, year:number|null, sort:'new'|'rating'}`. `genresFor(kind)` → `[{id, title}]` (для `tv` обязателен `{id:'horror', title:'Ужасы'}`), `GENRE_HORROR_TV_KEYWORDS` — массив id ключевых слов TMDB. `daysAgo(today, n)` → `YYYY-MM-DD`.

- [ ] **Step 1: Тесты**

```js
test_movies_row_uses_digital_release_us: rowQuery('movies','2026-11-14') → url 'discover/movie', params.filter['with_release_type']==='4', params.filter.region==='US', params.sort_by==='primary_release_date.desc', params.filter['primary_release_date.lte']==='2026-11-14', params.filter.without_genres includes '16' and '99'
test_horror_row_adds_genre_27: rowQuery('horror',…).params.genres === 27
test_anime_row_is_tv_jp_animation_recent: rowQuery('anime',…) → url 'discover/tv', params.genres===16, params.filter.with_origin_country==='JP', params.filter['air_date.gte']==='2026-10-31', sort_by 'popularity.desc'
test_series_row_excludes_anime: rowQuery('series',…) → url 'discover/tv', params.filter['air_date.gte']==='2026-10-15', params.filter.without_genres==='16' (документируем: западная анимация попадает в сериалы только через каталог; в ленте «новые сериалы» анимацию не показываем — моё упрощение) 
test_cartoons_row_is_animation_movies: rowQuery('cartoons',…) → genres 16, with_release_type '4', region 'US'
test_catalog_sort_rating_requires_votes: catalogQuery('movie',{genre:null,year:null,sort:'rating'},1,…).params.sort_by==='vote_average.desc' и filter['vote_count.gte']==='100'
test_catalog_year_filter: catalogQuery('movie',{genre:28,year:2024,sort:'new'},2,…) → filter.primary_release_year===2024, genres 28, page 2
test_catalog_tv_horror_uses_keywords: catalogQuery('tv',{genre:'horror',year:null,sort:'new'},1,…).params.keywords === GENRE_HORROR_TV_KEYWORDS.join('|') и нет params.genres
test_catalog_anime_is_tv_jp: catalogQuery('anime',{…}) → url 'discover/tv', genres 16, with_origin_country 'JP'
test_genres_for_tv_has_horror: genresFor('tv').some(g=>g.id==='horror')
```

- [ ] **Step 2: `npm test`** → FAIL (модуля нет).

- [ ] **Step 3: Реализовать `src/tmdb-queries.js`**

Жанры фильмов: 28 Боевик, 12 Приключения, 16 Мультфильм, 35 Комедия, 80 Криминал, 18 Драма, 14 Фэнтези, 27 Ужасы, 9648 Детектив, 10749 Мелодрама, 878 Фантастика, 53 Триллер, 10752 Военный. Жанры TV: 10759 Боевик и приключения, 16 Анимация, 35 Комедия, 80 Криминал, 18 Драма, 9648 Детектив, 10765 Фантастика и фэнтези, `'horror'` Ужасы (keywords). `GENRE_HORROR_TV_KEYWORDS`: взять id из TMDB `search/keyword` для `horror`, `zombie`, `vampire`, `haunted house`, `slasher`, `supernatural horror` (запросить один раз при реализации через `curl 'https://api.themoviedb.org/3/search/keyword?query=horror&api_key=<ключ из lampa-source src/core/tmdb/tmdb.js>'`, зафиксировать числа в коде с комментарием). Для 'series' `air_date.gte = daysAgo(today, 30)`, для 'anime' 14.

- [ ] **Step 4: `npm test`** → PASS.
- [ ] **Step 5: Commit** — `feat: tmdb query builders for rows and catalogs`.

---

### Task 3: Серии (чистый модуль)

**Files:**
- Create: `src/episodes.js`, `test/episodes.test.js`

**Interfaces:**
- Produces: `episodeStatus(tv, today)` → `{season, aired, total, airing}` по объекту `tv` из TMDB `tv/{id}` (`seasons[]`, `last_episode_to_air`, `next_episode_to_air`, `status`, `in_production`); текущий сезон = сезон `last_episode_to_air` (иначе последний сезон с `season_number>0`); `aired` = `last_episode_to_air.episode_number` если тот же сезон, иначе `episode_count`; `total` = `episode_count` этого сезона; `airing = status==='Returning Series' || !!next_episode_to_air`. `absoluteEpisode(seasons, season, episode)` → число (сумма `episode_count` сезонов `1..season-1` + episode; сезон 0 игнорируется). `nextEpisode(progress, status)` → `{season, episode}`: `progress` = `{season, episode}|null`; если null → `{1,1}`; если `episode < total` того же сезона → `episode+1`; иначе `{season+1, 1}`; если `season+1` не существует → остаться на `{season, episode}`. `parseEpisode(filename)` → `{season:number|null, episode:number|null, absolute:number|null}`: распознаёт `S01E05`, `s1e5`, `1x05`, `Сезон 1 Серия 5`, `[05]`, `- 05 `, `E05`, `ep05`, `серия 5`; если есть номер серии без сезона → `absolute` = этот номер, `season=null`.

- [ ] **Step 1: Тесты**

```js
test_status_mid_season: tv={seasons:[{season_number:1,episode_count:12}], last_episode_to_air:{season_number:1,episode_number:7}, next_episode_to_air:{…}, status:'Returning Series'} → {season:1, aired:7, total:12, airing:true}
test_status_finished_season_uses_episode_count: last_episode_to_air в сезоне 2, episode_number 10, seasons[1].episode_count 10 → aired 10, total 10
test_absolute_episode_from_seasons: seasons [{0,5},{1,12},{2,13}] (number,count), season 2 episode 3 → 15
test_next_episode_defaults_to_s1e1: nextEpisode(null, {…}) → {season:1, episode:1}
test_next_episode_rolls_to_next_season: progress {1,12}, seasons[{1,12},{2,13}] → {2,1}
test_next_episode_stays_when_no_next_season: progress {2,13}, seasons[{1,12},{2,13}] → {2,13}
test_parses_sxxexx: parseEpisode('Show.S02E05.1080p.mkv') → {season:2, episode:5, absolute:null}
test_parses_1x05: '1x05' → {1,5}
test_parses_absolute_only: '[AniDub] One Piece - 1095 [1080p].mkv' → {season:null, episode:1095, absolute:1095}
test_parses_cyrillic: 'Сезон 1 Серия 5' → {1,5}
test_no_episode_returns_nulls: 'Movie.2024.2160p.mkv' → {null,null,null} (год не считается серией)
```

- [ ] **Step 2: `npm test`** → FAIL.
- [ ] **Step 3: Реализовать `src/episodes.js`** (регулярки — строителю; год `19xx|20xx` исключать до разбора).
- [ ] **Step 4: `npm test`** → PASS.
- [ ] **Step 5: Commit** — `feat: episode status, absolute numbering, filename parsing`.

---

### Task 4: Выбор раздачи (чистый модуль)

**Files:**
- Create: `src/torrent-select.js`, `test/torrent-select.test.js`
- Modify: `src/config.js` (словари)

**Interfaces:**
- Produces: `parseTitle(title)` → `{resolution:2160|1080|720|480|null, screener:bool, dvOnly:bool, hdr:bool, russian:bool, voice:'lostfilm'|'hdrezka'|'anidub'|'dub'|'mvo'|'other'|null, audio:'ac3'|'aac'|'eac3'|'dts'|'truehd'|null, seasons:number[]|null, episode:{season,episode,absolute}|null}`; `selectTorrent(results, ctx)` → `{chosen: result|null, scored:[{result, score, rejected:string|null}]}` где `results` — массив элементов `Parser.get` (`Title, Size, Seeders, Peers, MagnetUri|Link, Tracker`), `ctx = {kind:'movie'|'tv'|'anime', season?, episode?, absolute?}`.
- Consumes: `parseEpisode` из Task 3.

- [ ] **Step 1: Тесты (данные — реальные названия раздач, см. ниже)**

```js
test_rejects_screener: Title 'Film.2026.TS.1080p' → rejected 'screener'
test_rejects_dv_without_hdr10: 'Film.2026.2160p.WEB-DL.DV.HEVC' → rejected 'dv-only'; 'Film.2026.2160p.WEB-DL.DV.HDR10.P8' → не rejected
test_rejects_no_russian: 'Film.2026.1080p.WEB-DL.ENG.Sub' → rejected 'no-russian'; '... Dub ...' без RUS — rejected; 'Фильм / Film (2026) WEB-DL 1080p | Дубляж' → ok
test_rejects_oversize_movie: Size 70*1024**3, kind movie → rejected 'oversize'; для tv не отсеивается
test_prefers_2160_over_1080_when_alive: два кандидата 2160p (Seeders 20) и 1080p (Seeders 50), обе LostFilm → chosen 2160p
test_dead_2160_loses_to_alive_1080: 2160p Seeders 1 vs 1080p Seeders 30 → chosen 1080p
test_voice_priority_lostfilm_over_hdrezka: обе 1080p, Seeders 20; 'LostFilm' vs 'HDRezka' → LostFilm
test_anime_prefers_anidub_and_allows_720: kind anime; кандидаты 720p AniDub (Seeders 15) и 1080p AniLibria (Seeders 15) → chosen 1080p AniLibria (качество выше озвучки при живых сидах); кандидаты только 720p AniDub → chosen он (не rejected)
test_non_anime_720_only_when_nothing_else: kind movie; только 720p RUS Seeders 30 → chosen он; 720p Seeders 30 + 1080p Seeders 5 → 1080p
test_audio_preference_tiebreak: одинаковое всё, 'AC3' vs 'DTS-HD MA' → AC3
test_smaller_size_tiebreak: одинаковое всё, 8 ГБ vs 12 ГБ → 8 ГБ
test_tv_requires_episode_present: kind tv, season 2 episode 5; 'Show S02 (1-4 of 10)' → rejected 'episode-missing'; 'Show S02 (1-10 of 10)' → ok; 'Show S02E05' → ok; 'Show S01-S03' → ok
test_parses_absolute_episode_from_filename: kind anime, absolute 1095; 'One Piece [1090-1100]' → ok; 'One Piece [1001-1050]' → rejected
test_returns_null_when_all_rejected: chosen null, scored содержит причины
```

- [ ] **Step 2: `npm test`** → FAIL.

- [ ] **Step 3: Реализовать `src/torrent-select.js` + словари в `src/config.js`**

Оценка (штрафная, не лексикографическая): `score = quality + voice + audio + seeds − sizePenalty`, где quality: 2160→100, 1080→80, 720→(anime? 60 : 20); voice: предпочтительная студия ctx.kind → +40, вторая по списку → +30, любая русская → +15; audio ac3/aac/eac3 → +5, dts/truehd → 0; seeds: `min(30, log2(Seeders+1)*5)`, при `Seeders < 3` дополнительно −60; sizePenalty: `Size / 1 ГБ * 0.2`. Словарь студий: `lostfilm`, `hdrezka|hd rezka|rezka`, `anidub`, `anilibria`, `jaskier`, `кубик в кубе|kubik`, `newstudio`, `amedia`; признаки русского: `rus|рус|дубляж|dub(?!bed)|mvo|dvo|avo|многоголос|двухголос|одноголос|лицензия|itunes|p1|p2|д\b|лост|лостфильм` плюс любая студия из словаря; `screener`: `camrip|\bcam\b|telesync|\bts\b|\btc\b|hdts|hdtc|telecine|экранк|\bline\b`; `dvOnly`: есть `\bdv\b|dolby ?vision` и нет `hdr10|hdr\b|p8|profile ?8`. Диапазоны серий: `(\d+)-(\d+)` рядом с `of|из|серии|episodes` или в `[ ]`.

- [ ] **Step 4: `npm test`** → PASS.
- [ ] **Step 5: Commit** — `feat: torrent title parsing and selection scoring`.

---

### Task 5: Хранилища плагина (чистый модуль)

**Files:**
- Create: `src/store.js`, `test/store.test.js`

**Interfaces:**
- Produces: `createStore(storage, now = () => Date.now())` → объект:
  - `progress.get(cardId)` → `{season, episode, hash, updated}|null`; `progress.set(cardId, {season, episode, hash})`;
  - `seen.get(tvId)` → `number|null` (число вышедших серий на момент последней проверки); `seen.set(tvId, aired)`;
  - `tvcache.get(tvId)` → `{status, checked}|null` (вернуть null, если старше `LIMITS.tvCacheMs`); `tvcache.set(tvId, status)`;
  - `notify.due()` → bool (прошло ≥ 6 ч с `lh_notify_at`); `notify.mark()`;
  - `filters.get(kind)` → `{genre, year, sort}` (по умолчанию `{null,null,'new'}`); `filters.set(kind, f)`;
  - `prune()` — оставляет не больше 200 записей в `progress` и `tvcache` (старые по `updated/checked` удаляются).
- `storage` — `{get(key, empty), set(key, value)}` (в проде — `storage` из `src/lampa.js`; в тестах — Map-обёртка).

- [ ] **Step 1: Тесты**
```js
test_progress_roundtrip, test_progress_missing_is_null, test_seen_roundtrip,
test_tvcache_expires_after_12h (now инжектится: set при t0, get при t0+13h → null),
test_notify_due_first_time_true_then_false_after_mark,
test_filters_default, test_filters_per_kind_independent,
test_prune_keeps_200_newest
```
- [ ] **Step 2: `npm test`** → FAIL.
- [ ] **Step 3: Реализовать `src/store.js`** (ключи из `STORAGE_KEYS`).
- [ ] **Step 4: `npm test`** → PASS.
- [ ] **Step 5: Commit** — `feat: plugin storage for progress, seen episodes, tv cache, filters`.

---

### Task 6: Главная — ленты (компонент `lh_home`)

**Files:**
- Create: `src/tmdb.js`, `src/cards.js`, `src/home.js`, `test/cards.test.js`
- Modify: `src/index.js` (регистрация), `src/menu.js` (создать: перехват `main`), `src/styles.css`

**Interfaces:**
- Produces `src/lampa.js` (дополнение): `export const store = createStore(storage)` — единственный экземпляр хранилища для всех UI-модулей (Task 5).
- Produces `src/tmdb.js`: `loadRow(rowKey, today)` → `Promise<{title, results, rowKey}>` (через `tmdbGet(url, params, ok, fail)`; при ошибке — `results: []`); `loadTv(tvId)` → `Promise<tvDetails>`; `loadHistory()` → `Lampa.Favorite.get({type:'history'}).slice(0,20)`.
- Produces `src/cards.js`: `toWideCard(card)` → копия карточки с `params:{style:{name:'wide'}}` и, если нет `backdrop_path`, `backdrop_path = poster_path` + флаг `lh_poster_fallback:true`; `rowTitle(rowKey)` → русский заголовок (`Новые фильмы`, `Новые ужасы`, `Аниме: онгоинги`, `Новые сериалы`, `Новые мультфильмы`, `Недавно просмотренное`).
- Produces `src/home.js`: `register()` — `Lampa.Component.add('lh_home', component)`; `open()` — `Lampa.Activity.push({component:'lh_home', title:'Главная', url:'', page:1, source:'tmdb'})`.
- Produces `src/menu.js`: `init()` — по событию `Lampa.Listener 'menu' {type:'action', action:'main'}` вызывать `e.abort()` и `home.open()`; при старте приложения, если активная activity — `main`, заменить на `lh_home` через `Lampa.Activity.replace({component:'lh_home', title:'Главная'})`.

- [ ] **Step 1: Тест `test/cards.test.js`**
```js
test_card_without_backdrop_gets_poster_fallback: toWideCard({id:1, poster_path:'/p.jpg'}) → backdrop_path '/p.jpg', lh_poster_fallback true, params.style.name 'wide'
test_row_titles_in_order: ROWS.map(rowTitle) deepEqual ['Новые фильмы','Новые ужасы','Аниме: онгоинги','Новые сериалы','Новые мультфильмы','Недавно просмотренное']
```
- [ ] **Step 2: `npm test`** → FAIL. Реализовать `src/cards.js`. `npm test` → PASS.

- [ ] **Step 3: Реализовать `src/tmdb.js` и `src/home.js`**

Компонент по образцу `src/components/main.js`: `comp = Lampa.Maker.make('Main', object)`; в `onCreate` — `Promise.all(ROWS.map(loadRow))` (history — из `loadHistory`), затем `this.build(rows)`, где каждая строка `{title: rowTitle(key), results: results.map(toWideCard), params:{items:{view:5}, lh_row:key}}`; пустые ленты (0 результатов) пропускать; если все пусты — `this.empty()`. В `onInstance` строки: `item.use({onMore: () => catalog.openForRow(key)})` (catalog из Task 9; до него — `Lampa.Noty.show('Каталог: скоро')`), карточки: `card.use({onEnter: Lampa.Router.call.bind(Lampa.Router,'full',data), onFocus: () => Lampa.Background.change(Lampa.Utils.cardImgBackground(data))})`. `Lampa.Activity.loader(true)` на время загрузки.

- [ ] **Step 4: CSS wide-карточек под 5 в ряд**

В `src/styles.css`: `.lh-home .card--wide{width:18.5em}` и `.lh-home .card--wide .card__view{padding-bottom:56.25%}` (точные em подобрать на стенде 1920×1080: пять карточек + половина шестой). Класс `lh-home` ставить на `comp.render(true)` в `onCreate`. `injectCss(css)` в `src/index.js` — `<style id="lh-style">` один раз.

- [ ] **Step 5: `src/menu.js init()` и регистрация в `index.js`**: `init(){ injectCss(css); menu.init(); home.register(); }`.

- [ ] **Step 6: Ручная проверка на стенде**

`npm run build`, перезагрузить `http://127.0.0.1:8099/`. Ожидаемо: при старте открывается `lh_home`, шесть лент в порядке спеки (history может быть пустой — тогда её нет), карточки широкие, стрелки ходят по лентам, Enter открывает карточку, «Главная» в меню возвращает на `lh_home`. Сделать скриншот через расширение Chrome, сравнить с макетом A.

- [ ] **Step 7: Commit** — `feat: Netflix-style home with six rows of wide cards`.

---

### Task 7: Баннер на главной

**Files:**
- Modify: `src/home.js`, `src/styles.css`
- Create: `src/templates.js`

**Interfaces:**
- Produces `src/templates.js`: `register()` — `Lampa.Template.add('lh_banner', html)` с местами `{title} {meta} {overview} {backdrop}` и двумя кнопками `.lh-banner__play.selector` и `.lh-banner__more.selector`; `bannerVars(card)` → `{title: card.title||card.name, meta: 'год · жанр · ★ рейтинг', overview: Lampa.Utils.shortText(card.overview, 180), backdrop: Lampa.Api.img(card.backdrop_path,'w1280')}`.
- Consumes: `play.run(card)` (Task 11; до него кнопка «Играть» вызывает `Lampa.Router.call('full', card)` с тостом «Играть появится позже»).

- [ ] **Step 1: Шаблон и вставка**

После `this.build(rows)` в `onCreate`: первый фильм первой непустой ленты `movies` → `banner = Lampa.Template.get('lh_banner', bannerVars(card))`; вставить `banner` первым элементом в `comp.render(true).querySelector('.scroll__body')` (тело скролла Main). Кнопки: `hover:enter` → `play.run(card)` / `Lampa.Router.call('full', card)`; `hover:focus` → `Lampa.Background.change(...)`. После вставки — `Lampa.Controller.collectionSet(comp.render(true))` не трогать: Main сам пересобирает коллекцию при `toggle`; если баннер недостижим стрелками — вызвать `Lampa.Controller.collectionAppend(banner)` и `collectionFocus` на первой кнопке.

- [ ] **Step 2: CSS**: `.lh-banner{height:45vh; position:relative; background-size:cover}`, градиент слева/снизу, текст слева внизу, кнопки белая/серая, `.focus` — рамка 0.2em белая.

- [ ] **Step 3: Ручная проверка на стенде**: баннер виден, фокус с баннера уходит вниз в первую ленту, «Подробнее» открывает карточку.

- [ ] **Step 4: Commit** — `feat: home banner with Play and Details`.

---

### Task 8: Бейджи «N из M» и загрузка TV-деталей

**Files:**
- Modify: `src/home.js`, `src/tmdb.js`, `src/cards.js`, `src/styles.css`
- Test: `test/cards.test.js`

**Interfaces:**
- Produces `src/cards.js`: `badgeText(status)` → `'7 из 12'`; `applyBadge(cardHtml, status)` — добавляет `<div class="lh-badge">7 из 12</div>` в `.card__view` (один раз).
- Produces `src/tmdb.js`: `tvStatus(tvId, today)` → `Promise<{season, aired, total, airing}>` с кэшем `store.tvcache` (12 ч).
- Consumes: `episodeStatus` (Task 3), `store` (Task 5).

- [ ] **Step 1: Тест** `test_badge_text: badgeText({aired:7,total:12}) === '7 из 12'`; `npm test` → FAIL → реализовать → PASS.

- [ ] **Step 2: Догрузка после отрисовки**

В `onInstance` карточки лент `anime` и `series` (и в history для `original_name`): `card.use({onCreate: ... })` — после появления карточки в DOM вызвать `tvStatus(data.id)` и `applyBadge(card.render(true), status)`. Не более 6 параллельных запросов (простая очередь); порядок карточек не меняется.

- [ ] **Step 3: Ручная проверка**: на карточках аниме и сериалов через 1–3 с появляются бейджи; повторный заход — мгновенно (кэш).

- [ ] **Step 4: Commit** — `feat: episode badges on series and anime cards`.

---

### Task 9: Каталоги с фильтрами (`lh_catalog`)

**Files:**
- Create: `src/catalog.js`
- Modify: `src/home.js` (onMore), `src/menu.js` (перехват `movie/tv/cartoon/anime`), `src/styles.css`

**Interfaces:**
- Produces `src/catalog.js`: `register()`; `open(kind, presetFilters?)` — `Lampa.Activity.push({component:'lh_catalog', kind, title, page:1, source:'tmdb'})`; `openForRow(rowKey)` — маппинг: `movies→('movie',{})`, `horror→('movie',{genre:27})`, `anime→('anime',{sort:'new'})`, `series→('tv',{})`, `cartoons→('cartoon',{})`, `history→Lampa.Activity.push({component:'favorite', type:'history', ...})` (штатный экран истории, см. `favorite.historyActivity()`).
- Consumes: `catalogQuery`, `genresFor` (Task 2), `store.filters` (Task 5), `toWideCard` (Task 6).

- [ ] **Step 1: Компонент**

`comp = Lampa.Maker.make('Category', object, module => module.toggle(Lampa.MaskHelper.MASK.base, 'Explorer', 'Pagination'))` (как `category_full`); `onCreate`/`onNext`: `tmdbGet(q.url, q.params, json => this.build(json.results.map(toWideCard)), this.empty)` с `q = catalogQuery(object.kind, filters, object.page, today)`; `this.total_pages = json.total_pages`. Сетка: `params.items = {cols:4, mapping:'grid'}` под wide-карточки (подобрать `cols`, чтобы было 4 в ряд на 1920).

- [ ] **Step 2: Чипсы**

`filter = new Lampa.Filter(object)`; `filter.set('filter', [{title:'Жанр: '+name, lh:'genre'}, {title:'Год: '+(year||'все'), lh:'year'}])`, `filter.set('sort', [{title:'Сначала новые', lh:'new'}, {title:'По рейтингу', lh:'rating'}])`; `filter.onSelect = (type, a) => { if(type=='sort') setSort(a.lh); else if(a.lh=='genre') Lampa.Select.show({title:'Жанр', items:[{title:'Все', id:null}, ...genresFor(kind)], onSelect: g => setGenre(g.id), onBack: () => Lampa.Controller.toggle('content')}); else — Select с годами [все, 2026…2010, '2000–2009', '1990–1999'] }`. После любого изменения: `store.filters.set(kind, f)`; `object.page = 1`; пересоздать содержимое (`comp.empty()`→`onCreate`) или `Lampa.Activity.replace({...object, page:1})`. `comp.explorer.appendHead(filter.render())` (модуль Explorer).

- [ ] **Step 3: Меню и «Все →»**: в `menu.js` перехватывать действия `movie, tv, cartoon, anime` → `catalog.open(kind)`; в `home.js` `onMore` → `catalog.openForRow(key)`.

- [ ] **Step 4: Ручная проверка**: из меню «Фильмы» — сетка 16:9 с чипсами, «Жанр» открывает список, выбор перестраивает сетку, «По рейтингу» меняет порядок, «Все →» из «Новые ужасы» открывает каталог с чипсом «Жанр: Ужасы», в «Сериалах» в списке жанров есть «Ужасы», фильтр запоминается после выхода и возврата.

- [ ] **Step 5: Commit** — `feat: catalogs with genre, year and sort chips`.

---

### Task 10: Скрытие пунктов меню

**Files:**
- Modify: `src/menu.js`, `src/styles.css`

- [ ] **Step 1:** в `init()` по `Lampa.Listener 'menu' {type:'start', body}` и один раз после `app ready`: для каждого `.menu__item[data-action]` вне `{main, movie, tv, cartoon, anime, settings}` — `addClass('hidden')` (CSS `.hidden{display:none}` есть у Lampa; при сомнении — `.lh-hide{display:none!important}`). Порядок пунктов не менять.
- [ ] **Step 2: Ручная проверка**: в меню шесть пунктов, фокус между ними ходит без «пустых» остановок.
- [ ] **Step 3: Commit** — `feat: hide unused menu items`.

---

### Task 11: «Играть» — автовыбор раздачи и запуск плеера

**Files:**
- Create: `src/play.js`
- Modify: `src/index.js`, `src/home.js` (кнопка баннера), `src/styles.css`

**Interfaces:**
- Produces `src/play.js`: `init()` — подписка `Lampa.Listener.follow('full', e => e.type=='complite' && addButton(e))`; `run(card)` → запускает поток. Внутри: `searchTorrents(card, ctx)` → `Promise<results[]>` (обёртка `Lampa.Parser.get(params, ok, fail)` с таймаутом 12 с; `params` собирать как в `src/components/full/start/torrents.js`: `{search, search_one: card.title, search_two: card.original_title, movie: card, page:1}`; для tv — добавить ` S0N` к `search` как делает Lampa); `startTorrent(result, card, ctx)` — `Lampa.Torserver.hash({title, link: result.MagnetUri||result.Link, poster: card.img, data:{lampa:true, movie:card}}, json => pollFiles(json.hash))` → `Lampa.Torserver.files(hash)` до появления `file_stats` (каждые 2 с, максимум 45 раз) → `buildPlaylist(files, card, hash)` (как `list()` в `src/interaction/torrent.js`: элементы `{title, url: Lampa.Torserver.stream(path, hash, id), torrent_hash: hash, timeline: Lampa.Timeline.view(info.hash, Lampa.Timeline.link(card, season, episode)), season, episode, card}`; `info = Lampa.Torserver.parse({movie:card, files, filename, path, is_file:true})`) → для фильма — элемент с наибольшим `length`; для tv — элемент, чей `parseEpisode(path)` совпадает с `ctx` (season+episode, либо absolute); `Lampa.Player.play(element); Lampa.Player.playlist(playlist); Lampa.Player.callback(() => Lampa.Controller.toggle('content'))`; затем `store.progress.set(card.id, {season, episode, hash})`.
- Consumes: `selectTorrent` (Task 4), `episodeStatus/nextEpisode/absoluteEpisode/parseEpisode` (Task 3), `tvStatus/loadTv` (Task 8), `store` (Task 5).

- [ ] **Step 1: Кнопка на карточке**

В `addButton(e)`: `btn = $('<div class="full-start__button selector lh-play"><span>Играть</span></div>')`, вставить первым в `e.body.find('.full-start-new__buttons')`; `btn.on('hover:enter', () => run(e.data.movie))`. Если контейнера нет (старый шаблон) — `.full-start__buttons`.

- [ ] **Step 2: Поток `run(card)`**

1. `kind` = `anime` если `card.original_name && origin_country включает 'JP' && genre_ids включает 16`, иначе `tv` если `card.original_name`, иначе `movie`.
2. Для tv/anime: `tv = await loadTv(card.id)`; `status = episodeStatus(tv, today)`; `target = nextEpisode(store.progress.get(card.id), status/tv)`; `ctx = {kind, season, episode, absolute: absoluteEpisode(tv.seasons, season, episode)}`.
3. `Lampa.Activity.loader(true)` + тост `Ищу раздачу…`; `results = await searchTorrents(card, ctx)`; `{chosen} = selectTorrent(results, ctx)`.
4. Если `chosen` — `startTorrent(chosen, card, ctx)`; иначе тост `Подходящей раздачи не нашёл, выберите вручную` и штатный переход в список: повторить `Lampa.Activity.push({... component:'torrents' ...})` как в `torrents.js`.
5. Любая ошибка/таймаут → `Lampa.Activity.loader(false)`, тост с причиной (`TorrServer недоступен`, `Парсер не ответил`), откат в список раздач.
6. Back во время поиска — отменяет (флаг `cancelled`, результат игнорируется).

- [ ] **Step 3: Ручная проверка на стенде (ПК)**: на карточке фильма «Играть» → через несколько секунд открывается встроенный плеер Lampa с потоком с TorrServer (на ПК `player_torrent` = inner). На карточке сериала — стартует следующая серия, после закрытия плеера `lh_progress` содержит запись. С выключенным TorrServer (остановить процесс на ПК на минуту) — тост и список раздач, лоадер снят.

- [ ] **Step 4: Ручная проверка на приставке (после Task 15)**: `player_torrent = android`, Vimu открывается с плейлистом и нужной серией; Back из Vimu возвращает в карточку.

- [ ] **Step 5: Commit** — `feat: Play button with automatic torrent selection and playlist start`.

---

### Task 12: Уведомления о новых сериях аниме

**Files:**
- Create: `src/notify.js`
- Modify: `src/index.js`

**Interfaces:**
- Produces: `checkNewEpisodes()` → `Promise<[{card, status}]>` — для карточек из `Lampa.Favorite.get({type:'history'})` + `book`, у которых `kind=='anime'` (признак как в Task 11): `status = await tvStatus(id)`; если `status.airing && store.seen.get(id) != null && status.aired > store.seen.get(id)` → в список; после — `store.seen.set(id, status.aired)` для всех (первый запуск только запоминает). Запуск: после `app ready`, если `store.notify.due()`; показать до 3 тостов `Вышла {aired} серия: {name}` по 5 с, при большем числе — четвёртый тост `и ещё N`; затем `store.notify.mark()`.
- Consumes: `tvStatus` (Task 8), `store` (Task 5).

- [ ] **Step 1: Тест** `test/notify.test.js`: вынести чистую функцию `diffNewEpisodes(items, seenGetter)` → `[{id, aired}]` и проверить: новая серия → в списке; впервые увиденный тайтл → не в списке; не в эфире → не в списке.
- [ ] **Step 2: `npm test`** → FAIL → реализовать → PASS.
- [ ] **Step 3: Ручная проверка**: на стенде добавить аниме-онгоинг в историю (открыть карточку), в консоли выставить `lh_seen[id]` на `aired-1` и `lh_notify_at=0`, перезагрузить — тост появился один раз, второй раз — нет.
- [ ] **Step 4: Commit** — `feat: new-episode toasts for watched anime`.

---

### Task 13: Настройки плагина

**Files:**
- Create: `src/settings.js`
- Modify: `src/index.js`, `src/home.js`

**Interfaces:**
- Produces: `register()` — `Lampa.SettingsApi.addComponent({component:'lh_settings', name:'Lampa Home', icon: svg})`; параметры (`Lampa.SettingsApi.addParam`): `lh_banner` (trigger, default true — показывать баннер), `lh_banner_random` (trigger, default false — случайный из первых пяти), `lh_notify` (trigger, default true), `lh_reset_cache` (button — очищает `lh_tvcache`, `lh_seen`, тост «Очищено»). Читать через `Lampa.Storage.field('lh_banner')` и т.д.
- [ ] **Step 1: Реализовать, подключить флаги в `home.js` и `notify.js`.**
- [ ] **Step 2: Ручная проверка**: раздел виден в Настройках, выключение баннера применяется при следующем открытии главной.
- [ ] **Step 3: Commit** — `feat: settings section`.

---

### Task 14: Тема «как Netflix» и доводка

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1:** Фон `#141414` для `.lh-home`, `.lh-catalog`; заголовки лент 1.6em/700; `.card--wide .card__title` поверх кадра с градиентом снизу; фокус — `transform: scale(1.06)` + белая рамка; бейдж `.lh-badge` — тёмный с рамкой, в левом верхнем углу; `.lh-play` кнопка белая с чёрным текстом. Прогресс-бар в history — штатный `timeline` Lampa, только цвет `#e50914`.
- [ ] **Step 2: Ручная проверка** на стенде и в Lampa Desktop (добавить плагин по URL `http://127.0.0.1:8099/lampa-home.js` через «Настройки → Расширения»): скриншоты главной, каталога, карточки; сравнить с макетом A.
- [ ] **Step 3: Commit** — `style: Netflix-like theme`.

---

### Task 15: Выкладка на GitHub Pages и установка на приставку

**Files:**
- Create: `README.md` (как установить, адрес плагина, как обновлять)
- Modify: `package.json` (`"release": "npm run build && git add lampa-home.js && git commit -m 'build' && git push"`)

- [ ] **Step 1: Установить `gh`**: `winget install --id GitHub.cli -e`; пользователь выполняет `! gh auth login` (браузерный вход, аккаунт пользователя — спросить, личный или `amod-group`; по умолчанию личный).
- [ ] **Step 2: Репозиторий**: `gh repo create lampa-home --public --source . --remote origin --push`.
- [ ] **Step 3: Pages**: `gh api -X POST repos/{owner}/lampa-home/pages -f build_type=legacy -f "source[branch]=main" -f "source[path]=/"`; через 1–2 минуты `curl -I https://<owner>.github.io/lampa-home/lampa-home.js` → 200.
- [ ] **Step 4: Установка на Ugoos**: в Lampa «Настройки → Расширения → Добавить плагин» → `https://<owner>.github.io/lampa-home/lampa-home.js?v=1`; перезапуск Lampa. Обновление плагина — поменять `?v=` в адресе (Lampa кэширует файл).
- [ ] **Step 5: Проверка на приставке** по чек-листу: главная, пульт по лентам и баннеру, каталоги и чипсы, «Играть» на фильме и на сериале с Vimu, бейджи, меню из шести пунктов. Результаты записать в `README.md` раздел «Проверено».
- [ ] **Step 6: Commit** — `docs: install and release instructions`.

---

### Task 16: «Скачать заранее» и экран «Скачанное» с удалением

Факты, установленные экспериментами 2026-11-14 на сервере пользователя (TorrServer MatriX 150, кэш на диске `E:\torrServer`):
- Кэш задаётся **на одну раздачу** (`torrstor.NewCache(s.capacity)` на каждый торрент). С `CacheSize ≥ размера файла` и `PreloadCache = 100 %` вызов `GET /stream?link=<hash>&index=<id>&preload` докачивает файл целиком (проверено: рост с 526 МБ до 1,3 ГБ за 3 мин, цель = весь файл).
- Файлы кэша удаляются только в `Cache.Close()` и только при `RemoveCacheOnDrop = true`; `Close()` вызывается и при удалении, и при закрытии по простою — поэтому флаг держим **выключенным**.
- **`POST /settings {action:'set'}` пересоздаёт BT-клиент и закрывает все активные торренты.** С временно включённым `RemoveCacheOnDrop` это стёрло кэш и у удаляемого, и у докачивавшегося фильма. Плагин **никогда не меняет настройки TorrServer**.
- Вывод: удалить папку с приставки через сам TorrServer нельзя. Нужен крошечный помощник на ПК.

**Files:**
- Create: `helper/ts-clean.js`, `helper/README.md`, `src/downloads.js`, `test/downloads.test.js`
- Modify: `src/play.js` (вынести `resolveTarget(card)` и `startFromHash(hash, card, ctx)`), `src/menu.js` (пункт «Скачанное»), `src/settings.js` (`lh_helper_url`), `src/config.js` (`STORAGE_KEYS.preload = 'lh_preload'`), `README.md`

**Interfaces:**
- Produces `helper/ts-clean.js` (Node 24, без зависимостей): HTTP на `0.0.0.0:8091`; при старте читает `TorrentsSavePath` из `POST http://127.0.0.1:8090/settings {action:'get'}`; `GET /status` → `{free_bytes, folders:[{hash, bytes}]}`; `POST /delete {hash}` → проверяет `^[0-9a-f]{40}$`, вызывает `POST /torrents {action:'rem', hash}` на TorrServer, ждёт 2 с, удаляет `<TorrentsSavePath>\<hash>` рекурсивно, отвечает `{ok:true}`; CORS `Access-Control-Allow-Origin: *` и ответ на `OPTIONS`; никаких других путей не удаляет. Запуск: ярлык `node ts-clean.js` в автозагрузке рядом с TorrServer (инструкция в `helper/README.md`).
- Produces `src/downloads.js`: `preload(card)` — `resolveTarget(card)` → `searchTorrents` → `selectTorrent` → `POST <torrserver>/torrents {action:'add', link, title:'[LAMPA] '+title, poster, save_to_db:true, data:{lampa:true, movie:card}}` → `GET /stream?link=&index=&preload` (fetch, ответ не ждём дольше 3 с) → `store.preload.set(card.id, {hash, index, title, season, episode, size, added})` → тост «Закачка начата»; `status(hash)` → `Promise<{loaded, size, done}>` по `POST /torrents {action:'get', hash}` (`done = loaded_size >= size файла`); `remove(cardId)` → `POST <helper>/delete {hash}` → `store.preload.remove(cardId)`; компонент `lh_downloads` (`Lampa.Maker.make('Category', …)`, wide-карточки из `store.preload.all()` с бейджем «Качается 45 %» / «Скачано»; обновление раз в 5 с пока экран открыт); Enter → `startFromHash(hash, card, ctx)` (минуя поиск); Long → `Lampa.Select` «Удалить с диска» / «Отмена».
- Produces `src/store.js` (дополнение): `preload.get/set/remove/all`.
- Produces: пункт «Скачать заранее» в опциях карточки через `Lampa.Listener 'full' {type:'options', options}` → `options.push({title:'Скачать заранее', onSelect:()=>preload(card)})`; пункт меню «Скачанное» через `Lampa.Menu.addButton(svg, 'Скачанное', 'lh_downloads')` (расширение списка из спеки — моё решение, без него к скачанному не добраться).
- Настройка `lh_helper_url` (input, default `http://192.168.31.7:8091`).

- [ ] **Step 1: Тесты** `test/downloads.test.js` для чистых кусков: `preloadProgress({loaded_size, file_stats, index})` → `{percent, done}`; `test_done_when_loaded_reaches_file_length`, `test_percent_rounds_down`.
- [ ] **Step 2: `npm test`** → FAIL → реализовать `src/downloads.js` (чистые функции + UI) → PASS.
- [ ] **Step 3: Помощник**: написать `helper/ts-clean.js`; проверить с ПК: `curl -X POST http://127.0.0.1:8091/delete -d '{"hash":"<hash тестового Sintel 08ada5a7…>"}'` после добавления Sintel-торрента (`magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10`) → папка исчезла, остальные папки на месте; `curl http://127.0.0.1:8091/status` → JSON.
- [ ] **Step 4: Ручная проверка на стенде**: «Скачать заранее» → торрент появился в списке TorrServer со статусом preload, в «Скачанное» карточка с процентами; «Удалить» → карточка исчезла, папка удалена.
- [ ] **Step 5: README**: настройки TorrServer для предзакачки (кэш на диске, размер ≥ самого большого файла, которые планируется качать, предзагрузка 100 %, «удалять кеш при удалении» ВЫКЛ), автозапуск помощника.
- [ ] **Step 6: Commit** — `feat: preload to disk and Downloads screen with delete via PC helper`.
