"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import MiniSearch from "minisearch";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { Breadcrumbs } from "@/lib/breadcrumbs";
import { ClientAbbr } from "@/lib/client-abbr";
import {
  loadFilms,
  loadPeople,
  type FilmIndexEntry,
  type PersonIndexEntry,
} from "@/lib/client-data";
import { Avatar } from "@/lib/media-components";

interface SearchEngines {
  films: MiniSearch<FilmIndexEntry>;
  people: MiniSearch<PersonIndexEntry>;
  filmsById: Map<string, FilmIndexEntry>;
  peopleById: Map<string, PersonIndexEntry>;
}

let cachedEngines: Promise<SearchEngines> | null = null;

function buildEngines(): Promise<SearchEngines> {
  if (cachedEngines) return cachedEngines;
  cachedEngines = (async () => {
    const [films, people] = await Promise.all([loadFilms(), loadPeople()]);
    const filmsEngine = new MiniSearch<FilmIndexEntry>({
      idField: "id",
      fields: ["title_ru", "title_original", "title_en"],
      storeFields: ["id"],
      searchOptions: { prefix: true, fuzzy: 0.2, boost: { title_ru: 2 } },
    });
    filmsEngine.addAll(films);

    const peopleEngine = new MiniSearch<PersonIndexEntry>({
      idField: "id",
      fields: ["name_ru", "name_original", "name_translit"],
      storeFields: ["id"],
      searchOptions: { prefix: true, fuzzy: 0.2, boost: { name_ru: 2 } },
    });
    peopleEngine.addAll(people);

    return {
      films: filmsEngine,
      people: peopleEngine,
      filmsById: new Map(films.map((f) => [f.id, f])),
      peopleById: new Map(people.map((p) => [p.id, p])),
    };
  })();
  return cachedEngines;
}

