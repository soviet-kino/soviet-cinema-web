// Запросы к БД для страниц.
// Возвращают уже распарсенные объекты по типам из lib/types.ts.

import "server-only";

import { db } from "./db";
import type { Film, Person, Studio, Topic } from "./types";

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
}

export function listFilms(opts?: {
  year?: number;
  country?: string;
  studio?: string;
  topic?: string;
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
  const sql = `
    SELECT id, year, title_ru, title_original, country
    FROM films
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY year DESC, title_ru COLLATE NOCASE
    ${opts?.limit ? "LIMIT ?" : ""}
  `;
  if (opts?.limit) params.push(opts.limit);
  const rows = conn.prepare(sql).all(...params) as FilmRow[];
  return rows.map((r) => ({
    id: r.id,
    title_ru: r.title_ru ?? r.id,
    title_original: r.title_original ?? r.title_ru ?? r.id,
    year: r.year,
    country: r.country ? r.country.split(",") : [],
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

/** Список стран с количеством фильмов: для чипов-фильтров на /films. */
export function availableCountries(year?: number): { code: string; count: number }[] {
  const conn = db();
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
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

export function getFilm(id: string): Film | null {
  const conn = db();
  const row = conn
    .prepare("SELECT data FROM films WHERE id = ?")
    .get(id) as { data: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.data) as Film;
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

export function listPeople(): PersonListItem[] {
  const conn = db();
  const rows = conn.prepare("SELECT id, data FROM people ORDER BY name_ru COLLATE NOCASE").all() as {
    id: string;
    data: string;
  }[];
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
  const films = conn.prepare("SELECT data FROM films").all() as { data: string }[];
  // Считаем сколько фильмов привязано к каждому топику. На 1k+ фильмах
  // это меньше миллисекунды; разворачивать в отдельную таблицу не нужно.
  const counts = new Map<string, number>();
  for (const r of films) {
    const f = JSON.parse(r.data) as Film;
    for (const t of f.topics ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return rows.map((r) => {
    const t = JSON.parse(r.data) as Topic;
    return {
      id: t.id,
      name_ru: t.name_ru,
      description_ru: t.description_ru,
      film_count: counts.get(t.id) ?? 0,
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

export function filmsByTopic(topicId: string): FilmListItem[] {
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
  const out: FilmListItem[] = [];
  for (const r of rows) {
    const f = JSON.parse(r.data) as Film;
    if (f.topics?.includes(topicId)) {
      out.push({
        id: r.id,
        title_ru: r.title_ru ?? r.id,
        title_original: r.title_original ?? r.title_ru ?? r.id,
        year: r.year,
        country: r.country ? r.country.split(",") : [],
      });
    }
  }
  return out.sort((a, b) => b.year - a.year || a.title_ru.localeCompare(b.title_ru, "ru"));
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
