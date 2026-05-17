import Link from "next/link";
import type { ComponentProps } from "react";

import { Abbr } from "@/lib/abbr";
import {
  availableCountries,
  availableGenres,
  availableYears,
  countFilms,
  listFilms,
} from "@/lib/queries";

type LinkHref = ComponentProps<typeof Link>["href"];

interface PageProps {
  searchParams: Promise<{
    year?: string;
    country?: string;
    studio?: string;
    genre?: string;
  }>;
}

// Без force-static, потому что searchParams — динамика. Иначе Next.js
// кэширует один вариант (для года по умолчанию) и игнорирует параметры.
export default async function FilmsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const country = params.country?.trim() || undefined;
  const studio = params.studio?.trim() || undefined;
  const genre = params.genre?.trim() || undefined;
  const yearParam = params.year?.trim();
  const total = countFilms();

  // Если есть фильтр по студии/стране/жанру без явного года — показываем
  // всю выборку без year-дефолта; иначе по умолчанию — самый поздний год.
  const yearsForCountry = availableYears(country);
  const hasNonYearFilter = !!(studio || genre);
  const defaultYearForList = hasNonYearFilter ? undefined : yearsForCountry[0];
  const year =
    yearParam === "all"
      ? undefined
      : yearParam
        ? Number(yearParam)
        : defaultYearForList;

  const films = listFilms({ year, country, studio, genre });
  const countriesForYear = availableCountries(year);
  // Жанры показываем для текущего среза (year + country), без учёта
  // самого жанра — иначе чипы будут зависеть от собственного выбора.
  const genresForCurrent = availableGenres({ year, country }).filter(
    (g) => g.count > 0 || g.code === genre,
  );

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="titre">каталог</p>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="font-display text-3xl text-light">Фильмы</h1>
          <p className="titre">
            {films.length} из {total}
            {country && (
              <>
                {" · "}
                <Abbr kind="country" code={country} display="name" />
              </>
            )}
            {year && <> · {year}</>}
            {studio && <> · студия {studio}</>}
            {genre && (
              <>
                {" · "}
                <Abbr kind="genre" code={genre} display="name" />
              </>
            )}
          </p>
        </div>
      </header>

      {/* СТРАНЫ */}
      <FilterRow label="страна">
        <ChipLink
          active={!country}
          href={hrefWith({ country: undefined, year: yearParam, studio, genre })}
          label="Все"
        />
        {countriesForYear.map((c) => (
          <ChipLink
            key={c.code}
            active={country === c.code}
            disabled={c.count === 0 && country !== c.code}
            href={hrefWith({ country: c.code, year: yearParam, studio, genre })}
            label={
              <span>
                <Abbr kind="country" code={c.code} />{" "}
                <span className="text-light/40">{c.count}</span>
              </span>
            }
          />
        ))}
      </FilterRow>

      {/* ГОДЫ */}
      <FilterRow label="год">
        <ChipLink
          active={year == null}
          href={hrefWith({ country, year: "all", studio, genre })}
          label="Все"
        />
        {yearsForCountry.map((y) => (
          <ChipLink
            key={y}
            active={year === y}
            href={hrefWith({ country, year: String(y), studio, genre })}
            label={String(y)}
          />
        ))}
      </FilterRow>

      {/* ЖАНРЫ */}
      {genresForCurrent.length > 0 && (
        <FilterRow label="жанр">
          <ChipLink
            active={!genre}
            href={hrefWith({ country, year: yearParam, studio, genre: undefined })}
            label="Все"
          />
          {genresForCurrent.map((g) => (
            <ChipLink
              key={g.code}
              active={genre === g.code}
              href={hrefWith({ country, year: yearParam, studio, genre: g.code })}
              label={
                <span>
                  <Abbr kind="genre" code={g.code} display="name" />{" "}
                  <span className="text-light/40">{g.count}</span>
                </span>
              }
            />
          ))}
        </FilterRow>
      )}

      <ul className="divide-y divide-light/10">
        {films.map((f) => (
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
                      <Abbr kind="country" code={c} />
                    </span>
                  ))}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {films.length === 0 && (
        <p className="text-light/60">
          По выбранным фильтрам ничего не нашлось. Попробуйте сбросить
          страну или год.
        </p>
      )}
    </section>
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
  // Приглушённые чипы (count=0) всё равно кликаем — клик уведёт на
  // пустую выборку и UI покажет «нет фильмов». Это правильно: чип-
  // фильтр должен быть стабильным, не появляться/исчезать.
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
