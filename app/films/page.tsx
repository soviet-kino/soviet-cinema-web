import Link from "next/link";
import type { ComponentProps } from "react";

import { Abbr } from "@/lib/abbr";
import {
  availableCountries,
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
  }>;
}

// Без force-static, потому что searchParams (country/year/studio) — динамика.
// Иначе Next.js кэширует один вариант (для года по умолчанию) и игнорирует
// query-параметры на проде.
export default async function FilmsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const country = params.country?.trim() || undefined;
  const studio = params.studio?.trim() || undefined;
  const yearParam = params.year?.trim();
  const total = countFilms();

  // Если есть фильтр по студии или стране без явного года — показываем
  // все годы выборки (студия — узкий срез, простыни не будет). Иначе
  // (нет ни студии, ни страны, ни года) — открываем самый поздний год.
  const yearsForCountry = availableYears(country);
  const defaultYearForList = studio ? undefined : yearsForCountry[0];
  const year =
    yearParam === "all"
      ? undefined
      : yearParam
        ? Number(yearParam)
        : defaultYearForList;

  const films = listFilms({ year, country, studio });
  const countriesForYear = availableCountries(year);

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
          </p>
        </div>
      </header>

      {/* СТРАНЫ */}
      <FilterRow label="страна">
        <ChipLink
          active={!country}
          href={hrefWith({ country: undefined, year: yearParam, studio })}
          label="Все"
        />
        {countriesForYear.map((c) => (
          <ChipLink
            key={c.code}
            active={country === c.code}
            href={hrefWith({ country: c.code, year: yearParam, studio })}
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
          href={hrefWith({ country, year: "all", studio })}
          label="Все"
        />
        {yearsForCountry.map((y) => (
          <ChipLink
            key={y}
            active={year === y}
            href={hrefWith({ country, year: String(y), studio })}
            label={String(y)}
          />
        ))}
      </FilterRow>

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
}: {
  href: LinkHref;
  label: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "px-2 py-0.5 rounded border text-sm transition-colors " +
        (active
          ? "border-sepia bg-sepia/20 text-light"
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
}: {
  country?: string;
  year?: string;
  studio?: string;
}): LinkHref {
  const query: Record<string, string> = {};
  if (country) query.country = country;
  if (year) query.year = year;
  if (studio) query.studio = studio;
  return Object.keys(query).length
    ? { pathname: "/films", query }
    : { pathname: "/films" };
}
