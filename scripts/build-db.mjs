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
  const topics = readYamlDir(path.join(DATA_ROOT, "topics"));
  const references = readYamlDir(path.join(DATA_ROOT, "references"));
  const motifs = readYamlDir(path.join(DATA_ROOT, "motifs"));
  const collections = (() => {
    const dir = path.join(DATA_ROOT, "collections");
    return fs.existsSync(dir) ? readYamlDir(dir) : [];
  })();

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
    CREATE VIRTUAL TABLE people_fts USING fts5(
      id UNINDEXED,
      name_ru,
      name_original,
      name_translit
    );
    CREATE TABLE vocabulary (
      kind TEXT,
      code TEXT,
      name_ru TEXT,
      description_ru TEXT,
      PRIMARY KEY (kind, code)
    );
    CREATE TABLE topics (
      id TEXT PRIMARY KEY,
      name_ru TEXT,
      data JSON
    );
    CREATE TABLE refs (
      id TEXT PRIMARY KEY,
      source_film TEXT,
      kind TEXT,
      data JSON
    );
    CREATE TABLE motifs (
      id TEXT PRIMARY KEY,
      name_ru TEXT,
      data JSON
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
  const insPersonFts = db.prepare(
    "INSERT INTO people_fts (id, name_ru, name_original, name_translit) VALUES (?, ?, ?, ?)",
  );
  const insStudio = db.prepare(
    "INSERT INTO studios (id, name_ru, country, data) VALUES (?, ?, ?, ?)",
  );
  const insVocab = db.prepare(
    "INSERT INTO vocabulary (kind, code, name_ru, description_ru) VALUES (?, ?, ?, ?)",
  );
  const insTopic = db.prepare(
    "INSERT INTO topics (id, name_ru, data) VALUES (?, ?, ?)",
  );
  const insRef = db.prepare(
    "INSERT INTO refs (id, source_film, kind, data) VALUES (?, ?, ?, ?)",
  );
  const insMotif = db.prepare(
    "INSERT INTO motifs (id, name_ru, data) VALUES (?, ?, ?)",
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
      insPersonFts.run(
        p.id,
        p.name_ru ?? "",
        p.name_original ?? "",
        p.name_translit ?? "",
      );
    }
    for (const s of studios) {
      insStudio.run(
        s.id,
        s.name_ru ?? null,
        s.country ?? null,
        JSON.stringify(s),
      );
    }
    for (const t of topics) {
      insTopic.run(t.id, t.name_ru ?? null, JSON.stringify(t));
    }
    for (const r of references) {
      insRef.run(
        r.id,
        r.source_film ?? null,
        r.kind ?? null,
        JSON.stringify(r),
      );
    }
    for (const m of motifs) {
      insMotif.run(m.id, m.name_ru ?? null, JSON.stringify(m));
    }
    for (const [kind, file] of Object.entries(vocabFiles)) {
      const vp = path.join(DATA_ROOT, "vocabularies", file);
      if (!fs.existsSync(vp)) continue;
      const raw = yaml.load(fs.readFileSync(vp, "utf8"));
      for (const v of raw?.values ?? []) {
        if (!v?.code) continue;
        insVocab.run(kind, v.code, v.name_ru ?? v.code, v.description_ru ?? null);
      }
    }
  });
  tx();

  const vocabCount = db.prepare("SELECT COUNT(*) AS c FROM vocabulary").get().c;
  console.log(
    `[build-db] films=${films.length} people=${people.length} studios=${studios.length} topics=${topics.length} refs=${references.length} vocab=${vocabCount} → ${path.relative(ROOT, OUT)}`,
  );

  // ----- генерация JSON-индексов для клиентских компонентов ---------------
  //
  // На Cloudflare Pages (static export) SSR-фильтрация по searchParams
  // не работает. Поэтому всю «лёгкую» базу — без полных YAML-данных —
  // отдаём как статические JSON-файлы в public/data/. Клиент скачает
  // один раз и фильтрует в памяти.
  //
  // SQLite-БД остаётся для server-time detail-страниц через
  // generateStaticParams — они пре-рендерятся в HTML на этапе билда.

  const PUBLIC_DATA = path.join(ROOT, "public", "data");
  fs.rmSync(PUBLIC_DATA, { recursive: true, force: true });
  fs.mkdirSync(PUBLIC_DATA, { recursive: true });

  const writeJson = (name, data) => {
    fs.writeFileSync(path.join(PUBLIC_DATA, name), JSON.stringify(data));
  };

  // films-index: минимальные поля для list/filter UI.
  const filmsIndex = films.map((f) => ({
    id: f.id,
    title_ru: f.title_ru ?? f.id,
    title_original: f.title_original ?? f.title_ru ?? f.id,
    title_en: f.title_en,
    year: f.year ?? null,
    country: f.country ?? [],
    republic: f.republic,
    studio: f.studio ?? [],
    director: f.director ?? [],
    genre: f.genre ?? [],
    topics: f.topics ?? [],
    poster_commons: f.poster_commons,
    poster_tmdb_path: f.poster_tmdb_path,
    youtube: f.external_ids?.youtube,
  }));
  writeJson("films-index.json", filmsIndex);

  const peopleIndex = people.map((p) => ({
    id: p.id,
    name_ru: p.name_ru,
    name_original: p.name_original,
    name_translit: p.name_translit,
    roles: p.roles ?? [],
    nationality: p.nationality ?? [],
    birth: p.birth,
    death: p.death,
    image_commons: p.image_commons,
  }));
  writeJson("people-index.json", peopleIndex);

  // Студии — со счётчиком фильмов.
  const studioFilmCount = new Map();
  for (const f of films) {
    for (const s of f.studio ?? []) {
      studioFilmCount.set(s, (studioFilmCount.get(s) ?? 0) + 1);
    }
  }
  writeJson(
    "studios.json",
    studios.map((s) => ({
      id: s.id,
      name_ru: s.name_ru,
      name_original: s.name_original,
      country: s.country,
      founded: s.founded,
      image_commons: s.image_commons,
      external_ids: s.external_ids,
      film_count: studioFilmCount.get(s.id) ?? 0,
    })),
  );

  // Темы: резолвим список фильмов для каждой темы заранее.
  // Источники членства фильма в теме:
  //   1) явное Film.topics[]
  //   2) Topic.filter (director / screenwriter / book_author / year / country)
  // book_author резолвится через references.target.authors.
  const filmsByAuthor = new Map();
  for (const r of references) {
    if (r.target?.type !== "book") continue;
    for (const a of r.target.authors ?? []) {
      let s = filmsByAuthor.get(a);
      if (!s) { s = new Set(); filmsByAuthor.set(a, s); }
      s.add(r.source_film);
    }
  }
  const topicsWithFilms = topics.map((t) => {
    const filter = t.filter;
    const filmsFromRefs = filter?.book_author ? (filmsByAuthor.get(filter.book_author) ?? new Set()) : null;
    const out = [];
    const seen = new Set();
    for (const f of films) {
      let m = false;
      if (f.topics?.includes(t.id)) m = true;
      if (!m && filter) {
        const c1 = filter.year_from == null || (f.year != null && f.year >= filter.year_from);
        const c2 = filter.year_to == null || (f.year != null && f.year <= filter.year_to);
        const c3 = !filter.director || (f.director ?? []).includes(filter.director);
        const c4 = !filter.screenwriter || (f.screenwriter ?? []).includes(filter.screenwriter);
        const c5 = !filter.country || (f.country ?? []).includes(filter.country);
        const c6 = !filter.book_author || filmsFromRefs?.has(f.id);
        const c7 = !filter.composer || (f.composer ?? []).includes(filter.composer);
        const anySet =
          filter.year_from != null || filter.year_to != null ||
          filter.director || filter.screenwriter || filter.country ||
          filter.book_author || filter.composer;
        if (c1 && c2 && c3 && c4 && c5 && c6 && c7 && anySet) m = true;
      }
      if (m && !seen.has(f.id)) { seen.add(f.id); out.push(f.id); }
    }
    return { ...t, films: out };
  });
  writeJson("topics.json", topicsWithFilms);
  writeJson("motifs.json", motifs);
  writeJson("collections.json", collections);
  writeJson("refs.json", references);

  // Словари — {kind: {code: {name, description}}}.
  const vocabulary = {};
  for (const [kind, file] of Object.entries(vocabFiles)) {
    const vp = path.join(DATA_ROOT, "vocabularies", file);
    if (!fs.existsSync(vp)) continue;
    const raw = yaml.load(fs.readFileSync(vp, "utf8"));
    vocabulary[kind] = {};
    for (const v of raw?.values ?? []) {
      if (!v?.code) continue;
      vocabulary[kind][v.code] = {
        name: v.name_ru ?? v.code,
        description: v.description_ru ?? null,
      };
    }
  }
  writeJson("vocabulary.json", vocabulary);

  // Статистика — для /stats без серверного SQL.
  const filmsWithDirector = films.filter((f) => (f.director ?? []).length > 0).length;
  const filmsWithPoster = films.filter((f) => f.poster_commons).length;
  const filmsWithYoutube = films.filter((f) => f.external_ids?.youtube).length;
  const filmsWithImdb = films.filter((f) => f.external_ids?.imdb).length;
  const peopleWithImage = people.filter((p) => p.image_commons).length;
  const peopleWithBirth = people.filter((p) => p.birth).length;

  const byCountry = new Map();
  for (const f of films) for (const c of f.country ?? []) byCountry.set(c, (byCountry.get(c) ?? 0) + 1);
  const byDecade = new Map();
  for (const f of films) {
    if (f.year == null) continue;
    const d = Math.floor(f.year / 10) * 10;
    byDecade.set(d, (byDecade.get(d) ?? 0) + 1);
  }
  const byRole = new Map();
  for (const p of people) for (const r of p.roles ?? []) byRole.set(r, (byRole.get(r) ?? 0) + 1);

  const directorCount = new Map();
  for (const f of films) for (const d of f.director ?? []) directorCount.set(d, (directorCount.get(d) ?? 0) + 1);
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const topDirectors = [...directorCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, c]) => {
      const p = peopleById.get(id);
      return { id, name_ru: p?.name_ru ?? id, image_commons: p?.image_commons, film_count: c };
    });
  const topStudios = [...studioFilmCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, c]) => {
      const s = studios.find((x) => x.id === id);
      return { id, name_ru: s?.name_ru ?? id, count: c };
    });

  writeJson("stats.json", {
    totals: {
      films: films.length,
      people: people.length,
      studios: studios.length,
      topics: topics.length,
      refs: references.length,
    },
    coverage: {
      films_with_director: filmsWithDirector,
      films_with_poster: filmsWithPoster,
      films_with_youtube: filmsWithYoutube,
      films_with_imdb: filmsWithImdb,
      people_with_image: peopleWithImage,
      people_with_birth: peopleWithBirth,
    },
    by_country: [...byCountry.entries()].map(([code, count]) => ({ code, count })),
    by_decade: [...byDecade.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([decade, count]) => ({ decade, count })),
    by_role: [...byRole.entries()].map(([code, count]) => ({ code, count })),
    top_studios: topStudios,
    top_directors: topDirectors,
  });

  console.log(
    `[build-db] public/data/ written: films-index, people-index, studios, topics, motifs, refs, vocabulary, stats`,
  );
}

main();
