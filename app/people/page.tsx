import Link from "next/link";

import { Abbr } from "@/lib/abbr";
import { listPeople } from "@/lib/queries";

export const dynamic = "force-static";

export default function PeoplePage() {
  const people = listPeople();
  return (
    <section className="space-y-6">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Люди</h1>
        <p className="text-sm text-ink/60">{people.length} в базе</p>
      </header>

      <p className="text-sm text-ink/70">
        Режиссёры, сценаристы, операторы, композиторы и актёры. Большая часть
        записей сейчас — заглушки, созданные при импорте из Wikidata;
        обогащение биографий идёт постепенно.
      </p>

      <ul className="grid sm:grid-cols-2 gap-x-6 divide-y divide-ink/10 sm:divide-y-0">
        {people.map((p) => (
          <li
            key={p.id}
            className="py-2 flex items-baseline justify-between gap-3 sm:py-1"
          >
            <Link href={`/people/${p.id}`} className="hover:underline">
              <span className="font-medium">{p.name_ru}</span>
              {p.roles.length > 0 && (
                <span className="text-ink/60 text-sm ml-2">
                  {p.roles.map((r, i) => (
                    <span key={r}>
                      {i > 0 && ", "}
                      <Abbr kind="role" code={r} display="name" />
                    </span>
                  ))}
                </span>
              )}
            </Link>
            <span className="text-sm text-ink/50 shrink-0">
              {dateYear(p.birth)}
              {p.death && <span>–{dateYear(p.death)}</span>}
            </span>
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
