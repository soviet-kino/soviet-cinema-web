"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ComponentProps } from "react";

import { Breadcrumbs } from "@/lib/breadcrumbs";
import { ClientAbbr } from "@/lib/client-abbr";
import { loadFilms, type FilmIndexEntry } from "@/lib/client-data";

type LinkHref = ComponentProps<typeof Link>["href"];

function FilmsContent() {
  const params = useSearchParams();
  const country = params.get("country")?.trim() || undefined;
  const studio = params.get("studio")?.trim() || undefined;
  const genre = params.get("genre")?.trim() || undefined;
  const yearParam = params.get("year")?.trim() || undefined;

  const [films, setFilms] = useState<FilmIndexEntry[] | null>(null);

  useEffect(() => {
    loadFilms().then(setFilms);
  }, []);

  const data = useMemo(() => {
    if (!films) return null;

    // Все года, доступные для выбранной страны (если страна задана).
    const filmsForCountry = country
      ? films.filter((f) => f.country.includes(country))
      : films;
    const years = [
      ...new Set(filmsForCountry.map((f) => f.year).filter((y): y is number => y != null)),
    ].sort((a, b) => b - a);

    const hasNonYearFilter = !!(studio || genre);
    const defaultYearForList = hasNonYearFilter ? undefined : years[0];
    const year =
      yearParam === "all"
        ? undefined
        : yearParam
          ? Number(yearParam)
          : defaultYearForList;

    // Фильтрация.
    let filtered = films;
    if (year != null) filtered = filtered.filter((f) => f.year === year);
    if (country) filtered = filtered.filter((f) => f.country.includes(country));
    if (studio) filtered = filtered.filter((f) => f.studio.includes(studio));
    if (genre) filtered = filtered.filter((f) => f.genre.includes(genre));
    filtered = [...filtered].sort((a, b) => {
      const ay = a.year ?? 0;
      const by = b.year ?? 0;
      if (ay !== by) return by - ay;
      return a.title_ru.localeCompare(b.title_ru, "ru");
    });

    // Доступные страны для текущего года (если год задан).
    const filmsForYear = year != null ? films.filter((f) => f.year === year) : films;
    const countryCounts = new Map<string, number>();
    for (const f of filmsForYear) {
      for (const c of f.country) {
        countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
      }
    }
    // Полный список стран — все из vocabulary, но порядок по count.
    // Берём union of ever-seen стран в индексе.
    const allCountriesSet = new Set<string>();
    for (const f of films) for (const c of f.country) allCountriesSet.add(c);
    const countries = [...allCountriesSet]
      .map((code) => ({ code, count: countryCounts.get(code) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

    // Жанры в текущем срезе year+country (без учёта самого жанра).
    const filmsForGenres = (() => {
      let s = films;
      if (year != null) s = s.filter((f) => f.year === year);
      if (country) s = s.filter((f) => f.country.includes(country));
      return s;
    })();
    const genreCounts = new Map<string, number>();
    for (const f of filmsForGenres) {
      for (const g of f.genre) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    }
    const genresAvail = [...genreCounts.entries()]
      .map(([code, count]) => ({ code, count }))
      .filter((g) => g.count > 0 || g.code === genre)
      .sort((a, b) => b.count - a.count);

    return {
      films: filtered,
      year,
      years,
      countries,
      genresAvail,
      total: films.length,
    };
  }, [films, country, studio, genre, yearParam]);

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

  const { films: list, year, years, countries, genresAvail, total } = data;

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: "фильмы" }]} />
      <header className="space-y-2">
        <p className="titre">каталог</p>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="font-display text-3xl text-light">Фильмы</h1>
          <p className="titre">
            {list.length} из {total}
            {country && (
              <>
                {" · "}
                <ClientAbbr kind="countries" code={country} display="name" />
              </>
            )}
            {year && <> · {year}</>}
            {studio && <> · студия {studio}</>}
            {genre && (
              <>
                {" · "}
                <ClientAbbr kind="genres" code={genre} display="name" />
              </>
            )}
          </p>
        </div>
      </header>

      <FilterRow label="страна">
        <ChipLink
          active={!country}
          href={hrefWith({ country: undefined, year: yearParam, studio, genre })}
          label="Все"
        />
        {countries.map((c) => (
          <ChipLink
            key={c.code}
            active={country === c.code}
            disabled={c.count === 0 && country !== c.code}
            href={hrefWith({ country: c.code, year: yearParam, studio, genre })}
            label={
              <span>
                <ClientAbbr kind="countries" code={c.code} />{" "}
                <span className="text-light/40">{c.count}</span>
              </span>
            }
          />
        ))}
      </FilterRow>

      <FilterRow label="год">
        <ChipLink
          active={year == null}
          href={hrefWith({ country, year: "all", studio, genre })}
          label="Все"
        />
        {years.map((y) => (
          <ChipLink
            key={y}
            active={year === y}
            href={hrefWith({ country, year: String(y), studio, genre })}
            label={String(y)}
          />
        ))}
      </FilterRow>

      {genresAvail.length > 0 && (
        <FilterRow label="жанр">
          <ChipLink
            active={!genre}
            href={hrefWith({ country, year: yearParam, studio, genre: undefined })}
            label="Все"
          />
          {genresAvail.map((g) => (
            <ChipLink
              key={g.code}
              active={genre === g.code}
              href={hrefWith({ country, year: yearParam, studio, genre: g.code })}
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

      <ul className="divide-y divide-light/10">
        {list.map((f) => (
          <li
            key={f.id}
            className="py-3 flex items-baseline justify-between gap-4"
          >
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

      {list.length === 0 && (
        <p className="text-light/60">
          По выбранным фильтрам ничего не нашлось. Попробуйте сбросить
          страну или год.
        </p>
      )}
    </section>
  );
}

export default function FilmsPage() {
  // Suspense нужен, потому что useSearchParams внутри FilmsContent
  // вызывает CSR bailout в production builds (Next.js требование).
  return (
    <Suspense fallback={null}>
      <FilmsContent />
    </Suspense>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <p className="titre w-14 shrink-0">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ChipLink({
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

function hrefWith({
  country,
  year,
  studio,
  genre,
}: {
  country?: string;
  year?: string;
  studio?: string;
  genre?: string;
}): LinkHref {
  const query: Record<string, string> = {};
  if (country) query.country = country;
  if (year) query.year = year;
  if (studio) query.studio = studio;
  if (genre) query.genre = genre;
  return Object.keys(query).length
    ? { pathname: "/films", query }
    : { pathname: "/films" };
}
