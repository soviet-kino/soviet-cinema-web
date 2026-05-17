import Link from "next/link";
import { notFound } from "next/navigation";

import { Abbr } from "@/lib/abbr";
import {
  allStudioIds,
  getStudio,
  listFilms,
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

  return (
    <article className="space-y-8">
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

      <section className="space-y-3">
        <h2 className="font-display text-xl text-light border-b border-light/10 pb-1">
          Фильмы студии ({films.length})
        </h2>
        {films.length === 0 ? (
          <p className="text-light/60">
            В базе нет фильмов этой студии. Они появятся по мере обогащения
            каталога — sbc-enrich-films подтянет привязки по QID.
          </p>
        ) : (
          <ul className="divide-y divide-light/10">
            {films.map((f) => (
              <li
                key={f.id}
                className="py-3 flex items-baseline justify-between gap-4"
              >
                <Link href={`/films/${f.id}`} className="hover:underline">
                  <span className="font-medium">{f.title_ru}</span>
                  {f.title_original && f.title_original !== f.title_ru && (
                    <span className="text-light/60 ml-2">
                      «{f.title_original}»
                    </span>
                  )}
                </Link>
                <span className="text-sm text-light/60 shrink-0">{f.year}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

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
