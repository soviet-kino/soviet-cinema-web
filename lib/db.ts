// Заглушка интерфейса к рантайм-БД (SQLite, генерируется при сборке).
// Реальная реализация появится, когда соберём первый sqlite-файл через
// scripts/build-db.mjs. До тех пор UI работает на пустых результатах.
//
// CLAUDE.md: «На старте — встроенный FTS5 в SQLite. При росте — Meilisearch».

import path from "node:path";
import fs from "node:fs";

import Database from "better-sqlite3";

const DB_PATH = path.join(process.cwd(), "data", "soviet-cinema.sqlite");

let _db: Database.Database | null = null;

export function db(): Database.Database | null {
  if (_db) return _db;
  if (!fs.existsSync(DB_PATH)) return null;
  _db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  return _db;
}

export interface FilmRow {
  id: string;
  title_ru: string;
  title_original: string;
  year: number;
  country: string;
}

export function listFilms(limit = 50): FilmRow[] {
  const conn = db();
  if (!conn) return [];
  return conn
    .prepare(
      "SELECT id, title_ru, title_original, year, country FROM films ORDER BY year DESC, title_ru LIMIT ?",
    )
    .all(limit) as FilmRow[];
}
