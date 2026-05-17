// Запросы к БД для страниц.
// Возвращают уже распарсенные объекты по типам из lib/types.ts.

import "server-only";

import { db } from "./db";
import type { Film, Person, Studio } from "./types";

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

export function listFilms(opts?: { year?: number; limit?: number }): FilmListItem[] {
  const conn = db();
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts?.year != null) {
    where.push("year = ?");
    params.push(opts.year);
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

export function availableYears(): number[] {
  const conn = db();
  const rows = conn
    .prepare("SELECT DISTINCT year FROM films WHERE year IS NOT NULL ORDER BY year DESC")
    .all() as { year: number }[];
  return rows.map((r) => r.year);
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
