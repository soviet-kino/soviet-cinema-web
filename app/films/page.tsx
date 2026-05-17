import Link from "next/link";

import { Abbr } from "@/lib/abbr";
import { availableYears, listFilms } from "@/lib/queries";

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

export const dynamic = "force-static";

export default async function FilmsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const year = params.year ? Number(params.year) : undefined;
  const films = listFilms({ year });
  const years = availableYears();

  return (
    <section className="space-y-6">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Фильмы</h1>
        <p className="text-sm text-ink/60">
          {films.length} из {listFilms().length}
        </p>
      </header>

      {years.length > 1 && (
        <nav className="flex flex-wrap gap-2 text-sm">
          <YearLink active={year == null} year={null} label="Все" />
          {years.map((y) => (
            <YearLink key={y} active={year === y} year={y} label={String(y)} />
          ))}
        </nav>
      )}

      <ul className="divide-y divide-ink/10">
        {films.map((f) => (
          <li key={f.id} className="py-3 flex items-baseline justify-between gap-4">
            <Link href={`/films/${f.id}`} className="hover:underline">
              <span className="font-medium">{f.title_ru}</span>
              {f.title_original && f.title_original !== f.title_ru && (
                <span className="text-ink/60 ml-2">«{f.title_original}»</span>
              )}
            </Link>
            <span className="text-sm text-ink/60 shrink-0">
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
        <p className="text-ink/60">По выбранному фильтру фильмов нет.</p>
      )}
    </section>
  );
}

function YearLink({
  year,
  label,
  active,
}: {
  year: number | null;
  label: string;
  active: boolean;
}) {
  const href = year == null ? { pathname: "/films" } : { pathname: "/films", query: { year } };
  return (
    <Link
      href={href}
      className={
        "px-2 py-1 rounded border " +
        (active
          ? "border-ink bg-ink text-paper"
          : "border-ink/20 hover:border-ink/50")
      }
    >
      {label}
    </Link>
  );
}
