import Link from "next/link";

import { Abbr } from "@/lib/abbr";
import { listStudios } from "@/lib/queries";

export const dynamic = "force-static";

export default function StudiosPage() {
  const studios = listStudios();
  // Сортируем по убыванию фильмов: главные сверху.
  const sorted = [...studios].sort(
    (a, b) =>
      b.film_count - a.film_count || a.name_ru.localeCompare(b.name_ru, "ru"),
  );

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="titre">студии</p>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="font-display text-3xl text-light">Студии</h1>
          <p className="titre">{studios.length} в базе</p>
        </div>
      </header>

      <p className="text-light/70 max-w-2xl">
        Киностудии — производственные единицы соцстран. Часть студий пока
        заглушки, созданные при импорте по QID; страна, год основания и
        полное название подтянутся по мере обогащения.
      </p>

      <ul className="grid sm:grid-cols-2 gap-3">
        {sorted.map((s) => (
          <li key={s.id}>
            <Link
              href={`/studios/${s.id}`}
              className="frame block p-3 hover:border-sepia/40 transition-colors"
            >
              <p className="text-light font-medium leading-tight">
                {s.name_ru}
              </p>
              <p className="titre mt-1">
                <Abbr kind="country" code={s.country} />
                {s.founded && <span> · с {s.founded}</span>}
                <span> · {s.film_count} фильмов</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
