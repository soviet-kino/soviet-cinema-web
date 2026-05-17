import Link from "next/link";
import { notFound } from "next/navigation";

import { Abbr } from "@/lib/abbr";
import { Avatar, Poster, WatchBlock } from "@/lib/media-components";
import {
  allFilmIds,
  getFilm,
  listFilms,
  literarySourceOf,
  personsByIds,
  studiosByIds,
  topicsContainingFilm,
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
  // Авторов литературного первоисточника тоже стоит подтянуть в peopleMap,
  // чтобы показать их имена со ссылками на /people/[slug].
  const litSource = literarySourceOf(slug);
  const peopleMap = personsByIds([...allPeopleIds, ...(litSource?.authors ?? [])]);
  const studioMap = studiosByIds(film.studio ?? []);
  const filmTopics = topicsContainingFilm(slug);
  // Другие фильмы первого режиссёра — до 10, исключая текущий, сортировка
  // от свежих к ранним. Если у фильма нет режиссёра — пусто.
  const directorSlug = film.director?.[0];
  const relatedByDirector = directorSlug
    ? listFilms({ director: directorSlug, limit: 11 })
        .filter((f) => f.id !== slug)
        .slice(0, 10)
    : [];

  return (
    <article className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6 items-start">
        <aside className="sm:row-span-2">
          <Poster filename={film.poster_commons} alt={`Постер фильма «${film.title_ru}»`} />
        </aside>
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold">{film.title_ru}</h1>
          {film.title_original && film.title_original !== film.title_ru && (
            <p className="text-lg text-light/70 italic">«{film.title_original}»</p>
          )}
          {film.title_en && film.title_en !== film.title_ru && (
            <p className="text-sm text-light/60">{film.title_en}</p>
          )}
          <p className="text-light/70">
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
          {filmTopics.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 pt-2">
              {filmTopics.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/topics/${t.id}`}
                    className="px-2 py-0.5 rounded border border-sepia/40 text-sepia text-xs hover:bg-sepia/10 transition-colors"
                  >
                    {t.name_ru}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </header>
        <div>
          <WatchBlock
            youtubeId={film.external_ids?.youtube}
            titleRu={film.title_ru}
            year={film.year}
          />
        </div>
      </div>

      <Section title="Производство">
        <Credit label="Режиссёр" ids={film.director} people={peopleMap} />
        <Credit label="Сценарий" ids={film.screenwriter} people={peopleMap} />
        <Credit label="Оператор" ids={film.cinematographer} people={peopleMap} />
        <Credit label="Композитор" ids={film.composer} people={peopleMap} />
        <StudioCredit studios={film.studio} studioMap={studioMap} />
      </Section>

      {litSource && (
        <Section title="Литературный источник">
          <p>
            «{litSource.title}»
            {litSource.year && (
              <span className="text-light/60"> ({litSource.year})</span>
            )}
            {litSource.authors.length > 0 && (
              <>
                <span className="text-light/60"> · </span>
                {litSource.authors.map((aid, i) => {
                  const a = peopleMap.get(aid);
                  return (
                    <span key={aid}>
                      {i > 0 && ", "}
                      <PersonName id={aid} person={a} />
                    </span>
                  );
                })}
              </>
            )}
          </p>
        </Section>
      )}

      {film.cast && film.cast.length > 0 && (
        <Section title="В ролях">
          <ul className="space-y-2">
            {film.cast.map((c, i) => {
              const p = peopleMap.get(c.person);
              return (
                <li key={i} className="flex items-center gap-3">
                  <Avatar
                    filename={p?.image_commons}
                    alt={p ? `Портрет: ${p.name_ru}` : ""}
                    size={32}
                  />
                  <span>
                    <PersonName id={c.person} person={p} />
                    {c.role && <span className="text-light/60"> — {c.role}</span>}
                  </span>
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

      {relatedByDirector.length > 0 && directorSlug && (
        <Section
          title={`Другие фильмы режиссёра — ${peopleMap.get(directorSlug)?.name_ru ?? directorSlug}`}
        >
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
            {relatedByDirector.map((f) => (
              <li key={f.id}>
                <Link href={`/films/${f.id}`} className="hover:underline">
                  <span className="text-light/60 mr-2">{f.year}</span>
                  <span className="font-medium">{f.title_ru}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="pt-2">
            <Link
              href={`/people/${directorSlug}`}
              className="titre hover:text-sepia"
            >
              Все фильмы режиссёра →
            </Link>
          </p>
        </Section>
      )}

      <p className="text-sm text-light/50">
        slug: <code>{film.id}</code>
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold border-b border-light/10 pb-1">
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
      <span className="text-light/60 mr-2">{label}:</span>
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
      <span className="text-light/60 mr-2">Студия:</span>
      {studios.map((id, i) => {
        const s = studioMap.get(id);
        return (
          <span key={id}>
            {i > 0 && ", "}
            <Link
              href={`/studios/${id}`}
              className="hover:underline hover:text-sepia"
            >
              {s ? s.name_ru : <code className="text-light/50">{id}</code>}
            </Link>
          </span>
        );
      })}
    </p>
  );
}

function PersonName({ id, person }: { id: string; person?: Person }) {
  if (!person) return <code className="text-light/50">{id}</code>;
  return (
    <Link href={`/people/${id}`} className="hover:underline">
      {person.name_ru}
    </Link>
  );
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
        {tags.map((t) => {
          // Жанр — кликабельный: ведёт в /films?genre=...
          // Остальные пока без своей страницы.
          const body =
            t.kind === "color" ? (
              t.code === "bw" ? (
                "ч/б"
              ) : t.code === "color_and_bw" ? (
                "цвет + ч/б"
              ) : (
                "цвет"
              )
            ) : (
              <Abbr kind={t.kind} code={t.code} display="name" />
            );
          if (t.kind === "genre") {
            return (
              <li key={`${t.kind}:${t.code}`}>
                <Link
                  href={{ pathname: "/films", query: { genre: t.code } }}
                  className="block px-2 py-0.5 rounded border border-light/20 text-light/70 hover:border-sepia hover:text-sepia transition-colors"
                >
                  {body}
                </Link>
              </li>
            );
          }
          return (
            <li
              key={`${t.kind}:${t.code}`}
              className="px-2 py-0.5 rounded border border-light/20 text-light/70"
            >
              {body}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function ExternalIdsView({ film }: { film: Film }) {
  const ids = film.external_ids;
  if (!ids) return <p className="text-light/50">—</p>;
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
  if (ids.youtube)
    items.push({
      label: "YouTube",
      value: ids.youtube,
      href: `https://www.youtube.com/watch?v=${ids.youtube}`,
    });
  if (items.length === 0) return <p className="text-light/50">—</p>;
  return (
    <ul className="space-y-1">
      {items.map((i) => (
        <li key={i.label}>
          <span className="text-light/60 mr-2">{i.label}:</span>
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
