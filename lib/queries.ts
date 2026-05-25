// Запросы к БД для страниц.
// Возвращают уже распарсенные объекты по типам из lib/types.ts.

import "server-only";

import { db } from "./db";
import type { Film, Motif, Person, Studio, Topic } from "./types";

interface FilmRow {
  id: string;
  year: number;
  title_ru: string | null;
  title_original: string | null;
  country: string | null;
  data: string;
}

interface PersonRow {
  id: string;
  name_ru: string | null;
  data: string;
}

interface StudioRow {
  id: string;
  name_ru: string | null;
  country: string | null;
  data: string;
}

export interface FilmListItem {
  id: string;
  title_ru: string;
  title_original: string;
  year: number;
  country: string[];
  poster_commons?: string;
  poster_tmdb_path?: string;
  /** Год советского проката — только для зарубежных фильмов. */
  soviet_release_year?: number;
}

export function listFilms(opts?: {
  year?: number;
  country?: string;
  studio?: string;
  topic?: string;
  genre?: string;
  director?: string;
  limit?: number;
}): FilmListItem[] {
  const conn = db();
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts?.year != null) {
    where.push("year = ?");
    params.push(opts.year);
  }
  if (opts?.country) {
    // country хранится через запятую («SU», «SU,PL»). Простой LIKE
    // подойдёт на 1k+ строк; нормализуем при росте до 10k+.
    where.push(
      "(country = ? OR country LIKE ? OR country LIKE ? OR country LIKE ?)",
    );
    const c = opts.country;
    params.push(c, `${c},%`, `%,${c}`, `%,${c},%`);
  }
  // studio и topics лежат в JSON-поле data как массивы slug-ов.
  // json_each раскрывает массив, точное совпадение по value.
  if (opts?.studio) {
    where.push(
      `id IN (
        SELECT films.id FROM films, json_each(json_extract(films.data, '$.studio')) je
        WHERE je.value = ?
      )`,
    );
    params.push(opts.studio);
  }
  if (opts?.topic) {
    where.push(
      `id IN (
        SELECT films.id FROM films, json_each(json_extract(films.data, '$.topics')) je
        WHERE je.value = ?
      )`,
    );
    params.push(opts.topic);
  }
  if (opts?.genre) {
    where.push(
      `id IN (
        SELECT films.id FROM films, json_each(json_extract(films.data, '$.genre')) je
        WHERE je.value = ?
      )`,
    );
    params.push(opts.genre);
  }
  if (opts?.director) {
    where.push(
      `id IN (
        SELECT films.id FROM films, json_each(json_extract(films.data, '$.director')) je
        WHERE je.value = ?
      )`,
    );
    params.push(opts.director);
  }
  const sql = `
    SELECT id, year, title_ru, title_original, country,
           json_extract(data, '$.poster_commons') AS poster_commons,
           json_extract(data, '$.poster_tmdb_path') AS poster_tmdb_path
    FROM films
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY year DESC, title_ru COLLATE NOCASE
    ${opts?.limit ? "LIMIT ?" : ""}
  `;
  if (opts?.limit) params.push(opts.limit);
  const rows = conn.prepare(sql).all(...params) as (FilmRow & {
    poster_commons: string | null;
    poster_tmdb_path: string | null;
  })[];
  return rows.map((r) => ({
    id: r.id,
    title_ru: r.title_ru ?? r.id,
    title_original: r.title_original ?? r.title_ru ?? r.id,
    year: r.year,
    country: r.country ? r.country.split(",") : [],
    poster_commons: r.poster_commons ?? undefined,
    poster_tmdb_path: r.poster_tmdb_path ?? undefined,
  }));
}

export function countFilms(): number {
  const conn = db();
  const row = conn.prepare("SELECT COUNT(*) AS c FROM films").get() as { c: number };
  return row.c;
}

export function availableYears(country?: string): number[] {
  const conn = db();
  if (!country) {
    const rows = conn
      .prepare("SELECT DISTINCT year FROM films WHERE year IS NOT NULL ORDER BY year DESC")
      .all() as { year: number }[];
    return rows.map((r) => r.year);
  }
  const rows = conn
    .prepare(
      `SELECT DISTINCT year FROM films
       WHERE year IS NOT NULL
         AND (country = ? OR country LIKE ? OR country LIKE ? OR country LIKE ?)
       ORDER BY year DESC`,
    )
    .all(country, `${country},%`, `%,${country}`, `%,${country},%`) as { year: number }[];
  return rows.map((r) => r.year);
}

/**
 * Жанры с количеством фильмов в текущей выборке. Аналогично странам:
 * показываем все из словаря, count — для year/country фильтра.
 */
