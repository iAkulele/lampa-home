// Real TMDB titles (ru-RU card + tv/{id}/alternative_titles), 2026-11-15, trimmed.

export const CHEAT_RU = 'Изгнанный читер-чародей наслаждается беззаботной второй жизнью: Я могу накладывать «очки усиления» не только на оружие, но и на что угодно, в любой момент отменяя эффект по собственной воле, а с теми, кто остался, всё нормально?';
export const CHEAT_JP = '追放されたチート付与魔術師は気ままなセカンドライフを謳歌する。 ～俺は武器だけじゃなく、あらゆるものに『強化ポイント』を付与できるし、俺の意思でいつでも効果を解除できるけど、残った人たち大丈夫？～';
export const CHEAT_CARD = { id: 313346, name: CHEAT_RU, title: CHEAT_RU, original_name: CHEAT_JP, original_title: CHEAT_JP, first_air_date: '2026-01-08', genres: [] };
export const CHEAT_ALTS = {
  results: [
    { iso_3166_1: 'CN', title: '被放逐的作弊赋予魔术师享受随心所欲的第二人生。' },
    { iso_3166_1: 'JP', title: 'チー付与' },
    { iso_3166_1: 'JP', title: 'Chii Fuyo' },
    { iso_3166_1: 'JP', title: 'Cheat Fuyo' },
    { iso_3166_1: 'JP', title: 'Tsuihou Sareta Cheat Fuyo Majutsushi wa Kimamana Second Life wo Ouka Suru. Ore wa Buki dake janaku, Arayuru Mono ni "Kyouka Point" wo Fuyo Dekiru shi' },
    { iso_3166_1: 'JP', title: 'Chi-Fuyo' },
    { iso_3166_1: 'JP', title: 'Tsuihou sareta Cheat Fuyo Majutsushi wa Kimama na Second Life wo Ouka suru' },
    { iso_3166_1: 'RU', title: 'Изгнанный читер-чародей наслаждается беззаботной второй жизнью' },
    { iso_3166_1: 'US', title: 'The Laid Off Cheat Granting Mage Enjoys a Second Life' },
  ],
};

export const FIRE_CARD = { id: 320909, name: 'Свадьба светлячков', title: 'Свадьба светлячков', original_name: 'ホタルの嫁入り', original_title: 'ホタルの嫁入り', first_air_date: '2026-10-05' };
export const FIRE_ALTS = { results: [{ iso_3166_1: 'JP', title: 'Hotaru no Yomeiri' }, { iso_3166_1: 'US', title: 'Firefly Wedding' }] };

// «Магическая битва» when TMDB alternative titles are unavailable.
export const JJK_CARD = { id: 95479, name: 'МАГИЧЕСКАЯ БИТВА', title: 'МАГИЧЕСКАЯ БИТВА', original_name: '呪術廻戦', original_title: '呪術廻戦' };
