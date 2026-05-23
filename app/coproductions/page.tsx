"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Breadcrumbs } from "@/lib/breadcrumbs";
import { ClientAbbr } from "@/lib/client-abbr";
import { loadFilms, type FilmIndexEntry } from "@/lib/client-data";

/**
 * /coproductions — все фильмы, снятые двумя и более странами.
 * Группировка по парам/тройкам стран (например СССР+ГДР, СССР+ЧССР+ПНР).
 * Внутри группы — список фильмов по убыванию года.
 */
export default function CoproductionsPage() {
  const [films, setFilms] = useState<FilmIndexEntry[] | null>(null);

  useEffect(() => {
    loadFilms().then(setFilms);
  }, []);

  const data = useMemo(() => {
    if (!films) return null;
    const multi = films.filter((f) => f.country.length > 1);
    const groups = new Map<string, FilmIndexEntry[]>();
    for (const f of multi) {
      const key = [...f.country].sort().join("+");
      let arr = groups.get(key);
      if (!arr) {
        arr = [];
        groups.set(key, arr);
      }
      arr.push(f);
    }
    const sortedGroups = [...groups.entries()]
      .map(([key, items]) => ({
        key,
        countries: key.split("+"),
        items: items.sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
      }))
      .sort((a, b) => b.items.length - a.items.length);
    return { total: multi.length, groups: sortedGroups };
  }, [films]);

  if (!data) {
    return (
      <section className="space-y-6">
        <Breadcrumbs items={[{ label: "со-продукции" }]} />
        <header>
          <h1 className="font-display text-3xl text-light">Со-продукции</h1>
        </header>
        <p className="titre text-light/40">загрузка…</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: "со-продукции" }]} />
      <header className="space-y-2">
        <p className="titre">совместные постановки</p>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="font-display text-3xl text-light">Со-продукции</h1>
          <p className="titre">{data.total} фильмов · {data.groups.length} комбинаций стран</p>
        </div>
        <p className="text-light/70 max-w-3xl text-sm">
          Фильмы, снятые более чем одной страной. «Трудно быть богом» —
          СССР+ГДР, «Тегеран-43» — СССР+ФРГ+Швейцария, «Чёрные эскадрильи»
          — ЧССР+СССР. Совместные постановки часто давали возможность
          обойти ограничения национальных киноведомств.
        </p>
      </header>

      <div className="space-y-3">
        {data.groups.map((g, i) => (
          <details
            key={g.key}
            open={i < 3}
            className="border border-light/10 rounded overflow-hidden group"
          >
            <summary className="cursor-pointer list-none flex items-baseline justify-between gap-4 px-3 py-2 hover:bg-light/5">
              <span className="font-display text-lg text-light">
                <span className="text-sepia/60 inline-block w-4 text-center mr-1 group-open:rotate-90 transition-transform">
                  ▸
                </span>
                {g.countries.map((c, idx) => (
                  <span key={c}>
                    {idx > 0 && " + "}
                    <ClientAbbr kind="countries" code={c} display="name" />
                  </span>
                ))}
              </span>
              <span className="titre">{g.items.length}</span>
            </summary>
            <ul className="divide-y divide-light/10">
              {g.items.slice(0, 50).map((f) => (
                <li
                  key={f.id}
                  className="py-3 px-3 flex items-baseline justify-between gap-4"
                >
                  <Link href={`/films/${f.id}`} className="hover:underline">
                    <span className="font-medium">{f.title_ru}</span>
                    {f.title_original && f.title_original !== f.title_ru && (
                      <span className="text-light/60 ml-2">«{f.title_original}»</span>
                    )}
                  </Link>
                  <span className="text-sm text-light/60 shrink-0">{f.year}</span>
                </li>
              ))}
              {g.items.length > 50 && (
                <li className="px-3 py-2 text-light/40 text-xs">
                  показано 50 из {g.items.length}
                </li>
              )}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