export function availableGenres(opts?: {
  year?: number;
  country?: string;
}): { code: string; count: number }[] {
  const conn = db();
  const allCodes = (
    conn
      .prepare("SELECT code FROM vocabulary WHERE kind = 'genre' ORDER BY rowid")
      .all() as { code: string }[]
  ).map((r) => r.code);

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts?.year != null) {
    where.push("films.year = ?");
    params.push(opts.year);
  }
  if (opts?.country) {
    where.push(
      "(films.country = ? OR films.country LIKE ? OR films.country LIKE ? OR films.country LIKE ?)",
    );
    const c = opts.country;
    params.push(c, `${c},%`, `%,${c}`, `%,${c},%`);
  }
  const rows = conn
    .prepare(
      `SELECT je.value AS code, COUNT(*) AS c
         FROM films, json_each(json_extract(films.data, '$.genre')) je
         ${where.length ? "WHERE " + where.join(" AND ") : ""}
        GROUP BY je.value`,
    )
    .all(...params) as { code: string; c: number }[];
  const countsMap = new Map(rows.map((r) => [r.code, r.c]));
  return allCodes.map((code) => ({ code, count: countsMap.get(code) ?? 0 }));
}

/**
 * Список всех стран из словаря с количеством фильмов в текущей выборке.
 * Страны без фильмов (например, МНР) тоже возвращаются — с count = 0;
 * UI показывает их приглушённо, чтобы фильтр был полным и стабильным.
 */
export function availableCountries(year?: number): { code: string; count: number }[] {
  const conn = db();
  // Все коды из словаря — в порядке, как они лежат в vocabularies/countries.yaml.
  const allCodes = (
    conn
      .prepare("SELECT code FROM vocabulary WHERE kind = 'country' ORDER BY rowid")
      .all() as { code: string }[]
  ).map((r) => r.code);

  const rows = (year != null
    ? conn.prepare("SELECT country FROM films WHERE year = ?").all(year)
    : conn.prepare("SELECT country FROM films").all()) as { country: string | null }[];
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.country) continue;
    for (const c of r.country.split(",")) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  return allCodes.map((code) => ({ code, count: counts.get(code) ?? 0 }));
}

export function getFilm(id: string): Film | null {
  const conn = db();
  const row = conn
    .prepare("SELECT data FROM films WHERE id = ?")
    .get(id) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data) as Film;
}

/**
 * Slug-и фильмов для пре-рендера статических страниц.
 *
 * Пропускаем «пустышки», где после enrich так и не появилось ни
 * director/cast, ни постера. Их детальная страница — это просто
 * title+year, ценности мало. Они остаются в каталоге /films и
 * фильмографиях, но клик ведёт на 404. После того как редактор
 * добавит данные — попадут в пре-рендер.
 *
 * Это нужно чтобы суммарное число файлов в out/ влезало в 20k
 * Cloudflare Pages free tier.
 */
export function staticFilmIds(): string[] {
  const conn = db();
  const rows = conn.prepare("SELECT id, data FROM films").all() as {
    id: string;
    data: string;
  }[];
  const out: string[] = [];
  for (const r of rows) {
    const f = JSON.parse(r.data) as Film;
    // Под 20k CFP-лимит: фильм должен быть «не пустой».
    // Минимум director + ещё хотя бы одно из:
    //   - cast (актёры)
    //   - poster_commons / poster_tmdb_path (постер)
    //   - topics (явная тема)
    // Это отсеивает заглушки где enrich подтянул только режиссёра.
    const hasDir = (f.director?.length ?? 0) > 0;
    const hasExtras =
      (f.cast?.length ?? 0) > 0 ||
      !!f.poster_commons ||
      !!f.poster_tmdb_path ||
      (f.topics?.length ?? 0) > 0;
    if (hasDir && hasExtras) out.push(r.id);
  }
  return out;
}

export function allFilmIds(): string[] {
  const conn = db();
  const rows = conn.prepare("SELECT id FROM films").all() as { id: string }[];
  return rows.map((r) => r.id);
}

export interface PersonListItem {
  id: string;
  name_ru: string;
  roles: string[];
  birth?: string;
  death?: string;
  image_commons?: string;
}

/** Топ-N режиссёров по количеству фильмов. Для главной. */
export interface TopDirector {
  id: string;
  name_ru: string;
  image_commons?: string;
  film_count: number;
}

/**
 * Топ актёров по числу фильмов. Структурно как topDirectors, но идёт
 * через cast — массив из { person, role }.
 */
export function topActors(limit = 12): TopDirector[] {
  const conn = db();
  const rows = conn
    .prepare(
      `SELECT je.value ->> '$.person' AS actor, COUNT(*) AS c
         FROM films, json_each(json_extract(films.data, '$.cast')) je
        WHERE actor IS NOT NULL
        GROUP BY actor
        ORDER BY c DESC
        LIMIT ?`,
    )
    .all(limit) as { actor: string; c: number }[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.actor);
  const placeholders = ids.map(() => "?").join(",");
  const people = conn
    .prepare(`SELECT id, data FROM people WHERE id IN (${placeholders})`)
    .all(...ids) as { id: string; data: string }[];
  const map = new Map(people.map((p) => [p.id, JSON.parse(p.data) as Person]));
  return rows.map((r) => {
    const p = map.get(r.actor);
    return {
      id: r.actor,
      name_ru: p?.name_ru ?? r.actor,
      image_commons: p?.image_commons,
      film_count: r.c,
    };
  });
}

