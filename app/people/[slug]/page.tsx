import Link from "next/link";
import { notFound } from "next/navigation";

import { Abbr } from "@/lib/abbr";
import { Avatar } from "@/lib/media-components";
import { allPersonIds, filmographyOf, getPerson } from "@/lib/queries";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return allPersonIds().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const person = getPerson(slug);
  if (!person) return { title: "Персона не найдена" };
  return { title: `${person.name_ru} — Soviet Bloc Cinema` };
}

const ROLE_LABEL: Record<string, string> = {
  director: "Режиссёр",
  screenwriter: "Сценарий",
  cinematographer: "Оператор",
  composer: "Композитор",
  actor: "Актёр",
};

export default async function PersonPage({ params }: PageProps) {
  const { slug } = await params;
  const person = getPerson(slug);
  if (!person) notFound();
  const films = filmographyOf(slug);

  return (
    <article className="space-y-8">
      <header className="flex items-start gap-6">
        <div className="shrink-0">
          <Avatar
            filename={person.image_commons}
            alt={`Портрет: ${person.name_ru}`}
            size={96}
          />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">{person.name_ru}</h1>
          {person.name_original && person.name_original !== person.name_ru && (
            <p className="text-lg text-light/70 italic">{person.name_original}</p>
          )}
          <p className="text-light/70">
            {person.birth && <span>{person.birth}</span>}
            {person.death && <span> — {person.death}</span>}
            {(person.roles ?? []).length > 0 && (
              <span>
                {(person.birth || person.death) && " · "}
                {(person.roles ?? []).map((r, i) => (
                  <span key={r}>
                    {i > 0 && ", "}
                    <Abbr kind="role" code={r} display="name" />
                  </span>
                ))}
              </span>
            )}
          </p>
        </div>
      </header>

      {films.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold border-b border-light/10 pb-1">
            Фильмография ({films.length})
          </h2>
          <ul className="space-y-1">
            {films.map((f, i) => (
              <li
                key={`${f.film_id}-${f.role}-${i}`}
                className="flex items-baseline justify-between gap-4"
              >
                <Link href={`/films/${f.film_id}`} className="hover:underline">
                  <span className="text-light/60 mr-2">{f.year}</span>
                  <span className="font-medium">{f.title_ru}</span>
                </Link>
                <span className="text-sm text-light/60 shrink-0">
                  {ROLE_LABEL[f.role] ?? f.role}
                  {f.character && (
                    <span className="text-light/50"> — {f.character}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-light/60">В базе нет фильмов с этим участником.</p>
      )}

      {person.external_ids?.wikidata && (
        <section className="text-sm text-light/60">
          <a
            href={`https://www.wikidata.org/wiki/${person.external_ids.wikidata}`}
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            Wikidata: {person.external_ids.wikidata}
          </a>
        </section>
      )}

      <p className="text-sm text-light/50">
        slug: <code>{person.id}</code>
      </p>
    </article>
  );
}
