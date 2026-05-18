"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ComponentProps } from "react";

import { Breadcrumbs } from "@/lib/breadcrumbs";
import { ClientAbbr } from "@/lib/client-abbr";
import { loadPeople, type PersonIndexEntry } from "@/lib/client-data";
import { Avatar } from "@/lib/media-components";

type LinkHref = ComponentProps<typeof Link>["href"];

function PeopleContent() {
  const params = useSearchParams();
  const role = params.get("role")?.trim() || undefined;
  const [people, setPeople] = useState<PersonIndexEntry[] | null>(null);

  useEffect(() => {
    loadPeople().then(setPeople);
  }, []);

  const data = useMemo(() => {
    if (!people) return null;

    const filtered = role ? people.filter((p) => p.roles.includes(role)) : people;

    // Сортировка как на сервере: по name_ru, ru-locale.
    const sorted = [...filtered].sort((a, b) =>
      (a.name_ru ?? a.id).localeCompare(b.name_ru ?? b.id, "ru"),
    );

    const roleCounts = new Map<string, number>();
    for (const p of people) {
      for (const r of p.roles) roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1);
    }
    const roles = [...roleCounts.entries()]
      .map(([code, count]) => ({ code, count }))
      .filter((r) => r.count > 0 || r.code === role)
      .sort((a, b) => b.count - a.count);

    return { people: sorted, roles };
  }, [people, role]);

  if (!data) {
    return (
      <section className="space-y-6">
        <Breadcrumbs items={[{ label: "люди" }]} />
        <header className="space-y-2">
          <p className="titre">галерея</p>
          <h1 className="font-display text-3xl text-light">Люди</h1>
        </header>
        <p className="text-light/40 titre">загрузка…</p>
      </section>
    );
  }

  const { people: list, roles } = data;

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: "люди" }]} />
      <header className="space-y-2">
        <p className="titre">галерея</p>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="font-display text-3xl text-light">Люди</h1>
          <p className="titre">
            {list.length}
            {role && (
              <>
                {" · "}
                <ClientAbbr kind="roles" code={role} display="name" />
              </>
            )}
          </p>
        </div>
      </header>

      <div className="flex items-baseline gap-3 flex-wrap">
        <p className="titre w-14 shrink-0">роль</p>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!role} href={{ pathname: "/people" }} label="Все" />
          {roles.map((r) => (
            <Chip
              key={r.code}
              active={role === r.code}
              href={{ pathname: "/people", query: { role: r.code } }}
              label={
                <span>
                  <ClientAbbr kind="roles" code={r.code} display="name" />{" "}
                  <span className="text-light/40">{r.count}</span>
                </span>
              }
            />
          ))}
        </div>
      </div>

      <p className="text-light/70 text-sm max-w-2xl">
        Часть записей — заглушки, созданные при импорте из Wikidata; портреты
        и биографии подгружаются по мере обогащения. Где фото нет — стоит
        приглушённый круг.
      </p>

      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((p) => (
          <li key={p.id}>
            <Link
              href={`/people/${p.id}`}
              className="frame flex items-center gap-3 p-3 hover:border-sepia/40 transition-colors"
            >
              <Avatar
                filename={p.image_commons}
                alt={`Портрет: ${p.name_ru}`}
                size={48}
              />
              <div className="min-w-0 flex-1">
                <p className="text-light font-medium leading-tight truncate">
                  {p.name_ru}
                </p>
                {p.roles.length > 0 && (
                  <p className="text-light/50 text-xs mt-0.5 truncate">
                    {p.roles.map((r, i) => (
                      <span key={r}>
                        {i > 0 && " · "}
                        <ClientAbbr kind="roles" code={r} display="name" />
                      </span>
                    ))}
                  </p>
                )}
                <p className="titre mt-1">
                  {dateYear(p.birth)}
                  {p.death && <span> — {dateYear(p.death)}</span>}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PeoplePage() {
  return (
    <Suspense fallback={null}>
      <PeopleContent />
    </Suspense>
  );
}

function Chip({
  href,
  label,
  active,
}: {
  href: LinkHref;
  label: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "px-2 py-0.5 rounded border text-sm transition-colors " +
        (active
          ? "border-sepia bg-sepia/20 text-light"
          : "border-light/20 text-light/70 hover:border-light/50 hover:text-light")
      }
    >
      {label}
    </Link>
  );
}

function dateYear(d?: string): string {
  if (!d) return "";
  return d.slice(0, 4);
}
