import Link from "next/link";
import { notFound } from "next/navigation";

import { Abbr } from "@/lib/abbr";
import { Breadcrumbs } from "@/lib/breadcrumbs";
import { Avatar } from "@/lib/media-components";
import {
  allStudioIds,
  getStudio,
  listFilms,
  topDirectorsOfStudio,
} from "@/lib/queries";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return allStudioIds().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const studio = getStudio(slug);
  if (!studio) return { title: "Студия не найдена" };
  return { title: `${studio.name_ru} — Soviet Bloc Cinema` };
}

export default async function StudioPage({ params }: PageProps) {
  const { slug } = await params;
  const studio = getStudio(slug);
  if (!studio) notFound();
  const films = listFilms({ studio: slug });
  const topDirectors = topDirectorsOfStudio(slug, 8);

  return (
    <article className="space-y-8">
      <Breadcrumbs items={[{ label: "студии", href: "/studios" }, { label: studio.name_ru }]} />
      <header className="space-y-2">
        <p className="titre">студия</p>
        <h1 className="font-display text-3xl text-light">{studio.name_ru}</h1>
        {studio.name_original && studio.name_original !== studio.name_ru && (
          <p className="text-light/70 italic">{studio.name_original}</p>
        )}
        <p className="text-light/70">
          <Abbr kind="country" code={studio.country} display="name" />
          {studio.founded && <> · с {studio.founded}</>}
        </p>
      </header>

      {topDirectors.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-light/90 border-b border-light/10 pb-1">
            Главные режиссёры студии
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {topDirectors.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/people/${d.id}`}
                  className="frame flex items-center gap-3 p-2 hover:border-sepia/40 transition-colors"
                >
                  <Avatar
                    filename={d.image_commons}
                    alt={`Портрет: ${d.name_ru}`}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-light text-sm font-medium leading-tight truncate">
                      {d.name_ru}
                    </p>
                    <p className="titre">{d.film_count} фильмов</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {films.length === 0 ? (
        <p className="text-light/60">
          В базе нет фильмов этой студии. Они появятся по мере обогащения
          каталога — sbc-enrich-films подтянет привязки по QID.
        </p>
      ) : (
        (() => {
          // Группировка по десятилетиям; внутри декады — по убыванию года.
          const groups = new Map<number, typeof films>();
          for (const f of films) {
            if (f.year == null) continue;
            const d = Math.floor(f.year / 10) * 10;
            let arr = groups.get(d);
            if (!arr) {
              arr = [];
              groups.set(d, arr);
            }
            arr.push(f);
          }
          const decades = [...groups.keys()].sort((a, b) => b - a);
          const years = films
            .map((f) => f.year)
            .filter((y): y is number => y != null);
          const span = years.length
            ? `${Math.min(...years)}–${Math.max(...years)}`
            : "";
          return (
            <>
              <p className="titre">
                {films.length} фильмов · период {span} · {decades.length} десятилетий
              </p>
              {decades.map((d) => {
                const items = groups.get(d)!.sort((a, b) => b.year - a.year);
                return (
                  <section key={d} className="space-y-2">
                    <h2 className="text-lg font-semibold text-light/90 border-b border-light/10 pb-1">
                      {d}-е{" "}
                      <span className="text-light/40 text-sm font-normal">
                        {items.length}
                      </span>
                    </h2>
                    <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
                      {items.map((f) => (
                        <li key={f.id}>
                          <Link
                            href={`/films/${f.id}`}
                            className="hover:underline"
                          >
                            <span className="text-light/60 mr-2">{f.year}</span>
                            <span className="font-medium">{f.title_ru}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </>
          );
        })()
      )}

      {studio.external_ids?.wikidata && (
        <section className="text-sm text-light/60">
          <a
            href={`https://www.wikidata.org/wiki/${studio.external_ids.wikidata}`}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-dotted underline-offset-2 hover:text-sepia"
          >
            Wikidata: {studio.external_ids.wikidata}
          </a>
        </section>
      )}

      <p className="text-sm text-light/50">
        slug: <code>{studio.id}</code>
      </p>
    </article>
  );
}
