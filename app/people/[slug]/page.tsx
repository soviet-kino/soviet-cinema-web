import Link from "next/link";
import { notFound } from "next/navigation";

import { Abbr } from "@/lib/abbr";
import { Breadcrumbs } from "@/lib/breadcrumbs";
import { Avatar } from "@/lib/media-components";
import {
  allPersonIds,
  collaboratorsOf,
  filmographyOf,
  filmsAdaptedFromAuthor,
  getPerson,
  type FilmographyEntry,
} from "@/lib/queries";

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
  const adaptations = filmsAdaptedFromAuthor(slug);
  // Соратники — только если у человека хотя бы 3 фильма, иначе шум.
  const collaborators =
    films.length >= 3
      ? collaboratorsOf(slug, 12).filter((c) => c.shared_films >= 2)
      : [];

  return (
    <article className="space-y-8">
      <Breadcrumbs items={[{ label: "люди", href: "/people" }, { label: person.name_ru }]} />
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
        (() => {
          // Группировка по ролям, в порядке: director → screenwriter →
          // cinematographer → composer → actor.
          const order: FilmographyEntry["role"][] = [
            "director",
            "screenwriter",
            "cinematographer",
            "composer",
            "actor",
          ];
          const groups = new Map<FilmographyEntry["role"], FilmographyEntry[]>();
          for (const f of films) {
            let arr = groups.get(f.role);
            if (!arr) {
              arr = [];
              groups.set(f.role, arr);
            }
            arr.push(f);
          }
          const years = films.map((f) => f.year).filter((y): y is number => !!y);
          const span = years.length
            ? `${Math.min(...years)}–${Math.max(...years)}`
            : "";
          return (
            <>
              <p className="titre">
                фильмография · {films.length} участий
                {span && <> · {span}</>}
              </p>
              {order
                .filter((role) => groups.has(role))
                .map((role) => {
                  const entries = groups
                    .get(role)!
                    .slice()
                    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
                  const VISIBLE = 30;
                  const visible = entries.slice(0, VISIBLE);
                  const hidden = entries.slice(VISIBLE);
                  const renderRow = (
                    f: (typeof entries)[number],
                    i: number,
                  ) => (
                    <li
                      key={`${f.film_id}-${role}-${i}`}
                      className="flex items-baseline justify-between gap-4"
                    >
                      <Link
                        href={`/films/${f.film_id}`}
                        className="hover:underline"
                      >
                        <span className="text-light/60 mr-2">{f.year}</span>
                        <span className="font-medium">{f.title_ru}</span>
                      </Link>
                      {f.character && (
                        <span className="text-sm text-light/50 shrink-0">
                          {f.character}
                        </span>
                      )}
                    </li>
                  );
                  return (
                    <section key={role} className="space-y-2">
                      <h2 className="text-lg font-semibold text-light/90 border-b border-light/10 pb-1">
                        {ROLE_LABEL[role] ?? role}{" "}
                        <span className="text-light/40 text-sm font-normal">
                          {entries.length}
                        </span>
                      </h2>
                      <ul className="space-y-1">{visible.map(renderRow)}</ul>
                      {hidden.length > 0 && (
                        <details className="group">
                          <summary className="cursor-pointer list-none titre hover:text-sepia inline-flex items-center gap-1">
                            <span className="group-open:rotate-90 transition-transform">▸</span>
                            ещё {hidden.length}
                          </summary>
                          <ul className="space-y-1 mt-2">
                            {hidden.map(renderRow)}
                          </ul>
                        </details>
                      )}
                    </section>
                  );
                })}
            </>
          );
        })()
      ) : (
        <p className="text-light/60">В базе нет фильмов с этим участником.</p>
      )}

      {collaborators.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-light/90 border-b border-light/10 pb-1">
            Часто работал с
          </h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {collaborators.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/people/${c.id}`}
                  className="frame flex items-center gap-3 p-2 hover:border-sepia/40 transition-colors"
                >
                  <Avatar
                    filename={c.image_commons}
                    alt={`Портрет: ${c.name_ru}`}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-light text-sm font-medium leading-tight truncate">
                      {c.name_ru}
                    </p>
                    <p className="titre">
                      {c.shared_films} совместн{c.shared_films === 1 ? "ый фильм" : "ых фильма"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {adaptations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold border-b border-light/10 pb-1">
            Экранизации произведений ({adaptations.length})
          </h2>
          <ul className="space-y-1">
            {adaptations.map((a) => (
              <li
                key={`${a.film_id}-${a.source_title}`}
                className="flex items-baseline justify-between gap-4"
              >
                <Link
                  href={`/films/${a.film_id}`}
                  className="hover:underline"
                >
                  <span className="text-light/60 mr-2">{a.year}</span>
                  <span className="font-medium">{a.title_ru}</span>
                </Link>
                <span className="text-sm text-light/60 shrink-0">
                  по «{a.source_title}»
                  {a.source_year && (
                    <span className="text-light/50"> ({a.source_year})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
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