/** Топ режиссёров конкретной студии — для блока на /studios/[slug]. */
export function topDirectorsOfStudio(
  studioId: string,
  limit = 8,
): TopDirector[] {
  const conn = db();
  const rows = conn
    .prepare(
      `SELECT d.value AS director, COUNT(*) AS c
         FROM films,
              json_each(json_extract(films.data, '$.studio')) s,
              json_each(json_extract(films.data, '$.director')) d
        WHERE s.value = ?
        GROUP BY d.value
        ORDER BY c DESC
        LIMIT ?`,
    )
    .all(studioId, limit) as { director: string; c: number }[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.director);
  const placeholders = ids.map(() => "?").join(",");
  const people = conn
    .prepare(`SELECT id, data FROM people WHERE id IN (${placeholders})`)
    .all(...ids) as { id: string; data: string }[];
  const map = new Map(people.map((p) => [p.id, JSON.parse(p.data) as Person]));
  return rows.map((r) => {
    const p = map.get(r.director);
    return {
      id: r.director,
      name_ru: p?.name_ru ?? r.director,
      image_commons: p?.image_commons,
      film_count: r.c,
    };
  });
}

export function topDirectors(limit = 12): TopDirector[] {
  const conn = db();
  const rows = conn
    .prepare(
      `SELECT je.value AS director, COUNT(*) AS c
         FROM films, json_each(json_extract(films.data, '$.director')) je
        GROUP BY je.value
        ORDER BY c DESC
        LIMIT ?`,
    )
    .all(limit) as { director: string; c: number }[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.director);
  const placeholders = ids.map(() => "?").join(",");
  const people = conn
    .prepare(`SELECT id, data FROM people WHERE id IN (${placeholders})`)
    .all(...ids) as { id: string; data: string }[];
  const map = new Map(people.map((p) => [p.id, JSON.parse(p.data) as Person]));
  return rows.map((r) => {
    const p = map.get(r.director);
    return {
      id: r.director,
      name_ru: p?.name_ru ?? r.director,
      image_commons: p?.image_commons,
      film_count: r.c,
    };
  });
}

export function availableRoles(): { code: string; count: number }[] {
  const conn = db();
  const allCodes = (
    conn
      .prepare("SELECT code FROM vocabulary WHERE kind = 'role' ORDER BY rowid")
      .all() as { code: string }[]
  ).map((r) => r.code);
  const rows = conn
    .prepare(
      `SELECT je.value AS code, COUNT(*) AS c
         FROM people, json_each(json_extract(people.data, '$.roles')) je
        GROUP BY je.value`,
    )
    .all() as { code: string; c: number }[];
  const counts = new Map(rows.map((r) => [r.code, r.c]));
  return allCodes.map((code) => ({ code, count: counts.get(code) ?? 0 }));
}

export function listPeople(opts?: { role?: string }): PersonListItem[] {
  const conn = db();
  const sql = opts?.role
    ? `SELECT p.id, p.data FROM people p
       WHERE EXISTS (
         SELECT 1 FROM json_each(json_extract(p.data, '$.roles')) je
         WHERE je.value = ?
       )
       ORDER BY p.name_ru COLLATE NOCASE`
    : `SELECT id, data FROM people ORDER BY name_ru COLLATE NOCASE`;
  const rows = (opts?.role
    ? conn.prepare(sql).all(opts.role)
    : conn.prepare(sql).all()) as { id: string; data: string }[];
  return rows.map((r) => {
    const p = JSON.parse(r.data) as Person;
    return {
      id: p.id,
      name_ru: p.name_ru,
      roles: p.roles ?? [],
      birth: p.birth,
      death: p.death,
      image_commons: p.image_commons,
    };
  });
}

export function allPersonIds(): string[] {
  const conn = db();
  const rows = conn.prepare("SELECT id FROM people").all() as { id: string }[];
  return rows.map((r) => r.id);
}

/**
 * Slug-и людей, которым стоит пре-рендерить отдельную страницу.
 *
 * После enrich-films база надулась до 25k людей — почти все эпизодические
 * актёры из cast одного фильма. Их статические страницы:
 *   а) пробивают 20k-лимит Cloudflare Pages,
 *   б) почти всегда — пустая «биография не заполнена».
 *
 * Критерии пре-рендера (любой из):
 *   - есть image_commons (значит уже обогащён, осмысленная карточка)
 *   - есть birth (минимальная биография)
 *   - встречается как режиссёр/сценарист/композитор/оператор в любом фильме
 *   - встречается в cast >= 5 фильмов (постоянный актёр, а не эпизод)
 *
 * Эпизодические заглушки (одна роль, без даты рождения и фото) получают
 * 404, но в списках /people и фильмографиях фильмов остаются и кликабельны
 * (страницы просто нет — клиент видит 404). Это компромисс.
 */
