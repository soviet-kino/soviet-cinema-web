"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ComponentProps } from "react";

import { Breadcrumbs } from "@/lib/breadcrumbs";
import { ClientAbbr } from "@/lib/client-abbr";
import {
  loadFilms,
  loadTopics,
  type FilmIndexEntry,
  type TopicIndexEntry,
} from "@/lib/client-data";

type LinkHref = ComponentProps<typeof Link>["href"];

// Десятилетия 1910–1990 — даже пустые: чтобы показать охват эпохи целиком.
const DECADES = [1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990];

function FilmsContent() {
  const params = useSearchParams();
  const country = params.get("country")?.trim() || undefined;
  const studio = params.get("studio")?.trim() || undefined;
  const genre = params.get("genre")?.trim() || undefined;
  const topic = params.get("topic")?.trim() || undefined;
  const multi = params.get("multi") === "1";
  const decadeParam = params.get("decade")?.trim();
  const decade = decadeParam ? Number(decadeParam) : undefined;
  const yearParam = params.get("year")?.trim() || undefined;

  const [films, setFilms] = useState<FilmIndexEntry[] | null>(null);
  const [topics, setTopics] = useState<TopicIndexEntry[] | null>(null);

  useEffect(() => {
    loadFilms().then(setFilms);
    loadTopics().then(setTopics);
  }, []);

  const data = useMemo(() => {
    if (!films || !topics) return null;

    // Базовый набор — фильмы темы, если выбрана; иначе все.
    let base = films;
    if (topic) {
      const t = topics.find((x) => x.id === topic);
      const idSet = new Set(t?.films ?? []);
      base = films.filter((f) => idSet.has(f.id));
    }

    // Год: при выбранном decade — диапазон. При конкретном году — точный.
    // Если ни decade, ни year не заданы — без year-фильтра (показываем
    // всё, что доступно базе/теме/со-продукциям).
    const yearVal =
      yearParam === "all" ? undefined : yearParam ? Number(yearParam) : undefined;

    let filtered = base;
    if (multi) filtered = filtered.filter((f) => f.country.length > 1);
    if (country) filtered = filtered.filter((f) => f.country.includes(country));
    if (decade != null) {
      filtered = filtered.filter(
        (f) => f.year != null && f.year >= decade && f.year <= decade + 9,
      );
    }
    if (yearVal != null) filtered = filtered.filter((f) => f.year === yearVal);
    if (studio) filtered = filtered.filter((f) => f.studio.includes(studio));
    if (genre) filtered = filtered.filter((f) => f.genre.includes(genre));

    filtered = [...filtered].sort((a, b) => {
      const ay = a.year ?? 0;
      const by = b.year ?? 0;
      if (ay !== by) return by - ay;
      return a.title_ru.localeCompare(b.title_ru, "ru");
    });

    // Доступные годы в выбранном десятилетии (для подсказок чипов).
    let yearsInDecade: number[] = [];
    if (decade != null) {
      const ys = new Set<number>();
      for (const f of base) {
        if (f.year != null && f.year >= decade && f.year <= decade + 9) ys.add(f.year);
      }
      yearsInDecade = [...ys].sort((a, b) => b - a);
    }

    // Чипы стран — counts в текущем срезе по теме/мульти/декаде (без учёта country/year).
    let countriesScope = base;
    if (multi) countriesScope = countriesScope.filter((f) => f.country.length > 1);
    if (decade != null) {
      countriesScope = countriesScope.filter(
        (f) => f.year != null && f.year >= decade && f.year <= decade + 9,
      );
    }
    const countryCounts = new Map<string, number>();
    for (const f of countriesScope)
      for (const c of f.country) countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
    const allCountries = new Set<string>();
    for (const f of films) for (const c of f.country) allCountries.add(c);
    const countries = [...allCountries]
      .map((code) => ({ code, count: countryCounts.get(code) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

    // Чипы десятилетий с counts по выбранной теме (без декады/года).
    const decadeBase = (() => {
      let s = base;
      if (multi) s = s.filter((f) => f.country.length > 1);
      if (country) s = s.filter((f) => f.country.includes(country));
      return s;
    })();
    const decadeCounts = new Map<number, number>();
    for (const f of decadeBase) {
      if (f.year == null) continue;
      const d = Math.floor(f.year / 10) * 10;
      decadeCounts.set(d, (decadeCounts.get(d) ?? 0) + 1);
    }

    // Чипы жанра.
    let genreScope = filtered;
    if (genre) {
      genreScope = (() => {
        let s = base;
        if (multi) s = s.filter((f) => f.country.length > 1);
        if (country) s = s.filter((f) => f.country.includes(country));
        if (decade != null) s = s.filter((f) => f.year != null && f.year >= decade && f.year <= decade + 9);
        if (yearVal != null) s = s.filter((f) => f.year === yearVal);
        return s;
      })();
    }
    const genreCounts = new Map<string, number>();
    for (const f of genreScope) for (const g of f.genre) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    const genresAvail = [...genreCounts.entries()]
      .map(([code, count]) => ({ code, count }))
      .filter((g) => g.count > 0 || g.code === genre)
      .sort((a, b) => b.count - a.count);

    // Темы с counts (число фильмов в каждой теме). Пустые темы
    // показываем тоже — но приглушёнными в чипе.
    const topicCounts = topics
      .map((t) => ({ id: t.id, name_ru: t.name_ru, count: t.films.length }))
      .sort((a, b) => b.count - a.count);

    // Со-продукции: групп. по парам стран (для отдельного режима multi).
    let coproductionGroups: { key: string; label: string; items: FilmIndexEntry[] }[] = [];
    if (multi && !country && !topic) {
      const groups = new Map<string, FilmIndexEntry[]>();
      for (const f of filtered) {
        const key = [...f.country].sort().join("+");
        let arr = groups.get(key);
        if (!arr) { arr = []; groups.set(key, arr); }
        arr.push(f);
      }
      coproductionGroups = [...groups.entries()]
        .map(([key, items]) => ({ key, label: key, items }))
        .sort((a, b) => b.items.length - a.items.length);
    }

    // Группировка по странам — только когда нет ни country, ни decade,
    // ни года, ни multi-режима, ни жанра. Иначе плоский список.
    const groupByCountry =
      !country && decade == null && yearVal == null && !multi && !genre && yearParam === "all";

    let countrySections: { code: string; items: FilmIndexEntry[] }[] = [];
    if (groupByCountry) {
      const groups = new Map<string, FilmIndexEntry[]>();
      for (const f of filtered) {
        for (const c of f.country) {
          let arr = groups.get(c);
          if (!arr) { arr = []; groups.set(c, arr); }
          arr.push(f);
        }
      }
      countrySections = [...groups.entries()]
        .map(([code, items]) => ({ code, items }))
        .sort((a, b) => b.items.length - a.items.length);
    }

    return {
      films: filtered,
      total: films.length,
      countries,
      decadeCounts,
      yearsInDecade,
      genresAvail,
      topicCounts,
      coproductionGroups,
      countrySections,
      groupByCountry,
      yearVal,
    };
  }, [films, topics, country, studio, genre, topic, multi, decade, yearParam]);

  if (!data) {
    return (
      <section className="space-y-6">
        <Breadcrumbs items={[{ label: "фильмы" }]} />
        <header className="space-y-2">
          <p className="titre">каталог</p>
          <h1 className="font-display text-3xl text-light">Фильмы</h1>
        </header>
        <p className="text-light/40 titre">загрузка…</p>
      </section>
    );
  }

  const link = (over: Partial<Params>) =>
    hrefWith({ country, decade, year: yearParam, studio, genre, topic, multi, ...over });

  const {
    films: list,
    total,
    countries,
    decadeCounts,
    yearsInDecade,
    genresAvail,
    topicCounts,
    coproductionGroups,
    countrySections,
    groupByCountry,
    yearVal,
  } = data;

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: "фильмы" }]} />
      <header className="space-y-2">
        <p className="titre">каталог</p>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="font-display text-3xl text-light">Фильмы</h1>
          <p className="titre">
            {list.length} из {total}
            {topic && <> · тема {topicCounts.find((t) => t.id === topic)?.name_ru ?? topic}</>}
            {multi && <> · со-продукции</>}
            {country && (
              <> · <ClientAbbr kind="countries" code={country} display="name" /></>
            )}
            {decade != null && <> · {decade}-е</>}
            {yearVal != null && <> · {yearVal}</>}
            {genre && <> · <ClientAbbr kind="genres" code={genre} display="name" /></>}
          </p>
        </div>
      </header>

      {/* ТЕМА */}
      <FilterRow label="тема">
        <Chip active={!topic && !multi} href={link({ topic: undefined, multi: false })} label="Все" />
        <Chip
          active={multi}
          href={link({ multi: !multi, topic: undefined })}
          label={<span>со-продукции <span className="text-light/40">{multi ? "✓" : ""}</span></span>}
        />
        {topicCounts.map((t) => (
          <Chip
            key={t.id}
            active={topic === t.id}
            disabled={t.count === 0 && topic !== t.id}
            href={link({ topic: t.id, multi: false })}
            label={
              <span>
                {t.name_ru} <span className="text-light/40">{t.count}</span>
              </span>
            }
          />
        ))}
      </FilterRow>

      {/* СТРАНА */}
      <FilterRow label="страна">
        <Chip active={!country} href={link({ country: undefined })} label="Все" />
        {countries.map((c) => (
          <Chip
            key={c.code}
            active={country === c.code}
            disabled={c.count === 0 && country !== c.code}
            href={link({ country: c.code })}
            label={
              <span>
                <ClientAbbr kind="countries" code={c.code} />{" "}
                <span className="text-light/40">{c.count}</span>
              </span>
            }
          />
        ))}
      </FilterRow>

      {/* ДЕСЯТИЛЕТИЕ */}
      <FilterRow label="декада">
        <Chip
          active={decade == null && (yearParam === "all" || yearParam === undefined)}
          href={link({ decade: undefined, year: "all" })}
          label="Все"
        />
        {DECADES.map((d) => {
          const c = decadeCounts.get(d) ?? 0;
          return (
            <Chip
              key={d}
              active={decade === d}
              disabled={c === 0 && decade !== d}
              href={link({ decade: d, year: undefined })}
              label={
                <span>
                  {d}-е <span className="text-light/40">{c}</span>
                </span>
              }
            />
          );
        })}
      </FilterRow>

      {/* ГОД (только если выбрано десятилетие) */}
      {decade != null && yearsInDecade.length > 0 && (
        <FilterRow label="год">
          <Chip active={yearVal == null} href={link({ year: undefined })} label="Все" />
          {yearsInDecade.map((y) => (
            <Chip
              key={y}
              active={yearVal === y}
              href={link({ year: String(y) })}
              label={String(y)}
            />
          ))}
        </FilterRow>
      )}

      {/* ЖАНР */}
      {genresAvail.length > 0 && (
        <FilterRow label="жанр">
          <Chip active={!genre} href={link({ genre: undefined })} label="Все" />
          {genresAvail.map((g) => (
            <Chip
              key={g.code}
              active={genre === g.code}
              href={link({ genre: g.code })}
              label={
                <span>
                  <ClientAbbr kind="genres" code={g.code} display="name" />{" "}
                  <span className="text-light/40">{g.count}</span>
                </span>
              }
            />
          ))}
        </FilterRow>
      )}

      {/* СПИСОК */}
      {coproductionGroups.length > 0 ? (
        <div className="space-y-3">
          {coproductionGroups.map((g, i) => (
            <FilmsSection
              key={g.key}
              title={
                <>
                  {g.label.split("+").map((c, idx) => (
                    <span key={c}>
                      {idx > 0 && " + "}
                      <ClientAbbr kind="countries" code={c} display="name" />
                    </span>
                  ))}
                </>
              }
              items={g.items}
              defaultOpen={i < 3}
            />
          ))}
        </div>
      ) : groupByCountry && countrySections.length > 0 ? (
        <div className="space-y-3">
          {countrySections.map((s, i) => (
            <FilmsSection
              key={s.code}
              title={<ClientAbbr kind="countries" code={s.code} display="name" />}
              items={s.items}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      ) : (
        <FilmList films={list} maxInitial={300} />
      )}

      {list.length === 0 && (
        <p className="text-light/60">
          По выбранным фильтрам ничего не нашлось. Попробуй сбросить страну,
          десятилетие или тему.
        </p>
      )}
    </section>
  );
}

const FILM_PAGE_SIZE = 300;

function FilmsSection({
  title,
  items,
  defaultOpen,
}: {
  title: React.ReactNode;
  items: FilmIndexEntry[];
  defaultOpen: boolean;
}) {
  // Ленивый рендер: пока секция не открыта, дочерний UL не монтируется.
  // Иначе 3500 Link в секции «СССР» вешает гидрацию.
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="border border-light/10 rounded overflow-hidden group"
    >
      <summary className="cursor-pointer list-none flex items-baseline justify-between gap-4 px-3 py-2 hover:bg-light/5">
        <span className="font-display text-lg text-light">
          <span className="text-sepia/60 inline-block w-4 text-center mr-1 group-open:rotate-90 transition-transform">
            ▸
          </span>
          {title}
        </span>
        <span className="titre">{items.length}</span>
      </summary>
      {open && <FilmList films={items} maxInitial={FILM_PAGE_SIZE} />}
    </details>
  );
}

function FilmList({
  films,
  maxInitial,
}: {
  films: FilmIndexEntry[];
  maxInitial?: number;
}) {
  const [shown, setShown] = useState(maxInitial ?? films.length);
  const visible = films.slice(0, shown);
  return (
    <>
      <ul className="divide-y divide-light/10">
        {visible.map((f) => (
          <li key={f.id} className="py-3 px-3 flex items-baseline justify-between gap-4">
            <Link href={`/films/${f.id}`} className="hover:underline">
              <span className="font-medium">{f.title_ru}</span>
              {f.title_original && f.title_original !== f.title_ru && (
                <span className="text-light/60 ml-2">«{f.title_original}»</span>
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
      {films.length > shown && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => setShown((s) => s + (maxInitial ?? films.length))}
            className="px-3 py-1.5 border border-light/30 rounded text-sm text-light/80 hover:border-sepia hover:text-light transition-colors"
          >
            Показать ещё {Math.min(maxInitial ?? films.length, films.length - shown)} из{" "}
            {films.length - shown}
          </button>
        </div>
      )}
    </>
  );
}

export default function FilmsPage() {
  return (
    <Suspense fallback={null}>
      <FilmsContent />
    </Suspense>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <p className="titre w-14 shrink-0">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  href,
  label,
  active,
  disabled,
}: {
  href: LinkHref;
  label: React.ReactNode;
  active: boolean;
  disabled?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "px-2 py-0.5 rounded border text-sm transition-colors " +
        (active
          ? "border-sepia bg-sepia/20 text-light"
          : disabled
            ? "border-light/10 text-light/30 hover:border-light/30 hover:text-light/60"
            : "border-light/20 text-light/70 hover:border-light/50 hover:text-light")
      }
    >
      {label}
    </Link>
  );
}

interface Params {
  country?: string;
  decade?: number;
  year?: string;
  studio?: string;
  genre?: string;
  topic?: string;
  multi?: boolean;
}

function hrefWith(p: Params): LinkHref {
  const q: Record<string, string> = {};
  if (p.country) q.country = p.country;
  if (p.decade != null) q.decade = String(p.decade);
  if (p.year) q.year = p.year;
  if (p.studio) q.studio = p.studio;
  if (p.genre) q.genre = p.genre;
  if (p.topic) q.topic = p.topic;
  if (p.multi) q.multi = "1";
  return Object.keys(q).length ? { pathname: "/films", query: q } : { pathname: "/films" };
}
