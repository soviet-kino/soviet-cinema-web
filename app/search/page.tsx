import Link from "next/link";

import { Abbr } from "@/lib/abbr";
import { Avatar } from "@/lib/media-components";
import { searchFilms, searchPeople } from "@/lib/queries";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export const metadata = { title: "Поиск — Soviet Bloc Cinema" };

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = "" } = await searchParams;
  const trimmed = q.trim();
  const films = trimmed ? searchFilms(q, 80) : [];
  const people = trimmed ? searchPeople(q, 40) : [];

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="titre">поиск</p>
        <h1 className="font-display text-3xl text-light">
          {q.trim() ? `«${q}»` : "Поиск по каталогу"}
        </h1>
      </header>

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Введите название фильма…"
          autoFocus
          className="flex-1 bg-velvet border border-light/20 rounded px-3 py-2 text-light placeholder-light/40 focus:border-sepia focus:outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 border border-light/30 rounded text-light hover:border-sepia hover:text-sepia transition-colors"
        >
          Искать
        </button>
      </form>

      {trimmed && films.length === 0 && people.length === 0 && (
        <p className="titre">ничего не найдено</p>
      )}

      {people.length > 0 && (
        <section className="space-y-2">
          <h2 className="titre">люди · {people.length}</h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {people.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/people/${p.id}`}
                  className="frame flex items-center gap-3 p-2 hover:border-sepia/40 transition-colors"
                >
                  <Avatar
                    filename={p.image_commons}
                    alt={`Портрет: ${p.name_ru}`}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-light font-medium truncate">{p.name_ru}</p>
                    {p.roles.length > 0 && (
                      <p className="titre truncate">
                        {p.roles.map((r, i) => (
                          <span key={r}>
                            {i > 0 && " · "}
                            <Abbr kind="role" code={r} display="name" />
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {films.length > 0 && (
        <section className="space-y-2">
          <h2 className="titre">фильмы · {films.length}</h2>
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
        </section>
      )}

      {!trimmed && (
        <p className="text-light/60 text-sm">
          FTS5-поиск по русскому и оригинальному названию. Поддерживаются
          частичные слова: «зерк» найдёт «Зеркало» и «Зеркало для героя».
        </p>
      )}
    </section>
  );
}
