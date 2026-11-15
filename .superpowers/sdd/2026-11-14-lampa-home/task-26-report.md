# Task 26: new-film rows sort by premiere date
Status: DONE. Rows movies/horror/cartoons: sort primary_release_date.desc, gte=today-365, lte=today+7, digital gate kept. Russian row: premiere sort + 12-month window, release_date.lte=today kept. Catalog movie/cartoon (and ru) new: premiere sort, no window; decade filter now on primary_release_date (release_date.lte digital gate kept).
Tests: 189 pass, 0 fail. Build ok.
TMDB movies row first 8: Хартленд 11-13, Аллен 11-12, 余命一年、男をかう 11-05, Идеальное Рождество для собаки 11-04, Образцовый гражданин 11-03, История Дерри 10-31, Подарочек 10-30, Курс на столкновение 10-30.
Stand "Новые фильмы" first six: Хартленд, Аллен, Идеальное Рождество для собаки, Образцовый гражданин, История Дерри, Подарочек.
Concern: before-titles not captured; decade filter semantic change (premiere instead of digital date).