function SearchContent() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const trimmed = q.trim();
  const decade = params.get("decade") ?? "";
  const country = params.get("country") ?? "";
  const [draft, setDraft] = useState(q);
  const [engines, setEngines] = useState<SearchEngines | null>(null);

  useEffect(() => {
    buildEngines().then(setEngines);
  }, []);
  useEffect(() => {
    setDraft(q);
  }, [q]);

  const { films, people, filmsBeforeFacets } = useMemo(() => {
    if (!engines || !trimmed) return { films: [], people: [], filmsBeforeFacets: 0 };
    const filmHits = engines.films.search(trimmed, { combineWith: "AND" });
    const personHits = engines.people.search(trimmed, { combineWith: "AND" }).slice(0, 40);
    let allFilms = filmHits
      .map((h) => engines.filmsById.get(h.id as string))
      .filter((f): f is FilmIndexEntry => !!f);
    const before = allFilms.length;
    if (decade) {
      const d = Number(decade);
      allFilms = allFilms.filter(
        (f) => f.year != null && f.year >= d && f.year <= d + 9,
      );
    }
    if (country) {
      allFilms = allFilms.filter((f) => f.country.includes(country));
    }
    const people = personHits
      .map((h) => engines.peopleById.get(h.id as string))
      .filter((p): p is PersonIndexEntry => !!p);
    return { films: allFilms.slice(0, 80), people, filmsBeforeFacets: before };
  }, [engines, trimmed, decade, country]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = draft.trim();
    const qs = new URLSearchParams();
    if (next) qs.set("q", next);
    if (decade) qs.set("decade", decade);
    if (country) qs.set("country", country);
    router.replace(`/search${qs.toString() ? `?${qs}` : ""}`);
  }

  function setFacet(name: "decade" | "country", value: string | null) {
    const qs = new URLSearchParams();
    if (trimmed) qs.set("q", trimmed);
    if (name !== "decade" && decade) qs.set("decade", decade);
    if (name !== "country" && country) qs.set("country", country);
    if (value) qs.set(name, value);
    router.replace(`/search${qs.toString() ? `?${qs}` : ""}`);
  }

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: "поиск" }]} />
      <header className="space-y-2">
        <p className="titre">поиск</p>
        <h1 className="font-display text-3xl text-light">
          {trimmed ? `«${q}»` : "Поиск по каталогу"}
        </h1>
      </header>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="search"
          name="q"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Введите название фильма…"
          autoFocus
          className="flex-1 bg-velvet border border-light/20 rounded px-3 py-2 text-light placeholder-light/40 focus:border-sepia focus:outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 border border-light/30 rounded text-light hover:border-sepia hover:text-sepia transition-colors"
        >
          Искать
        </button>
      </form>

      {trimmed && (
        <div className="space-y-2">
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="titre w-16 shrink-0">декада</p>
            <div className="flex flex-wrap gap-1.5">
              <FacetChip
                active={!decade}
                onClick={() => setFacet("decade", null)}
                label="Все"
              />
              {[1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990].map((d) => (
                <FacetChip
                  key={d}
                  active={decade === String(d)}
                  onClick={() => setFacet("decade", String(d))}
                  label={`${d}-е`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="titre w-16 shrink-0">страна</p>
            <div className="flex flex-wrap gap-1.5">
              <FacetChip
                active={!country}
                onClick={() => setFacet("country", null)}
                label="Все"
              />
              {["SU", "PL", "CS", "DD", "YU", "HU", "BG", "RO"].map((c) => (
                <FacetChip
                  key={c}
                  active={country === c}
                  onClick={() => setFacet("country", c)}
                  label={c}
                />
              ))}
            </div>
          </div>
          {(decade || country) && films.length < filmsBeforeFacets && (
            <p className="titre text-light/40">
              отфильтровано: {films.length} из {filmsBeforeFacets} совпадений
            </p>
          )}
        </div>
      )}

      {!engines && trimmed && <p className="titre">индекс загружается…</p>}

      {engines && trimmed && films.length === 0 && people.length === 0 && (
        <p className="titre">ничего не найдено</p>
      )}

      {people.length > 0 && (
        <section className="space-y-2">
          <h2 className="titre">люди · {people.length}</h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {people.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/people/${p.id}`}
                  className="frame flex items-center gap-3 p-2 hover:border-sepia/40 transition-colors"
                >
                  <Avatar
                    filename={p.image_commons}
                    alt={`Портрет: ${p.name_ru}`}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-light font-medium truncate">
                      {highlight(p.name_ru ?? p.id, trimmed)}
                    </p>
                    {p.roles.length > 0 && (
                      <p className="titre truncate">
                        {p.roles.map((r, i) => (
                          <span key={r}>
                            {i > 0 && " · "}
                            <ClientAbbr kind="roles" code={r} display="name" />
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {films.length > 0 && (
        <section className="space-y-2">
          <h2 className="titre">фильмы · {films.length}</h2>
          <ul className="divide-y divide-light/10">
            {films.map((f) => (
              <li
                key={f.id}
                className="py-3 flex items-baseline justify-between gap-4"
              >
                <Link href={`/films/${f.id}`} className="hover:underline">
                  <span className="font-medium">
                    {highlight(f.title_ru, trimmed)}
                  </span>
                  {f.title_original && f.title_original !== f.title_ru && (
                    <span className="text-light/60 ml-2">
                      «{highlight(f.title_original, trimmed)}»
                    </span>
                  )}
                </Link>
                <span className="text-sm text-light/60 shrink-0">
                  {f.year}
                  {f.country.length > 0 && (
                    <span className="ml-2">
                      {f.country.map((c, i) => (
                        <span key={c}>
                          {i > 0 && ", "}
                          <ClientAbbr kind="countries" code={c} />
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!trimmed && (
        <p className="text-light/60 text-sm">
          Поиск с fuzzy-сопоставлением по русскому, оригинальному и
          транслитерированному именам. «зерк» найдёт «Зеркало» и
          «Зеркало для героя».
        </p>
      )}
    </section>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchContent />
    </Suspense>
  );
}

/**
 * Подсветка совпадения. Делим текст по запросу (case-insensitive) и
 * оборачиваем найденные куски в <mark>. Чтобы не сломать русский, идём
 * через toLocaleLowerCase + indexOf, а не через regex.
 */
function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const q = query.toLocaleLowerCase("ru");
  const lower = text.toLocaleLowerCase("ru");
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      out.push(text.slice(i));
      break;
    }
    if (idx > i) out.push(text.slice(i, idx));
    out.push(
      <mark
        key={idx}
        className="bg-sepia/30 text-light rounded px-0.5"
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
  }
  return <>{out}</>;
}

function FacetChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-2 py-0.5 rounded border text-sm transition-colors " +
        (active
          ? "border-sepia bg-sepia/20 text-light"
          : "border-light/20 text-light/70 hover:border-light/50 hover:text-light")
      }
    >
      {label}
    </button>
  );
}
