import Link from "next/link";
import { notFound } from "next/navigation";

import { Abbr } from "@/lib/abbr";
import { Breadcrumbs } from "@/lib/breadcrumbs";
import { allTopicIds, filmsByTopic, getTopic } from "@/lib/queries";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return allTopicIds().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) return { title: "Тема не найдена" };
  return {
    title: `${topic.name_ru} — Soviet Bloc Cinema`,
    description: topic.description_ru,
  };
}

export default async function TopicPage({ params }: PageProps) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();
  const films = filmsByTopic(slug);

  return (
    <article className="space-y-8">
      <Breadcrumbs items={[{ label: "темы", href: "/topics" }, { label: topic.name_ru }]} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{topic.name_ru}</h1>
        <p className="text-lg text-light/80">{topic.description_ru}</p>
      </header>

      {topic.long_description_ru && (
        <section className="prose prose-stone max-w-none">
          {topic.long_description_ru.split(/\n\s*\n/).map((p, i) => (
            <p key={i}>{p.trim()}</p>
          ))}
        </section>
      )}

      {films.length === 0 ? (
        <p className="text-light/60">
          В этом разделе пока нет фильмов. Они появятся по мере роста базы и
          кураторской разметки.
        </p>
      ) : (
        (() => {
          // При большом числе фильмов (>80) группируем по десятилетиям —
          // иначе плоский список превращается в простыню (stagnation-cinema
          // отдавал 3194 фильма одним блоком, 4 МБ HTML).
          const useDecades = films.length > 80;
          const groups = new Map<number, typeof films>();
          if (useDecades) {
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
          }
          const decades = useDecades
            ? [...groups.keys()].sort((a, b) => b - a)
            : [];
          const renderFilm = (f: (typeof films)[number]) => (
            <li
              key={f.id}
              className="py-2 flex items-baseline justify-between gap-4"
            >
              <Link href={`/films/${f.id}`} className="hover:underline">
                <span className="font-medium">{f.title_ru}</span>
                {f.title_original && f.title_original !== f.title_ru && (
                  <span className="text-light/60 ml-2">«{f.title_original}»</span>
                )}
              </Link>
              <span className="text-sm text-light/60 shrink-0">
                {f.soviet_release_year ? (
                  <>
                    <span className="text-sepia">сов. {f.soviet_release_year}</span>
                    <span className="ml-2 text-light/40">· оригинал {f.year}</span>
                  </>
                ) : (
                  <>{f.year}</>
                )}
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
          );
          return (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold border-b border-light/10 pb-1">
                Фильмы раздела ({films.length})
              </h2>
              {!useDecades ? (
                <ul className="divide-y divide-light/10">
                  {films.map(renderFilm)}
                </ul>
              ) : (
                <div className="space-y-3">
                  {decades.map((d) => {
                    const items = groups.get(d)!.sort((a, b) => b.year - a.year);
                    return (
                      <details
                        key={d}
                        open={d === decades[0]}
                        className="border border-light/10 rounded overflow-hidden group"
                      >
                        <summary className="cursor-pointer list-none flex items-baseline justify-between gap-4 px-3 py-2 hover:bg-light/5">
                          <span className="font-display text-lg text-light">
                            <span className="text-sepia/60 inline-block w-4 text-center mr-1 group-open:rotate-90 transition-transform">
                              ▸
                            </span>
                            {d}-е
                          </span>
                          <span className="titre">{items.length}</span>
                        </summary>
                        <ul className="divide-y divide-light/10 px-3 pb-2">
                          {items.map(renderFilm)}
                        </ul>
                      </details>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })()
      )}

      {topic.related_motifs && topic.related_motifs.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-light/80 mb-2">
            Связанные мотивы
          </h3>
          <ul className="flex flex-wrap gap-2 text-sm">
            {topic.related_motifs.map((m) => (
              <li
                key={m}
                className="px-2 py-0.5 rounded border border-light/20 text-light/70"
              >
                {m}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-light/50">
        slug: <code>{topic.id}</code>
      </p>
    </article>
  );
}