export function staticPersonIds(): string[] {
  const conn = db();
  const peopleRows = conn
    .prepare("SELECT id, data FROM people")
    .all() as { id: string; data: string }[];
  // Считаем число вхождений каждого person в фильмах: в crew (1 балл за фильм)
  // и в cast (1 балл за фильм). Простой счётчик.
  const counts = new Map<string, { crew: number; cast: number }>();
  const filmRows = conn.prepare("SELECT data FROM films").all() as { data: string }[];
  for (const r of filmRows) {
    const f = JSON.parse(r.data) as Film;
    const crewSlugs = new Set<string>([
      ...(f.director ?? []),
      ...(f.screenwriter ?? []),
      ...(f.cinematographer ?? []),
      ...(f.composer ?? []),
    ]);
    for (const id of crewSlugs) {
      const c = counts.get(id) ?? { crew: 0, cast: 0 };
      c.crew += 1;
      counts.set(id, c);
    }
    if (f.cast) {
      for (const cm of f.cast) {
        const c = counts.get(cm.person) ?? { crew: 0, cast: 0 };
        c.cast += 1;
        counts.set(cm.person, c);
      }
    }
  }
  const keep: string[] = [];
  for (const r of peopleRows) {
    const p = JSON.parse(r.data) as Person;
    const c = counts.get(r.id);
    // Под 20k CFP-лимит пре-рендерим:
    //   - всех с фото (image_commons) — это редакторские отметки
    //     или обогащение Wikidata подтянуло
    //   - всех в crew-ролях (director/screenwriter/cinematographer/
    //     composer) — обычно их меньше тысяч
    //   - актёров с >= 8 ролями (Никулин, Леонов, Папанов и т.п.)
    // Эпизодические актёры (1-7 ролей без фото) — на 404. Они
    // остаются в списках, но клик → 404.
    const include =
      !!p.image_commons ||
      (c?.crew ?? 0) > 0 ||
      (c?.cast ?? 0) >= 8;
    if (include) keep.push(r.id);
  }
  return keep;
}

/**
 * Фильмография: фильмы, где person указан в director / screenwriter /
 * cinematographer / composer / cast.
 *
 * На 1293 фильмах быстрее всего пройтись по JSON один раз, чем строить
 * нормализованные join-таблицы. Если каталог вырастет — переедем на
 * отдельную таблицу `film_credits(person_id, film_id, role)`.
 */
export interface FilmographyEntry {
  film_id: string;
  title_ru: string;
  year: number;
  role: "director" | "screenwriter" | "cinematographer" | "composer" | "actor";
  character?: string;
}

export interface Collaborator {
  id: string;
  name_ru: string;
  image_commons?: string;
  shared_films: number;
}

/**
 * «Часто работал с»: для personId находим всех людей, с которыми он
 * пересекался в одном и том же фильме (как режиссёр/сценарист/оператор/
 * композитор/актёр), считаем сколько раз и возвращаем топ-N.
 *
 * Самопересечение исключаем. Один проход по всем фильмам.
 */
export function collaboratorsOf(
  personId: string,
  limit = 12,
): Collaborator[] {
  const conn = db();
  const rows = conn
    .prepare("SELECT data FROM films")
    .all() as { data: string }[];
  const counts = new Map<string, number>();
  const peopleOfFilm = (f: Film): string[] => {
    const ids: string[] = [];
    if (f.director) ids.push(...f.director);
    if (f.screenwriter) ids.push(...f.screenwriter);
    if (f.cinematographer) ids.push(...f.cinematographer);
    if (f.composer) ids.push(...f.composer);
    if (f.cast) for (const c of f.cast) ids.push(c.person);
    return ids;
  };
  for (const r of rows) {
    const f = JSON.parse(r.data) as Film;
    const ids = peopleOfFilm(f);
    if (!ids.includes(personId)) continue;
    for (const id of ids) {
      if (id === personId) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  if (top.length === 0) return [];
  const ids = top.map(([id]) => id);
  const placeholders = ids.map(() => "?").join(",");
  const peopleRows = conn
    .prepare(`SELECT id, data FROM people WHERE id IN (${placeholders})`)
    .all(...ids) as { id: string; data: string }[];
  const map = new Map(peopleRows.map((p) => [p.id, JSON.parse(p.data) as Person]));
  return top.map(([id, c]) => {
    const p = map.get(id);
    return {
      id,
      name_ru: p?.name_ru ?? id,
      image_commons: p?.image_commons,
      shared_films: c,
    };
  });
}

export function filmographyOf(personId: string): FilmographyEntry[] {
  const conn = db();
  const rows = conn
    .prepare("SELECT id, title_ru, year, data FROM films")
    .all() as { id: string; title_ru: string; year: number; data: string }[];
  const out: FilmographyEntry[] = [];
  for (const r of rows) {
    const f = JSON.parse(r.data) as Film;
    if (f.director?.includes(personId))
      out.push({ film_id: r.id, title_ru: r.title_ru, year: r.year, role: "director" });
    if (f.screenwriter?.includes(personId))
      out.push({ film_id: r.id, title_ru: r.title_ru, year: r.year, role: "screenwriter" });
    if (f.cinematographer?.includes(personId))
      out.push({
        film_id: r.id,
        title_ru: r.title_ru,
        year: r.year,
        role: "cinematographer",
      });
    if (f.composer?.includes(personId))
      out.push({ film_id: r.id, title_ru: r.title_ru, year: r.year, role: "composer" });
    if (f.cast) {
      for (const c of f.cast) {
        if (c.person === personId) {
          out.push({
            film_id: r.id,
            title_ru: r.title_ru,
            year: r.year,
            role: "actor",
            character: c.role,
          });
        }
      }
    }
  }
  return out.sort((a, b) => b.year - a.year || a.title_ru.localeCompare(b.title_ru, "ru"));
}

export function getPerson(id: string): Person | null {
  const conn = db();
  const row = conn
    .prepare("SELECT data FROM people WHERE id = ?")
    .get(id) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data) as Person;
}

export function personsByIds(ids: string[]): Map<string, Person> {
  if (ids.length === 0) return new Map();
  const conn = db();
  const placeholders = ids.map(() => "?").join(",");
  const rows = conn
    .prepare(`SELECT id, data FROM people WHERE id IN (${placeholders})`)
    .all(...ids) as PersonRow[];
  const map = new Map<string, Person>();
  for (const r of rows) map.set(r.id, JSON.parse(r.data) as Person);
  return map;
}

export interface StudioListItem {
  id: string;
  name_ru: string;
  country: string;
  founded?: number;
  film_count: number;
}

export function listStudios(): StudioListItem[] {
  const conn = db();
  const rows = conn
    .prepare("SELECT id, data FROM studios ORDER BY name_ru COLLATE NOCASE")
    .all() as { id: string; data: string }[];
  // Подсчёт фильмов на студии — через JSON1.
  const counts = conn
    .prepare(
      `SELECT je.value AS studio, COUNT(*) AS c
         FROM films, json_each(json_extract(films.data, '$.studio')) je
        GROUP BY je.value`,
    )
    .all() as { studio: string; c: number }[];
  const countsMap = new Map(counts.map((r) => [r.studio, r.c]));
  return rows.map((r) => {
    const s = JSON.parse(r.data) as Studio;
    return {
      id: s.id,
      name_ru: s.name_ru,
      country: s.country,
      founded: s.founded,
      film_count: countsMap.get(s.id) ?? 0,
    };
  });
}

export function getStudio(id: string): Studio | null {
  const conn = db();
  const row = conn
    .prepare("SELECT data FROM studios WHERE id = ?")
    .get(id) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data) as Studio;
}

