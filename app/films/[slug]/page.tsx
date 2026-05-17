import { notFound } from "next/navigation";

import { Abbr } from "@/lib/abbr";
import {
  allFilmIds,
  getFilm,
  personsByIds,
  studiosByIds,
} from "@/lib/queries";
import type { Film, Person, Studio } from "@/lib/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return allFilmIds().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const film = getFilm(slug);
  if (!film) return { title: "Фильм не найден" };
  return {
    title: `${film.title_ru} (${film.year}) — Soviet Bloc Cinema`,
    description:
      film.title_original !== film.title_ru
        ? `${film.title_original} (${film.year})`
        : `${film.title_ru} (${film.year})`,
  };
}

export default async function FilmPage({ params }: PageProps) {
  const { slug } = await params;
  const film = getFilm(slug);
  if (!film) notFound();

  const allPeopleIds = [
    ...(film.director ?? []),
    ...(film.screenwriter ?? []),
    ...(film.cinematographer ?? []),
    ...(film.composer ?? []),
    ...(film.cast?.map((c) => c.person) ?? []),
  ];
  const peopleMap = personsByIds(allPeopleIds);
  const studioMap = studiosByIds(film.studio ?? []);

  return (
    <article className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">{film.title_ru}</h1>
        {film.title_original && film.title_original !== film.title_ru && (
          <p className="text-lg text-ink/70 italic">«{film.title_original}»</p>
        )}
        {film.title_en && film.title_en !== film.title_ru && (
          <p className="text-sm text-ink/60">{film.title_en}</p>
        )}
        <p className="text-ink/70">
          {film.year}
          {film.country.length > 0 && (
            <span>
              {" · "}
              {film.country.map((c, i) => (
                <span key={c}>
                  {i > 0 && ", "}
                  <Abbr kind="country" code={c} />
                </span>
              ))}
            </span>
          )}
          {film.republic && (
            <span>
              {" · "}
              <Abbr kind="republic" code={film.republic} />
            </span>
          )}
          {film.runtime_min && <span> · {film.runtime_min} мин</span>}
        </p>
      </header>

      <Section title="Производство">
        <Credit label="Режиссёр" ids={film.director} people={peopleMap} />
        <Credit label="Сценарий" ids={film.screenwriter} people={peopleMap} />
        <Credit label="Оператор" ids={film.cinematographer} people={peopleMap} />
        <Credit label="Композитор" ids={film.composer} people={peopleMap} />
        <StudioCredit studios={film.studio} studioMap={studioMap} />
      </Section>

      {film.cast && film.cast.length > 0 && (
        <Section title="В ролях">
          <ul className="space-y-1">
            {film.cast.map((c, i) => {
              const p = peopleMap.get(c.person);
              return (
                <li key={i}>
                  <PersonName id={c.person} person={p} />
                  {c.role && <span className="text-ink/60"> — {c.role}</span>}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Tags film={film} />

      <Section title="Внешние идентификаторы">
        <ExternalIdsView film={film} />
      </Section>

      {film.sources && film.sources.length > 0 && (
        <Section title="Источники">
          <ul className="space-y-1">
            {film.sources.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  className="underline break-all"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className="text-sm text-ink/50">
        slug: <code>{film.id}</code>
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold border-b border-ink/10 pb-1">
        {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Credit({
  label,
  ids,
  people,
}: {
  label: string;
  ids?: string[];
  people: Map<string, Person>;
}) {
  if (!ids || ids.length === 0) return null;
  return (
    <p>
      <span className="text-ink/60 mr-2">{label}:</span>
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 && ", "}
          <PersonName id={id} person={people.get(id)} />
        </span>
      ))}
    </p>
  );
}

function StudioCredit({
  studios,
  studioMap,
}: {
  studios?: string[];
  studioMap: Map<string, Studio>;
}) {
  if (!studios || studios.length === 0) return null;
  return (
    <p>
      <span className="text-ink/60 mr-2">Студия:</span>
      {studios.map((id, i) => {
        const s = studioMap.get(id);
        return (
          <span key={id}>
            {i > 0 && ", "}
            {s ? s.name_ru : <code className="text-ink/50">{id}</code>}
          </span>
        );
      })}
    </p>
  );
}

function PersonName({ id, person }: { id: string; person?: Person }) {
  if (!person) return <code className="text-ink/50">{id}</code>;
  return <span>{person.name_ru}</span>;
}

function Tags({ film }: { film: Film }) {
  // Каждый тег — с подписанным kind, чтобы пробросить расшифровку из словаря.
  const tags: Array<{ kind: "genre" | "language" | "censorship_status" | "color"; code: string }> = [];
  if (film.genre) for (const g of film.genre) tags.push({ kind: "genre", code: g });
  if (film.language)
    for (const l of film.language) tags.push({ kind: "language", code: l });
  if (film.color) tags.push({ kind: "color", code: film.color });
  if (film.censorship_status)
    tags.push({ kind: "censorship_status", code: film.censorship_status });
  if (tags.length === 0) return null;
  return (
    <Section title="Метки">
      <ul className="flex flex-wrap gap-2 text-sm">
        {tags.map((t) => (
          <li
            key={`${t.kind}:${t.code}`}
            className="px-2 py-0.5 rounded border border-ink/20 text-ink/70"
          >
            {t.kind === "color" ? (
              t.code === "bw"
                ? "ч/б"
                : t.code === "color_and_bw"
                  ? "цвет + ч/б"
                  : "цвет"
            ) : (
              <Abbr kind={t.kind} code={t.code} display="name" />
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ExternalIdsView({ film }: { film: Film }) {
  const ids = film.external_ids;
  if (!ids) return <p className="text-ink/50">—</p>;
  const items: { label: string; href: string; value: string }[] = [];
  if (ids.wikidata)
    items.push({
      label: "Wikidata",
      value: ids.wikidata,
      href: `https://www.wikidata.org/wiki/${ids.wikidata}`,
    });
  if (ids.imdb)
    items.push({
      label: "IMDb",
      value: ids.imdb,
      href: `https://www.imdb.com/title/${ids.imdb}/`,
    });
  if (ids.tmdb)
    items.push({
      label: "TMDB",
      value: String(ids.tmdb),
      href: `https://www.themoviedb.org/movie/${ids.tmdb}`,
    });
  if (items.length === 0) return <p className="text-ink/50">—</p>;
  return (
    <ul className="space-y-1">
      {items.map((i) => (
        <li key={i.label}>
          <span className="text-ink/60 mr-2">{i.label}:</span>
          <a
            href={i.href}
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            {i.value}
          </a>
        </li>
      ))}
    </ul>
  );
}
