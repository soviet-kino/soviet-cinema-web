import Link from "next/link";

import { Abbr } from "@/lib/abbr";
import { Avatar } from "@/lib/media-components";
import { getDbStats } from "@/lib/queries";

export const dynamic = "force-static";

export const metadata = {
  title: "Статистика базы — Soviet Bloc Cinema",
};

export default function StatsPage() {
  const s = getDbStats();

  return (
    <article className="space-y-10">
      <header className="space-y-2">
        <p className="titre">статистика</p>
        <h1 className="font-display text-3xl text-light">Здоровье базы</h1>
        <p className="text-light/70">
          Сколько чего в базе, какой охват полей, что важнее всего достроить.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-light border-b border-light/10 pb-1">
          Всего сущностей
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Stat label="фильмов" value={s.totals.films} href="/films?year=all" />
          <Stat label="персон" value={s.totals.people} href="/people" />
          <Stat label="студий" value={s.totals.studios} href="/studios" />
          <Stat label="тем" value={s.totals.topics} href="/topics" />
          <Stat label="референсов" value={s.totals.refs} />
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-light border-b border-light/10 pb-1">
          Полнота заполнения
        </h2>
        <ul className="space-y-2">
          <Bar
            label="Фильмов с режиссёром"
            num={s.coverage.films_with_director}
            total={s.totals.films}
          />
          <Bar
            label="Фильмов с YouTube ID"
            num={s.coverage.films_with_youtube}
            total={s.totals.films}
          />
          <Bar
            label="Фильмов с IMDb ID"
            num={s.coverage.films_with_imdb}
            total={s.totals.films}
          />
          <Bar
            label="Фильмов с постером"
            num={s.coverage.films_with_poster}
            total={s.totals.films}
          />
          <Bar
            label="Персон с фото"
            num={s.coverage.people_with_image}
            total={s.totals.people}
          />
          <Bar
            label="Персон с датой рождения"
            num={s.coverage.people_with_birth}
            total={s.totals.people}
          />
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-light border-b border-light/10 pb-1">
          По странам
        </h2>
        <ul className="space-y-1">
          {s.by_country.map((c) => (
            <li key={c.code}>
              <Link
                href={{ pathname: "/films", query: { country: c.code, year: "all" } }}
                className="hover:underline flex items-baseline gap-2"
              >
                <Abbr kind="country" code={c.code} display="name" />
                <span className="text-light/40">{c.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-light border-b border-light/10 pb-1">
          По десятилетиям
        </h2>
        <ul className="space-y-2">
          {s.by_decade.map((d) => (
            <Bar
              key={d.decade}
              label={`${d.decade}–${d.decade + 9}`}
              num={d.count}
              total={s.totals.films}
            />
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-light border-b border-light/10 pb-1">
          По ролям
        </h2>
        <ul className="space-y-1">
          {s.by_role.map((r) => (
            <li key={r.code}>
              <Link
                href={{ pathname: "/people", query: { role: r.code } }}
                className="hover:underline flex items-baseline gap-2"
              >
                <Abbr kind="role" code={r.code} display="name" />
                <span className="text-light/40">{r.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-light border-b border-light/10 pb-1">
          Топ-10 студий
        </h2>
        <ul className="space-y-1">
          {s.top_studios.map((st) => (
            <li key={st.id}>
              <Link
                href={`/studios/${st.id}`}
                className="hover:underline flex items-baseline gap-2"
              >
                <span className="font-medium">{st.name_ru}</span>
                <span className="text-light/40">{st.count} фильмов</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl text-light border-b border-light/10 pb-1">
          Топ-10 режиссёров
        </h2>
        <ul className="grid sm:grid-cols-2 gap-2">
          {s.top_directors.map((d) => (
            <li key={d.id}>
              <Link
                href={`/people/${d.id}`}
                className="frame flex items-center gap-3 p-2 hover:border-sepia/40 transition-colors"
              >
                <Avatar filename={d.image_commons} alt="" size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-light font-medium truncate">{d.name_ru}</p>
                  <p className="titre">{d.film_count} фильмов</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const body = (
    <div className="frame p-3 text-center hover:border-sepia/40 transition-colors">
      <p className="font-display text-2xl text-light">{value.toLocaleString("ru")}</p>
      <p className="titre">{label}</p>
    </div>
  );
  if (href) {
    return (
      <li>
        <Link href={href as never}>{body}</Link>
      </li>
    );
  }
  return <li>{body}</li>;
}

function Bar({
  label,
  num,
  total,
}: {
  label: string;
  num: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((num / total) * 100) : 0;
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-light/80">{label}</span>
        <span className="titre">
          {num.toLocaleString("ru")} <span className="text-light/40">/ {total.toLocaleString("ru")} · {pct}%</span>
        </span>
      </div>
      <div className="h-1 bg-light/10 rounded overflow-hidden">
        <div
          className="h-full bg-sepia/60"
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}