export function allStudioIds(): string[] {
  const conn = db();
  const rows = conn.prepare("SELECT id FROM studios").all() as { id: string }[];
  return rows.map((r) => r.id);
}

export function studiosByIds(ids: string[]): Map<string, Studio> {
  if (ids.length === 0) return new Map();
  const conn = db();
  const placeholders = ids.map(() => "?").join(",");
  const rows = conn
    .prepare(`SELECT id, data FROM studios WHERE id IN (${placeholders})`)
    .all(...ids) as StudioRow[];
  const map = new Map<string, Studio>();
  for (const r of rows) map.set(r.id, JSON.parse(r.data) as Studio);
  return map;
}

// ---- references / adaptations -------------------------------------------

interface ReferenceTargetBook {
  type: "book";
  title_ru?: string;
  title_original: string;
  authors?: string[];
  year?: number;
}

interface ReferenceTargetFilm {
  type: "film";
  ref: string;
}

interface ReferenceTargetExternalFilm {
  type: "external_film";
  title_ru?: string;
  title_original: string;
  year?: number;
  country?: string;
  director?: string;
  wikidata?: string;
}

type ReferenceTarget =
  | ReferenceTargetBook
  | ReferenceTargetFilm
  | ReferenceTargetExternalFilm;

interface ReferenceData {
  id: string;
  source_film: string;
  target: ReferenceTarget;
  kind: string;
  description_ru: string;
  confidence: string;
}

let _references: ReferenceData[] | null = null;

function allReferences(): ReferenceData[] {
  if (_references) return _references;
  const rows = db()
    .prepare("SELECT data FROM refs")
    .all() as { data: string }[];
  _references = rows.map((r) => JSON.parse(r.data) as ReferenceData);
  return _references;
}

/** Фильмы, основанные на произведениях этого автора (через references). */
export interface AdaptationOfAuthor {
  film_id: string;
  title_ru: string;
  year: number;
  source_title: string;
  source_year?: number;
}

export function filmsAdaptedFromAuthor(authorId: string): AdaptationOfAuthor[] {
  const refs = allReferences();
  const out: AdaptationOfAuthor[] = [];
  for (const r of refs) {
    if (r.target.type !== "book") continue;
    if (!r.target.authors?.includes(authorId)) continue;
    const film = getFilm(r.source_film);
    if (!film) continue;
    out.push({
      film_id: film.id,
      title_ru: film.title_ru,
      year: film.year,
      source_title: r.target.title_ru ?? r.target.title_original,
      source_year: r.target.year,
    });
  }
  return out.sort((a, b) => b.year - a.year);
}

/** Литературный источник фильма — если есть reference kind=adaptation к книге. */
export function literarySourceOf(filmId: string): {
  title: string;
  authors: string[];
  year?: number;
} | null {
  const refs = allReferences();
  for (const r of refs) {
    if (r.source_film !== filmId) continue;
    if (r.kind !== "adaptation") continue;
    if (r.target.type !== "book") continue;
    return {
      title: r.target.title_ru ?? r.target.title_original,
      authors: r.target.authors ?? [],
      year: r.target.year,
    };
  }
  return null;
}

// ---- topics --------------------------------------------------------------

export interface TopicListItem {
  id: string;
  name_ru: string;
  description_ru: string;
  film_count: number;
}

