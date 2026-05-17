import Link from "next/link";

import { Abbr } from "@/lib/abbr";
import { Avatar } from "@/lib/media-components";
import { listPeople } from "@/lib/queries";

export const dynamic = "force-static";

export default function PeoplePage() {
  const people = listPeople();
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="titre">галерея</p>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="font-display text-3xl text-light">Люди</h1>
          <p className="titre">{people.length} в базе</p>
        </div>
      </header>

      <p className="text-light/70 max-w-2xl">
        Режиссёры, сценаристы, операторы, композиторы и актёры. Часть
        записей — заглушки, созданные при импорте из Wikidata; портреты и
        биографии подгружаются по мере обогащения. Где фото нет — стоит
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

function dateYear(d?: string): string {
  if (!d) return "";
  return d.slice(0, 4);
}
