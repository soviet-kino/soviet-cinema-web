// Тонкая обёртка над SQLite.
//
// БД генерируется при сборке скриптом scripts/build-db.mjs из YAML
// в ../soviet-cinema-data. На рантайме читаем только.
//
// Все таблицы films/people/studios содержат колонку `data` с полным
// JSON-представлением исходного YAML. Для большинства страниц этого
// достаточно, индексные колонки нужны для списков и сортировок.

import path from "node:path";
import fs from "node:fs";

import Database from "better-sqlite3";

const DB_PATH = path.join(process.cwd(), "data", "soviet-cinema.sqlite");

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(
      `БД не собрана: ${DB_PATH}. Запустите \`npm run build:db\` (см. scripts/build-db.mjs).`,
    );
  }
  _db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  return _db;
}