export function listTopics(): TopicListItem[] {
  const conn = db();
  const rows = conn
    .prepare("SELECT id, data FROM topics ORDER BY name_ru COLLATE NOCASE")
    .all() as { id: string; data: string }[];
  // film_count считаем через filmsByTopic — он умеет и явные привязки, и
  // декларативные фильтры. Это медленнее наивного подсчёта, но на 3k+
  // фильмах всё ещё милисекунды.
  return rows.map((r) => {
    const t = JSON.parse(r.data) as Topic;
    return {
      id: t.id,
      name_ru: t.name_ru,
      description_ru: t.description_ru,
      film_count: filmsByTopic(t.id).length,
    };
  });
}

export function getTopic(id: string): Topic | null {
  const conn = db();
  const row = conn
    .prepare("SELECT data FROM topics WHERE id = ?")
    .get(id) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data) as Topic;
}

export function allTopicIds(): string[] {
  const conn = db();
  const rows = conn.prepare("SELECT id FROM topics").all() as { id: string }[];
  return rows.map((r) => r.id);
}

/**
 * Какие темы (явные и динамические) включают этот фильм.
 *
 * Используется в шапке /films/[slug]: показать все темы, к которым
 * фильм относится — и кураторские, и периодные/авторские.
 */
export function topicsContainingFilm(filmId: string): Topic[] {
  const film = getFilm(filmId);
  if (!film) return [];
  const conn = db();
  const rows = conn.prepare("SELECT data FROM topics").all() as { data: string }[];
  const topics = rows.map((r) => JSON.parse(r.data) as Topic);
  const out: Topic[] = [];
  for (const t of topics) {
    if (film.topics?.includes(t.id)) {
      out.push(t);
      continue;
    }
    const f = t.filter;
    if (!f) continue;
    const c1 = f.year_from == null || (film.year != null && film.year >= f.year_from);
    const c2 = f.year_to == null || (film.year != null && film.year <= f.year_to);
    const c3 = !f.director || film.director?.includes(f.director);
    const c4 = !f.screenwriter || film.screenwriter?.includes(f.screenwriter);
    const c5 = !f.country || film.country?.includes(f.country);
    let c6 = true;
    if (f.book_author) {
      c6 = false;
      for (const r of allReferences()) {
        if (r.source_film !== film.id) continue;
        if (r.target.type !== "book") continue;
        if (r.target.authors?.includes(f.book_author)) {
          c6 = true;
          break;
        }
      }
    }
    const anyFilterSet =
      f.year_from != null ||
      f.year_to != null ||
      f.director ||
      f.screenwriter ||
      f.country ||
      f.book_author;
    if (anyFilterSet && c1 && c2 && c3 && c4 && c5 && c6) {
      out.push(t);
    }
  }
  return out.sort((a, b) => a.name_ru.localeCompare(b.name_ru, "ru"));
}

/**
 * Подборка фильмов темы.
 *
 * Объединяет:
 *  - явная привязка через Film.topics;
 *  - декларативный Topic.filter (director / screenwriter / book_author /
 *    year_from / year_to / country).
 *
 * Делает один сквозной проход по таблице. На текущих ~3.5k фильмах
 * это меньше 20 мс; при росте на порядок переедет на отдельную
 * таблицу film_topic_match.
 */
export function filmsByTopic(topicId: string): FilmListItem[] {
  const topic = getTopic(topicId);
  const filter = topic?.filter;
  const conn = db();
  const rows = conn
    .prepare("SELECT id, year, title_ru, title_original, country, data FROM films")
    .all() as {
    id: string;
    year: number;
    title_ru: string | null;
    title_original: string | null;
    country: string | null;
    data: string;
  }[];
  // Если фильтр требует book_author — сначала собираем slug-и фильмов из
  // references, где автор книги совпадает.
  let filmsFromRefs: Set<string> | null = null;
  if (filter?.book_author) {
    filmsFromRefs = new Set();
    for (const r of allReferences()) {
      if (r.target.type !== "book") continue;
      if (!r.target.authors?.includes(filter.book_author)) continue;
      filmsFromRefs.add(r.source_film);
    }
  }

  const out: FilmListItem[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const f = JSON.parse(r.data) as Film;
    let matches = false;
    if (f.topics?.includes(topicId)) matches = true;
    if (!matches && filter) {
      const c1 =
        filter.year_from == null || (r.year != null && r.year >= filter.year_from);
      const c2 =
        filter.year_to == null || (r.year != null && r.year <= filter.year_to);
      const c3 = !filter.director || f.director?.includes(filter.director);
      const c4 = !filter.screenwriter || f.screenwriter?.includes(filter.screenwriter);
      const c5 = !filter.country || f.country?.includes(filter.country);
      const c6 = !filter.book_author || filmsFromRefs?.has(r.id);
      if (c1 && c2 && c3 && c4 && c5 && c6) {
        // book_author без других условий — должен быть хотя бы один
        // фильтр сработавший. Здесь проверка book_author даёт это сама.
        // Если ни одного фильтра не задано в Topic — Topic.filter ничего
        // не добавляет (только явные топики).
        const anyFilterSet =
          filter.year_from != null ||
          filter.year_to != null ||
          filter.director ||
          filter.screenwriter ||
          filter.country ||
          filter.book_author;
        if (anyFilterSet) matches = true;
      }
    }
    if (matches && !seen.has(r.id)) {
      seen.add(r.id);
      out.push({
        id: r.id,
        title_ru: r.title_ru ?? r.id,
        title_original: r.title_original ?? r.title_ru ?? r.id,
        year: r.year,
        country: r.country ? r.country.split(",") : [],
        poster_commons: f.poster_commons,
        poster_tmdb_path: f.poster_tmdb_path,
        soviet_release_year: f.soviet_release?.year,
      });
    }
  }
  // Для топика foreign-in-soviet-distribution сортируем по году
  // советского проката (а не года производства) — это естественный
  // порядок «что когда увидели в СССР».
  if (topicId === "foreign-in-soviet-distribution") {
    return out.sort((a, b) => {
      const ay = a.soviet_release_year ?? a.year;
      const by = b.soviet_release_year ?? b.year;
      return by - ay || a.title_ru.localeCompare(b.title_ru, "ru");
    });
  }
  return out.sort((a, b) => b.year - a.year || a.title_ru.localeCompare(b.title_ru, "ru"));
}

