import Link from "next/link";

import { countFilms, listFilms } from "@/lib/queries";

export const dynamic = "force-static";

export default function HomePage() {
  const total = countFilms();
  const recent = listFilms({ limit: 12 });

  return (
    <article className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">
          Кино СССР и стран социалистического лагеря XX века
        </h1>
        <p className="text-lg text-ink/80">
          Открытый исследовательский портал о фильмах, режиссёрах, символах,
          мотивах и культурном контексте кинематографа социалистических стран
          1917–1991.
        </p>
        <p className="text-sm text-ink/60">
          В базе сейчас <strong>{total}</strong>{" "}
          {pluralizeFilms(total)}. Все данные —{" "}
          <Link href="/films" className="underline">
            открытый каталог
          </Link>
          .
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold border-b border-ink/10 pb-1">
          Недавно добавлены
        </h2>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {recent.map((f) => (
            <li key={f.id}>
              <Link href={`/films/${f.id}`} className="hover:underline">
                <span className="font-medium">{f.title_ru}</span>
                <span className="text-ink/60"> · {f.year}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p>
          <Link href="/films" className="underline">
            Все фильмы →
          </Link>
        </p>
      </section>

      <section className="text-sm text-ink/70 border-t border-ink/10 pt-4 space-y-2">
        <p>
          Проект в начальной фазе. Каркас данных, схема и веб — полностью open
          source, без привязки к платным сервисам. Принимаем поправки фактов,
          новые фильмы и предложения разборов через GitHub.
        </p>
      </section>
    </article>
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
