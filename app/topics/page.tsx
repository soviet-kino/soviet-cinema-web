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
        <ul className="space-y-4">
          {topics.map((t) => (
            <li
              key={t.id}
              className="border border-light/10 rounded p-4 hover:border-light/40 transition-colors"
            >
              <Link href={`/topics/${t.id}`} className="block">
                <h2 className="text-xl font-semibold">
                  {t.name_ru}{" "}
                  <span className="text-light/50 text-sm font-normal">
                    · {t.film_count}{" "}
                    {pluralizeFilms(t.film_count)}
                  </span>
                </h2>
                <p className="text-light/70 mt-1">{t.description_ru}</p>
              </Link>
            </li>
          ))}
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