// ---- motifs --------------------------------------------------------------

export function listMotifs(): Motif[] {
  const conn = db();
  const rows = conn
    .prepare("SELECT data FROM motifs ORDER BY name_ru COLLATE NOCASE")
    .all() as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as Motif);
}

export function getMotif(id: string): Motif | null {
  const conn = db();
  const row = conn
    .prepare("SELECT data FROM motifs WHERE id = ?")
    .get(id) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data) as Motif;
}

export function allMotifIds(): string[] {
  const conn = db();
  const rows = conn.prepare("SELECT id FROM motifs").all() as { id: string }[];
  return rows.map((r) => r.id);
}

/** Темы, у которых в related_motifs указан этот мотив. */
export function topicsWithMotif(motifId: string): Topic[] {
  const conn = db();
  const rows = conn
    .prepare(
      `SELECT data FROM topics WHERE id IN (
         SELECT topics.id FROM topics, json_each(json_extract(topics.data, '$.related_motifs')) je
         WHERE je.value = ?
       )`,
    )
    .all(motifId) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as Topic);
}

// ---- vocabulary (страны, республики, жанры, языки и т.д.) -----------------

export type VocabKind =
  | "country"
  | "republic"
  | "genre"
  | "role"
  | "motif_category"
  | "reference_kind"
  | "censorship_status"
  | "language";

export interface VocabEntry {
  name: string;
  description: string | null;
}

let _vocabCache: Map<string, Map<string, VocabEntry>> | null = null;

function loadVocabCache(): Map<string, Map<string, VocabEntry>> {
  if (_vocabCache) return _vocabCache;
  const cache = new Map<string, Map<string, VocabEntry>>();
  const rows = db()
    .prepare("SELECT kind, code, name_ru, description_ru FROM vocabulary")
    .all() as { kind: string; code: string; name_ru: string; description_ru: string | null }[];
  for (const r of rows) {
    let m = cache.get(r.kind);
    if (!m) {
      m = new Map();
      cache.set(r.kind, m);
    }
    m.set(r.code, { name: r.name_ru, description: r.description_ru });
  }
  _vocabCache = cache;
  return cache;
}

export function vocabEntry(kind: VocabKind, code: string): VocabEntry | null {
  return loadVocabCache().get(kind)?.get(code) ?? null;
}

export function vocabName(kind: VocabKind, code: string): string {
  return vocabEntry(kind, code)?.name ?? code;
}

// ---- stats ---------------------------------------------------------------

export interface DbStats {
  totals: { films: number; people: number; studios: number; topics: number; refs: number };
  coverage: {
    films_with_director: number;
    films_with_poster: number;
    films_with_youtube: number;
    films_with_imdb: number;
    people_with_image: number;
    people_with_birth: number;
  };
  by_country: { code: string; count: number }[];
  by_decade: { decade: number; count: number }[];
  by_role: { code: string; count: number }[];
  by_genre: { code: string; count: number }[];
  top_studios: { id: string; name_ru: string; count: number }[];
  top_directors: TopDirector[];
}

