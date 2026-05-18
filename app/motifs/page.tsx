import Link from "next/link";

import { Abbr } from "@/lib/abbr";
import { Breadcrumbs } from "@/lib/breadcrumbs";
import { listMotifs } from "@/lib/queries";

export const dynamic = "force-static";

export default function MotifsPage() {
  const motifs = listMotifs();
  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: "мотивы" }]} />
      <header className="space-y-2">
        <p className="titre">мотивы</p>
        <h1 className="font-display text-3xl text-light">Мотивы и приёмы</h1>
      </header>

      <p className="text-light/70 max-w-2xl">
        Повторяющиеся визуальные образы, звуковые лейтмотивы, пространственные
        приёмы, ритуальные жесты. Мотив отличается от темы: тема — содержательная
        категория («хрононавтика»), мотив — конкретный приём («зеркало как порог»).
        Мотивы прорабатываются в эссе и связывают между собой фильмы разных
        режиссёров и стран.
      </p>

      <ul className="grid sm:grid-cols-2 gap-4">
        {motifs.map((m) => (
          <li key={m.id}>
            <Link
              href={`/motifs/${m.id}`}
              className="frame block p-4 h-full hover:border-sepia/40 transition-colors"
            >
              <h2 className="font-display text-lg text-light leading-tight">
                {m.name_ru}
              </h2>
              {m.category && m.category.length > 0 && (
                <p className="titre mt-1">
                  {m.category.map((c, i) => (
                    <span key={c}>
                      {i > 0 && " · "}
                      <Abbr kind="motif_category" code={c} display="name" />
                    </span>
                  ))}
                </p>
              )}
              <p className="text-light/70 text-sm mt-2 line-clamp-3">
                {m.description_ru}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
