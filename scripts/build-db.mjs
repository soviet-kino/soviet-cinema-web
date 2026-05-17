#!/usr/bin/env node
/**
 * Сборка рантайм-БД из soviet-cinema-data/.
 *
 * Читает YAML-файлы фильмов, людей, студий и пишет SQLite-файл в data/soviet-cinema.sqlite.
 * Запускается на этапе билда (см. package.json scripts.build).
 *
 * Скрипт намеренно небольшой и линейный. По мере роста переедет в lib/build/.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import yaml from "js-yaml";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_ROOT =
  process.env.SBC_DATA_DIR ?? path.resolve(ROOT, "..", "soviet-cinema-data");
const OUT = path.join(ROOT, "data", "soviet-cinema.sqlite");

function readYamlDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map((f) => yaml.load(fs.readFileSync(path.join(dir, f), "utf8")))
    .filter(Boolean);
}

function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  if (fs.existsSync(OUT)) fs.rmSync(OUT);

  const films = readYamlDir(path.join(DATA_ROOT, "films"));
  const people = readYamlDir(path.join(DATA_ROOT, "people"));
  const studios = readYamlDir(path.join(DATA_ROOT, "studios"));

  const db = new Database(OUT);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE films (
      id TEXT PRIMARY KEY,
      title_ru TEXT,
      title_original TEXT,
      year INTEGER,
      country TEXT,
      data JSON
    );
    CREATE TABLE people (
      id TEXT PRIMARY KEY,
      name_ru TEXT,
      data JSON
    );
    CREATE TABLE studios (
      id TEXT PRIMARY KEY,
      name_ru TEXT,
      country TEXT,
      data JSON
    );
    CREATE VIRTUAL TABLE films_fts USING fts5(
      id UNINDEXED,
      title_ru,
      title_original,
      title_en
    );
    CREATE TABLE vocabulary (
      kind TEXT,
      code TEXT,
      name_ru TEXT,
      PRIMARY KEY (kind, code)
    );
  `);

  const insFilm = db.prepare(
    "INSERT INTO films (id, title_ru, title_original, year, country, data) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insFilmFts = db.prepare(
    "INSERT INTO films_fts (id, title_ru, title_original, title_en) VALUES (?, ?, ?, ?)",
  );
  const insPerson = db.prepare(
    "INSERT INTO people (id, name_ru, data) VALUES (?, ?, ?)",
  );
  const insStudio = db.prepare(
    "INSERT INTO studios (id, name_ru, country, data) VALUES (?, ?, ?, ?)",
  );
  const insVocab = db.prepare(
    "INSERT INTO vocabulary (kind, code, name_ru) VALUES (?, ?, ?)",
  );

  // Перечень соответствует vocabularies/ в soviet-cinema-data.
  // kind хранится в единственном числе — так удобнее обращаться из UI.
  const vocabFiles = {
    country: "countries.yaml",
    republic: "republics.yaml",
    genre: "genres.yaml",
    role: "roles.yaml",
    motif_category: "motif_categories.yaml",
    reference_kind: "reference_kinds.yaml",
    censorship_status: "censorship_statuses.yaml",
    language: "languages.yaml",
  };

  const tx = db.transaction(() => {
    for (const f of films) {
      insFilm.run(
        f.id,
        f.title_ru ?? null,
        f.title_original ?? null,
        f.year ?? null,
        (f.country ?? []).join(","),
        JSON.stringify(f),
      );
      insFilmFts.run(
        f.id,
        f.title_ru ?? "",
        f.title_original ?? "",
        f.title_en ?? "",
      );
    }
    for (const p of people) {
      insPerson.run(p.id, p.name_ru ?? null, JSON.stringify(p));
    }
    for (const s of studios) {
      insStudio.run(
        s.id,
        s.name_ru ?? null,
        s.country ?? null,
        JSON.stringify(s),
      );
    }
    for (const [kind, file] of Object.entries(vocabFiles)) {
      const vp = path.join(DATA_ROOT, "vocabularies", file);
      if (!fs.existsSync(vp)) continue;
      const raw = yaml.load(fs.readFileSync(vp, "utf8"));
      for (const v of raw?.values ?? []) {
        if (!v?.code) continue;
        insVocab.run(kind, v.code, v.name_ru ?? v.code);
      }
    }
  });
  tx();

  const vocabCount = db.prepare("SELECT COUNT(*) AS c FROM vocabulary").get().c;
  console.log(
    `[build-db] films=${films.length} people=${people.length} studios=${studios.length} vocab=${vocabCount} → ${path.relative(ROOT, OUT)}`,
  );
}

main();
