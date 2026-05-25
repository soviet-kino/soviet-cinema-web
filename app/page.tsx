import Link from "next/link";
import type { ComponentProps } from "react";

import { Abbr } from "@/lib/abbr";
import { Avatar } from "@/lib/media-components";
import {
  countFilms,
  filmsByTopic,
  getDbStats,
  listFilms,
  listTopics,
  topActors,
  topDirectors,
} from "@/lib/queries";
import { PersonalitiesBlock } from "./personalities-block";

type LinkHref = ComponentProps<typeof Link>["href"];

export const dynamic = "force-static";

export default function HomePage() {
  const total = countFilms();
  const recent = listFilms({ limit: 18 });
  const topics = listTopics();
  const directors = topDirectors(12);
  const actors = topActors(12);
  const foreignReleases = filmsByTopic("foreign-in-soviet-distribution").slice(0, 8);
  const stats = getDbStats();

  // 5 советских эпох — слаги топиков и человеческие подписи.
  const eras = [
    { id: "pre-war-cinema", label: "Довоенное", years: "1917–1941" },
    { id: "stalin-cinema", label: "Сталинское", years: "1924–1953" },
    { id: "thaw-cinema", label: "Оттепель", years: "1953–1964" },
    { id: "stagnation-cinema", label: "Застой", years: "1964–1985" },
    { id: "perestroika-cinema", label: "Перестройка", years: "1985–1991" },
  ].map((e) => ({
    ...e,
    count: topics.find((t) => t.id === e.id)?.film_count ?? 0,
  }));

  return (
    <article className="space-y-16">
      {/* HERO — большой «экран» */}
      <section className="relative">
        <div className="cinema-screen aspect-[21/9] rounded-sm flex items-center justify-center px-8 text-center">
          <div className="space-y-3 max-w-3xl">
            <p className="titre text-sepia">1917 — 1991 · десять стран</p>
            <h1 className="font-display text-4xl sm:text-5xl text-light leading-tight">
              Кино, в котором первый план — то,
              <br />
              <span className="text-sepia">о чём нельзя говорить вслух</span>
            </h1>
            <p className="text-light/70 max-w-2xl mx-auto">
              Структурированная база фильмов, режиссёров, символов и мотивов
              советского и восточноевропейского кинематографа. И корпус
              разборов второго смыслового ряда — эзопова языка, фигур
              умолчания и культурного контекста.
            </p>
          </div>
        </div>
        <p className="titre text-center mt-3">
          {total} {pluralizeFilms(total)} · {stats.totals.people} персон ·{" "}
          {stats.totals.studios} студий · {topics.length} тем
        </p>
      </section>

      {/* ЭПОХИ СОВЕТСКОГО КИНО */}
      <section className="space-y-3">
        <header className="flex items-baseline justify-between gap-4 border-b border-light/10 pb-2">
          <h2 className="font-display text-xl text-light">Эпохи советского кино</h2>
        </header>
        <ul className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {eras.map((e) => (
            <li key={e.id}>
              <Link
                href={`/topics/${e.id}`}
                className="frame block p-3 text-center hover:border-sepia/40 transition-colors h-full"
              >
                <p className="font-display text-lg text-light leading-tight">
                  {e.label}
                </p>
                <p className="titre mt-1">{e.years}</p>
                <p className="text-sepia text-sm mt-1.5">{e.count} фильмов</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ПО ДЕСЯТИЛЕТИЯМ — кликабельные карточки */}
      {stats.by_decade.length > 0 && (
        <section className="space-y-3">
          <header className="flex items-baseline justify-between gap-4 border-b border-light/10 pb-2">
            <h2 className="font-display text-xl text-light">По десятилетиям</h2>
            <Link href="/stats" className="titre hover:text-sepia">
              Полная статистика →
            </Link>
          </header>
          <ul className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {[1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990].map((d) => {
              const count = stats.by_decade.find((b) => b.decade === d)?.count ?? 0;
              const empty = count === 0;
              return (
                <li key={d}>
                  <Link
                    href={{ pathname: "/films", query: { decade: String(d), year: "all" } }}
                    className={
                      "frame block p-3 text-center transition-colors " +
                      (empty
                        ? "border-light/5 bg-velvet/30 hover:border-light/15"
                        : "hover:border-sepia/40")
                    }
                  >
                    <p
                      className={
                        "font-display text-xl " + (empty ? "text-light/30" : "text-light")
                      }
                    >
                      {d}-е
                    </p>
                    <p className="titre">
                      {empty ? <span className="text-light/30">—</span> : count}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ЛЕНТА — недавно добавленные */}
      <section className="space-y-3">
        <header className="flex items-baseline justify-between gap-4 border-b border-light/10 pb-2">
          <h2 className="font-display text-xl text-light">Недавно добавлены</h2>
          <Link href="/films" className="titre hover:text-sepia">
            Все фильмы →
          </Link>
        </header>
        <div className="filmstrip py-4 px-1">
          <ul className="reel">
            {recent.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/films/${f.id}`}
                  className="block frame p-1 hover:border-sepia/40 transition-colors"
                >
                  <FilmThumb
                    title={f.title_ru}
                    poster={f.poster_commons}
                    tmdbPath={f.poster_tmdb_path}
                  />
                  <div className="px-1 py-1.5">
                    <p className="text-light text-sm font-medium leading-tight line-clamp-2">
                      {f.title_ru}
                    </p>
                    <p className="titre mt-1">{f.year}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ТЕМЫ */}
      {topics.length > 0 && (
        <section className="space-y-3">
          <header className="flex items-baseline justify-between gap-4 border-b border-light/10 pb-2">
            <h2 className="font-display text-xl text-light">
              Тематические разделы
            </h2>
            <Link href="/topics" className="titre hover:text-sepia">
              Все темы →
            </Link>
          </header>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/topics/${t.id}`}
                  className="frame block p-5 h-full hover:border-sepia/40 transition-colors"
                >
                  <p className="titre">
                    тема · {t.film_count} {pluralizeFilms(t.film_count)}
                  </p>
                  <h3 className="font-display text-xl text-light mt-1 leading-tight">
                    {t.name_ru}
                  </h3>
                  <p className="text-light/70 text-sm mt-2 line-clamp-3">
                    {t.description_ru}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ИЗВЕСТНЫЕ РЕЖИССЁРЫ */}
      {directors.length > 0 && (
        <section className="space-y-3">
          <header className="flex items-baseline justify-between gap-4 border-b border-light/10 pb-2">
            <h2 className="font-display text-xl text-light">
              Самые снимающие режиссёры
            </h2>
            <Link href="/people?role=director" className="titre hover:text-sepia">
              Все режиссёры →
            </Link>
          </header>
          <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {directors.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/people/${d.id}`}
                  className="block frame p-3 text-center hover:border-sepia/40 transition-colors"
                >
                  <div className="flex justify-center mb-2">
                    <Avatar
                      filename={d.image_commons}
                      alt={`Портрет: ${d.name_ru}`}
                      size={64}
                    />
                  </div>
                  <p className="text-light text-sm font-medium leading-tight">
                    {d.name_ru}
                  </p>
                  <p className="titre mt-1">{d.film_count} фильмов</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ИЗВЕСТНЫЕ АКТЁРЫ */}
      {actors.length > 0 && (
        <section className="space-y-3">
          <header className="flex items-baseline justify-between gap-4 border-b border-light/10 pb-2">
            <h2 className="font-display text-xl text-light">
              Самые снимающиеся актёры
            </h2>
            <Link href="/people?role=actor" className="titre hover:text-sepia">
              Все актёры →
            </Link>
          </header>
          <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {actors.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/people/${a.id}`}
                  className="block frame p-3 text-center hover:border-sepia/40 transition-colors"
                >
                  <div className="flex justify-center mb-2">
                    <Avatar
                      filename={a.image_commons}
                      alt={`Портрет: ${a.name_ru}`}
                      size={64}
                    />
                  </div>
                  <p className="text-light text-sm font-medium leading-tight">
                    {a.name_ru}
                  </p>
                  <p className="titre mt-1">{a.film_count} ролей</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ЖАНРЫ — кликабельные чипы */}
      {stats.by_genre.length > 0 && (
        <section className="space-y-3">
          <header className="flex items-baseline justify-between gap-4 border-b border-light/10 pb-2">
            <h2 className="font-display text-xl text-light">По жанрам</h2>
          </header>
          <ul className="flex flex-wrap gap-2">
            {stats.by_genre.map((g) => (
              <li key={g.code}>
                <Link
                  href={{ pathname: "/films", query: { genre: g.code, year: "all" } }}
                  className="frame inline-flex items-baseline gap-2 px-3 py-1.5 hover:border-sepia/40 transition-colors"
                >
                  <Abbr kind="genre" code={g.code} display="name" />
                  <span className="titre">{g.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ТОП-СТУДИИ */}
      {stats.top_studios.length > 0 && (
        <section className="space-y-3">
          <header className="flex items-baseline justify-between gap-4 border-b border-light/10 pb-2">
            <h2 className="font-display text-xl text-light">Кинофабрики</h2>
            <Link href="/studios" className="titre hover:text-sepia">
              Все студии →
            </Link>
          </header>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.top_studios.slice(0, 6).map((s) => (
              <li key={s.id}>
                <Link
                  href={`/studios/${s.id}`}
                  className="frame block p-3 hover:border-sepia/40 transition-colors"
                >
                  <p className="text-light font-medium leading-tight">{s.name_ru}</p>
                  <p className="titre mt-1">{s.count} фильмов</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ВЫДАЮЩИЕСЯ ЛИЧНОСТИ */}
      <PersonalitiesBlock />

      {/* ЗАРУБЕЖНОЕ В СОВЕТСКОМ ПРОКАТЕ */}
      {foreignReleases.length > 0 && (
        <section className="space-y-3">
          <header className="flex items-baseline justify-between gap-4 border-b border-light/10 pb-2">
            <h2 className="font-display text-xl text-light">Зарубежное в советском прокате</h2>
            <Link
              href="/topics/foreign-in-soviet-distribution"
              className="titre hover:text-sepia"
            >
              Все →
            </Link>
          </header>
          <p className="text-light/60 text-sm max-w-3xl">
            Фильмы, выходившие в СССР через Госкино/Совэкспортфильм. Дубляж
            советских актёров здесь — самостоятельное искусство: Караченцов
            за Челентано, Кенигсон за Фюнеса, Демьяненко за Бельмондо.
          </p>
          <div className="filmstrip py-4 px-1">
            <ul className="reel">
              {foreignReleases.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/films/${f.id}`}
                    className="block frame p-1 hover:border-sepia/40 transition-colors"
                  >
                    <FilmThumb
                      title={f.title_ru}
                      poster={f.poster_commons}
                      tmdbPath={f.poster_tmdb_path}
                    />
                    <div className="px-1 py-1.5">
                      <p className="text-light text-sm font-medium leading-tight line-clamp-2">
                        {f.title_ru}
                      </p>
                      <p className="titre mt-1">{f.year}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* НАВИГАЦИЯ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-3">
        <NavTile href="/films" titre="каталог" title="Фильмы" hint="по году, стране, режиссёру" />
        <NavTile href="/coproductions" titre="кооперация" title="Со-продукции" hint="совместные постановки" />
        <NavTile href="/personalities" titre="галерея" title="Личности" hint="выдающиеся актёры и режиссёры" />
        <NavTile href="/topics" titre="темы" title="Исследовать" hint="хрононавтика и другие срезы" />
        <NavTile href="/random" titre="наугад" title="Случайный фильм" hint="один из 14 тысяч" />
        <NavTile href="/stats" titre="метрики" title="Здоровье базы" hint="полнота, охват, рост" />
        <NavTile href="/essays" titre="лонгриды" title="Разборы" hint="второй смысловой ряд, скоро" />
      </section>
    </article>
  );
}

function NavTile({
  href,
  titre,
  title,
  hint,
}: {
  href: LinkHref;
  titre: string;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="frame block p-4 hover:border-sepia/40 transition-colors group"
    >
      <p className="titre group-hover:text-sepia transition-colors">{titre}</p>
      <p className="font-display text-lg text-light mt-1">{title}</p>
      <p className="text-light/50 text-xs mt-1">{hint}</p>
    </Link>
  );
}

function FilmThumb({
  title,
  poster,
  tmdbPath,
}: {
  title: string;
  poster?: string;
  tmdbPath?: string;
}) {
  if (poster) {
    return (
      <img
        src={`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(poster)}?width=300`}
        alt={`Постер: ${title}`}
        loading="lazy"
        className="aspect-[2/3] w-full object-cover bg-velvet border border-light/5"
      />
    );
  }
  if (tmdbPath) {
    const safe = tmdbPath.startsWith("/") ? tmdbPath : `/${tmdbPath}`;
    return (
      <img
        src={`https://image.tmdb.org/t/p/w342${safe}`}
        alt={`Постер: ${title}`}
        loading="lazy"
        className="aspect-[2/3] w-full object-cover bg-velvet border border-light/5"
      />
    );
  }
  return (
    <div className="aspect-[2/3] w-full bg-gradient-to-br from-velvet to-screen flex items-center justify-center border border-light/5 px-2">
      <span className="titre text-sepia_dim text-[10px] text-center line-clamp-5">
        {title}
      </span>
    </div>
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
