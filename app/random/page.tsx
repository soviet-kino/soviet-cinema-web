"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Breadcrumbs } from "@/lib/breadcrumbs";
import { ClientAbbr } from "@/lib/client-abbr";
import { loadFilms, type FilmIndexEntry } from "@/lib/client-data";

/**
 * /random — карусель «случайный фильм».
 *
 * Раньше делала мгновенный redirect на /films/<id>. Это плохо для UX:
 * пользователь не понимает, что произошло, и при «Назад» снова попадает
 * на /random → новый редирект → бесконечная карусель.
 *
 * Теперь показывает карточку выбранного фильма с кнопкой «Ещё один»
 * и явной ссылкой на страницу фильма.
 */
export default function RandomPage() {
  const [films, setFilms] = useState<FilmIndexEntry[] | null>(null);
  const [film, setFilm] = useState<FilmIndexEntry | null>(null);

  const pick = useCallback((all: FilmIndexEntry[]) => {
    if (all.length === 0) return null;
    return all[Math.floor(Math.random() * all.length)];
  }, []);

  useEffect(() => {
    loadFilms().then((all) => {
      setFilms(all);
      setFilm(pick(all));
    });
  }, [pick]);

  function again() {
    if (films) setFilm(pick(films));
  }

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: "случайный фильм" }]} />
      <header className="space-y-1">
        <p className="titre">наугад из каталога</p>
        <h1 className="font-display text-3xl text-light">Случайный фильм</h1>
      </header>

      {!film && <p className="titre text-light/40">тяну ленту…</p>}

      {film && (
        <article className="frame p-6 space-y-4">
          <Poster film={film} />
          <div className="space-y-1">
            <h2 className="font-display text-2xl text-light">{film.title_ru}</h2>
            {film.title_original && film.title_original !== film.title_ru && (
              <p className="text-light/60 italic">«{film.title_original}»</p>
            )}
            <p className="titre">
              {film.year}
              {film.country.length > 0 && (
                <span>
                  {" · "}
                  {film.country.map((c, i) => (
                    <span key={c}>
                      {i > 0 && ", "}
                      <ClientAbbr kind="countries" code={c} display="name" />
                    </span>
                  ))}
                </span>
              )}
              {film.director.length > 0 && (
                <span> · реж. {film.director.length}</span>
              )}
            </p>
          </div>

          <div className="flex gap-3 flex-wrap pt-2">
            <Link
              href={`/films/${film.id}`}
              className="px-4 py-2 border border-sepia bg-sepia/20 rounded text-light hover:bg-sepia/30 transition-colors"
            >
              Открыть карточку →
            </Link>
            <button
              type="button"
              onClick={again}
              className="px-4 py-2 border border-light/30 rounded text-light/80 hover:border-light hover:text-light transition-colors"
            >
              🎲 Ещё один
            </button>
          </div>
        </article>
      )}

      <p className="text-light/50 text-xs">
        Выборка ровная по всему каталогу — попадаются и шедевры, и
        полузабытые ленты студий союзных республик. Это часть замысла:
        каталог открыт во все стороны, не только в сторону имён.
      </p>
    </section>
  );
}

function Poster({ film }: { film: FilmIndexEntry }) {
  if (film.poster_commons) {
    const safe = encodeURIComponent(film.poster_commons);
    return (
      <img
        src={`https://commons.wikimedia.org/wiki/Special:FilePath/${safe}?width=400`}
        alt={`Постер: ${film.title_ru}`}
        loading="lazy"
        className="max-w-xs w-full aspect-[2/3] object-cover bg-velvet border border-light/10"
      />
    );
  }
  if (film.poster_tmdb_path) {
    const path = film.poster_tmdb_path.startsWith("/")
      ? film.poster_tmdb_path
      : `/${film.poster_tmdb_path}`;
    return (
      <img
        src={`https://image.tmdb.org/t/p/w500${path}`}
        alt={`Постер: ${film.title_ru}`}
        loading="lazy"
        className="max-w-xs w-full aspect-[2/3] object-cover bg-velvet border border-light/10"
      />
    );
  }
  return null;
}
