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

      <section className="space-y-3">
        <h2 className="text-xl font-semibold border-b border-light/10 pb-1">
          Фильмы раздела ({films.length})
        </h2>
        {films.length === 0 ? (
          <p className="text-light/60">
            В этом разделе пока нет фильмов. Они появятся по мере роста базы и
            кураторской разметки.
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
        )}
      </section>

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
