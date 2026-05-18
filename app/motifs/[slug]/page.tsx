import Link from "next/link";
import { notFound } from "next/navigation";

import { Abbr } from "@/lib/abbr";
import { allMotifIds, getMotif, topicsWithMotif } from "@/lib/queries";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return allMotifIds().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const m = getMotif(slug);
  if (!m) return { title: "Мотив не найден" };
  return { title: `${m.name_ru} — Soviet Bloc Cinema` };
}

export default async function MotifPage({ params }: PageProps) {
  const { slug } = await params;
  const motif = getMotif(slug);
  if (!motif) notFound();
  const topics = topicsWithMotif(slug);

  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <p className="titre">мотив</p>
        <h1 className="font-display text-3xl text-light">{motif.name_ru}</h1>
        {motif.category && motif.category.length > 0 && (
          <p className="titre">
            {motif.category.map((c, i) => (
              <span key={c}>
                {i > 0 && " · "}
                <Abbr kind="motif_category" code={c} display="name" />
              </span>
            ))}
          </p>
        )}
      </header>

      <section className="prose prose-stone max-w-none text-light/85">
        {motif.description_ru.split(/\n\s*\n/).map((p, i) => (
          <p key={i}>{p.trim()}</p>
        ))}
      </section>

      {topics.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-light border-b border-light/10 pb-1">
            Связанные темы
          </h2>
          <ul className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/topics/${t.id}`}
                  className="px-2 py-0.5 rounded border border-sepia/40 text-sepia text-sm hover:bg-sepia/10 transition-colors"
                >
                  {t.name_ru}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-light/50">
        slug: <code>{motif.id}</code>
      </p>
    </article>
  );
}
