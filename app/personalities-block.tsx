"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  loadCollections,
  loadPeople,
  type CollectionIndexEntry,
  type PersonIndexEntry,
} from "@/lib/client-data";
import { Avatar } from "@/lib/media-components";

/**
 * Блок «Выдающиеся личности» для главной страницы.
 *
 * Берёт первую коллекцию из collections.json (обычно
 * outstanding-personalities) и показывает первые 8 карточек людей.
 * Если коллекций нет — рендерит null, секция исчезает.
 */
export function PersonalitiesBlock() {
  const [coll, setColl] = useState<CollectionIndexEntry | null>(null);
  const [peopleById, setPeopleById] = useState<Map<string, PersonIndexEntry> | null>(null);

  useEffect(() => {
    Promise.all([loadCollections(), loadPeople()]).then(([cs, ps]) => {
      setColl(cs[0] ?? null);
      setPeopleById(new Map(ps.map((p) => [p.id, p])));
    });
  }, []);

  if (!coll || !peopleById) return null;

  const people = coll.people
    .map((id) => peopleById.get(id))
    .filter((p): p is PersonIndexEntry => !!p)
    .slice(0, 8);

  if (people.length === 0) return null;

  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between gap-4 border-b border-light/10 pb-2">
        <h2 className="font-display text-xl text-light">Выдающиеся личности</h2>
        <Link href="/personalities" className="titre hover:text-sepia">
          Все →
        </Link>
      </header>
      <p className="text-light/60 text-sm max-w-3xl">{coll.description_ru}</p>
      <ul className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {people.map((p) => (
          <li key={p.id}>
            <Link
              href={`/people/${p.id}`}
              className="block frame p-3 text-center hover:border-sepia/40 transition-colors"
            >
              <div className="flex justify-center mb-2">
                <Avatar
                  filename={p.image_commons}
                  alt={`Портрет: ${p.name_ru}`}
                  size={56}
                />
              </div>
              <p className="text-light text-xs font-medium leading-tight">
                {p.name_ru}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
