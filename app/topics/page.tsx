import Link from "next/link";
import { Breadcrumbs } from "@/lib/breadcrumbs";

import { listTopics } from "@/lib/queries";

export const dynamic = "force-static";

export default function TopicsPage() {
  const topics = listTopics();
  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: "темы" }]} />
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Темы</h1>
        <p className="text-light/70">
          Содержательные разделы, по которым курируется подборка фильмов и
          разборов. В отличие от жанра (форма) и мотива (повторяющийся
          образ), тема — это исследовательский угол: что именно мы
          рассматриваем, проходя через корпус социалистического кино.
        </p>
      </header>

      {topics.length === 0 ? (
        <p className="text-light/60">Тем пока нет.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {[...topics]
            .sort((a, b) => b.film_count - a.film_count)
            .map((t) => {
              const empty = t.film_count === 0;
              return (
                <li
                  key={t.id}
                  className={
                    "frame p-4 transition-colors " +
                    (empty
                      ? "border-light/5 bg-velvet/30 hover:border-light/15"
                      : "hover:border-sepia/40")
                  }
                >
                  <Link href={`/topics/${t.id}`} className="block group">
                    <h2
                      className={
                        "font-display text-lg " +
                        (empty ? "text-light/40" : "text-light group-hover:text-sepia")
                      }
                    >
                      {t.name_ru}
                    </h2>
                    <p className="titre mt-0.5">
                      {empty ? (
                        <span className="text-light/30">пока пусто · ждёт наполнения</span>
                      ) : (
                        <>
                          {t.film_count} {pluralizeFilms(t.film_count)}
                        </>
                      )}
                    </p>
                    <p
                      className={
                        "text-sm mt-2 leading-snug " +
                        (empty ? "text-light/40" : "text-light/70")
                      }
                    >
                      {t.description_ru}
                    </p>
                  </Link>
                </li>
              );
            })}
        </ul>
      )}
    </section>
  );
}

function pluralizeFilms(n: number): string {
  const last2 = n % 100;
  const last1 = n % 10;
  if (last2 >= 11 && last2 <= 14) return "фильмов";
  if (last1 === 1) return "фильм";
  if (last1 >= 2 && last1 <= 4) return "фильма";
  return "фильмов";
}
