import Link from "next/link";
import type { ComponentProps } from "react";

import { Abbr } from "@/lib/abbr";
import { Avatar } from "@/lib/media-components";
import { availableRoles, listPeople } from "@/lib/queries";

type LinkHref = ComponentProps<typeof Link>["href"];

interface PageProps {
  searchParams: Promise<{ role?: string }>;
}

export default async function PeoplePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const role = params.role?.trim() || undefined;
  const people = listPeople({ role });
  const roles = availableRoles().filter((r) => r.count > 0 || r.code === role);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="titre">галерея</p>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="font-display text-3xl text-light">Люди</h1>
          <p className="titre">
            {people.length}
            {role && (
              <>
                {" · "}
                <Abbr kind="role" code={role} display="name" />
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
                  <Abbr kind="role" code={r.code} display="name" />{" "}
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
        {people.map((p) => (
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
                        <Abbr kind="role" code={r} display="name" />
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
