"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Breadcrumbs } from "@/lib/breadcrumbs";
import {
  loadCollections,
  loadPeople,
  type CollectionIndexEntry,
  type PersonIndexEntry,
} from "@/lib/client-data";
import { Avatar } from "@/lib/media-components";

export default function PersonalitiesPage() {
  const [collections, setCollections] = useState<CollectionIndexEntry[] | null>(null);
  const [people, setPeople] = useState<PersonIndexEntry[] | null>(null);

  useEffect(() => {
    loadCollections().then(setCollections);
    loadPeople().then(setPeople);
  }, []);

  if (!collections || !people) {
    return (
      <section className="space-y-6">
        <Breadcrumbs items={[{ label: "выдающиеся личности" }]} />
        <header className="space-y-2">
          <p className="titre">кураторские подборки</p>
          <h1 className="font-display text-3xl text-light">Выдающиеся личности</h1>
        </header>
        <p className="titre text-light/40">загрузка…</p>
      </section>
    );
  }

  const peopleById = new Map(people.map((p) => [p.id, p]));

  return (
    <section className="space-y-8">
      <Breadcrumbs items={[{ label: "выдающиеся личности" }]} />
      <header className="space-y-2">
        <p className="titre">кураторские подборки</p>
        <h1 className="font-display text-3xl text-light">Выдающиеся личности</h1>
        <p className="text-light/70 max-w-2xl">
          Курированные подборки ключевых фигур советского кино.
          Списки наполняются редакторами вручную — никаких автоматических
          «топов» по числу фильмов или рейтингу.
        </p>
      </header>

      {collections.map((c) => (
        <section key={c.id} className="space-y-4">
          <header className="space-y-1">
            <h2 className="font-display text-2xl text-light border-b border-light/10 pb-1">
              {c.name_ru}
            </h2>
            <p className="text-light/60 text-sm max-w-2xl">{c.description_ru}</p>
          </header>

          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {c.people.map((id) => {
              const p = peopleById.get(id);
              if (!p) return null;
              return (
                <li key={id}>
                  <Link
                    href={`/people/${p.id}`}
                    className="frame flex items-center gap-3 p-3 hover:border-sepia/40 transition-colors"
                  >
                    <Avatar
                      filename={p.image_commons}
                      alt={`Портрет: ${p.name_ru}`}
                      size={56}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-light font-medium leading-tight truncate">
                        {p.name_ru}
                      </p>
                      {p.roles.length > 0 && (
                        <p className="text-light/50 text-xs mt-0.5 truncate">
                          {p.roles.join(" · ")}
                        </p>
                      )}
                      <p className="titre mt-1">
                        {p.birth?.slice(0, 4)}
                        {p.death && <span> — {p.death.slice(0, 4)}</span>}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </section>
  );
}