export function getDbStats(): DbStats {
  const conn = db();
  const num = (q: string, ...params: unknown[]) =>
    (conn.prepare(q).get(...params) as { c: number }).c;
  const films = num("SELECT COUNT(*) AS c FROM films");
  const people = num("SELECT COUNT(*) AS c FROM people");
  const studios = num("SELECT COUNT(*) AS c FROM studios");
  const topics = num("SELECT COUNT(*) AS c FROM topics");
  const refs = num("SELECT COUNT(*) AS c FROM refs");

  const filmsWithDirector = num(
    `SELECT COUNT(*) AS c FROM films
     WHERE json_array_length(coalesce(json_extract(data, '$.director'), '[]')) > 0`,
  );
  const filmsWithPoster = num(
    `SELECT COUNT(*) AS c FROM films
     WHERE json_extract(data, '$.poster_commons') IS NOT NULL`,
  );
  const filmsWithYoutube = num(
    `SELECT COUNT(*) AS c FROM films
     WHERE json_extract(data, '$.external_ids.youtube') IS NOT NULL`,
  );
  const filmsWithImdb = num(
    `SELECT COUNT(*) AS c FROM films
     WHERE json_extract(data, '$.external_ids.imdb') IS NOT NULL`,
  );
  const peopleWithImage = num(
    `SELECT COUNT(*) AS c FROM people
     WHERE json_extract(data, '$.image_commons') IS NOT NULL`,
  );
  const peopleWithBirth = num(
    `SELECT COUNT(*) AS c FROM people
     WHERE json_extract(data, '$.birth') IS NOT NULL`,
  );

  const byCountry = availableCountries().filter((c) => c.count > 0);

  // Декады из year (например, 1960 для 1965).
  const decadeRows = conn
    .prepare(
      `SELECT (year / 10) * 10 AS decade, COUNT(*) AS c FROM films
        WHERE year IS NOT NULL GROUP BY decade ORDER BY decade`,
    )
    .all() as { decade: number; c: number }[];

  const byRole = availableRoles().filter((r) => r.count > 0);

  // Топ-12 жанров по фильмам — фильм часто в нескольких жанрах
  // (например, comedy+adventure), поэтому сумма > totals.films.
  const genreRows = conn
    .prepare(
      `SELECT je.value AS code, COUNT(*) AS c
         FROM films, json_each(json_extract(films.data, '$.genre')) je
        GROUP BY je.value ORDER BY c DESC LIMIT 12`,
    )
    .all() as { code: string; c: number }[];
  const byGenre = genreRows.map((r) => ({ code: r.code, count: r.c }));

  // Топ-10 студий по фильмам.
  const topStudios = conn
    .prepare(
      `SELECT je.value AS sid, COUNT(*) AS c
         FROM films, json_each(json_extract(films.data, '$.studio')) je
        GROUP BY je.value ORDER BY c DESC LIMIT 10`,
    )
    .all() as { sid: string; c: number }[];
  const studioInfos = topStudios.map((r) => {
    const s = getStudio(r.sid);
    return { id: r.sid, name_ru: s?.name_ru ?? r.sid, count: r.c };
  });

  return {
    totals: { films, people, studios, topics, refs },
    coverage: {
      films_with_director: filmsWithDirector,
      films_with_poster: filmsWithPoster,
      films_with_youtube: filmsWithYoutube,
      films_with_imdb: filmsWithImdb,
      people_with_image: peopleWithImage,
      people_with_birth: peopleWithBirth,
    },
    by_country: byCountry,
    by_decade: decadeRows.map((r) => ({ decade: r.decade, count: r.c })),
    by_role: byRole,
    by_genre: byGenre,
    top_studios: studioInfos,
    top_directors: topDirectors(10),
  };
}

// ---- FTS-поиск -----------------------------------------------------------

export interface SearchPerson {
  id: string;
  name_ru: string;
  roles: string[];
  image_commons?: string;
}

export function searchPeople(q: string, limit = 20): SearchPerson[] {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const safe = trimmed.replace(/["()\-]/g, " ").replace(/\s+/g, " ").trim();
  if (!safe) return [];
  const ftsQuery = safe
    .split(" ")
    .map((w) => `${w}*`)
    .join(" ");
  const conn = db();
  const rows = conn
    .prepare(
      `SELECT p.id, p.data
         FROM people_fts fts
         JOIN people p ON p.id = fts.id
        WHERE people_fts MATCH ?
        ORDER BY p.name_ru COLLATE NOCASE
        LIMIT ?`,
    )
    .all(ftsQuery, limit) as { id: string; data: string }[];
  return rows.map((r) => {
    const p = JSON.parse(r.data) as Person;
    return {
      id: p.id,
      name_ru: p.name_ru,
      roles: p.roles ?? [],
      image_commons: p.image_commons,
    };
  });
}

export interface SearchResult {
  id: string;
  title_ru: string;
  title_original: string;
  year: number;
  country: string[];
}

/**
 * Поиск фильмов по title_ru / title_original / title_en через FTS5.
 *
 * Поддерживает префиксы: `зеркал*`. Если запрос — несколько слов,
 * комбинируем как AND. На пустом / коротком запросе возвращаем пусто.
 */
export function searchFilms(q: string, limit = 40): SearchResult[] {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  // FTS5 принимает запросы вроде `зеркал* отец` — токенизирует по пробелам.
  // Удаляем символы, которые ломают синтаксис FTS (кавычки, скобки, минусы).
  const safe = trimmed.replace(/["()\-]/g, " ").replace(/\s+/g, " ").trim();
  if (!safe) return [];
  // Каждое слово как префикс — это вернёт «зерк» → «зеркало», «зеркальный».
  const ftsQuery = safe
    .split(" ")
    .map((w) => `${w}*`)
    .join(" ");
  const conn = db();
  const rows = conn
    .prepare(
      `SELECT f.id, f.title_ru, f.title_original, f.year, f.country
         FROM films_fts fts
         JOIN films f ON f.id = fts.id
        WHERE films_fts MATCH ?
        ORDER BY f.year DESC, f.title_ru COLLATE NOCASE
        LIMIT ?`,
    )
    .all(ftsQuery, limit) as {
    id: string;
    title_ru: string | null;
    title_original: string | null;
    year: number;
    country: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    title_ru: r.title_ru ?? r.id,
    title_original: r.title_original ?? r.title_ru ?? r.id,
    year: r.year,
    country: r.country ? r.country.split(",") : [],
  }));
}
