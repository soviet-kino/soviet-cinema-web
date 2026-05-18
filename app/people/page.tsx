"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ComponentProps } from "react";

import { Breadcrumbs } from "@/lib/breadcrumbs";
import { ClientAbbr } from "@/lib/client-abbr";
import { loadPeople, type PersonIndexEntry } from "@/lib/client-data";
import { Avatar } from "@/lib/media-components";

type LinkHref = ComponentProps<typeof Link>["href"];

type GroupMode = "country" | "era" | "role";

const GROUP_LABELS: Record<GroupMode, string> = {
  country: "по странам",
  era: "по эпохам",
  role: "по ролям",
};

// Эпохи по году рождения. Границы выбраны так, чтобы дать
// читаемые культурные кластеры, а не математические декады.
const ERAS: { id: string; label: string; from?: number; to?: number }[] = [
  { id: "pre-revolution", label: "Дореволюционные (до 1900)", to: 1899 },
  { id: "soviet-early", label: "Раннесоветские (1900–1929)", from: 1900, to: 1929 },
  { id: "sixtiers", label: "Шестидесятники (1930–1949)", from: 1930, to: 1949 },
  { id: "late-soviet", label: "Поздние (1950+)", from: 1950 },
  { id: "unknown", label: "Без даты рождения" },
];

function eraFor(p: PersonIndexEntry): string {
  if (!p.birth) return "unknown";
  const y = Number(p.birth.slice(0, 4));
  if (Number.isNaN(y)) return "unknown";
  for (const e of ERAS) {
    if (e.id === "unknown") continue;
    const okFrom = e.from === undefined || y >= e.from;
    const okTo = e.to === undefined || y <= e.to;
    if (okFrom && okTo) return e.id;
  }
  return "unknown";
}

interface Section {
  id: string;
  title: React.ReactNode;
  count: number;
  items: PersonIndexEntry[];
}

function PeopleContent() {
  const params = useSearchParams();
  const role = params.get("role")?.trim() || undefined;
  const groupParam = params.get("group") as GroupMode | null;
  const group: GroupMode = groupParam === "era" || groupParam === "role" ? groupParam : "country";

  const [people, setPeople] = useState<PersonIndexEntry[] | null>(null);

  useEffect(() => {
    loadPeople().then(setPeople);
  }, []);

  const data = useMemo(() => {
    if (!people) return null;

    const filtered = role ? people.filter((p) => p.roles.includes(role)) : people;

    const roleCounts = new Map<string, number>();
    for (const p of people) for (const r of p.roles) roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1);
    const roles = [...roleCounts.entries()]
      .map(([code, count]) => ({ code, count }))
      .filter((r) => r.count > 0 || r.code === role)
      .sort((a, b) => b.count - a.count);

    const sortByName = (a: PersonIndexEntry, b: PersonIndexEntry) =>
      (a.name_ru ?? a.id).localeCompare(b.name_ru ?? b.id, "ru");

    // Группировка.
    const buckets = new Map<string, PersonIndexEntry[]>();
    const order: string[] = [];
    const pushTo = (key: string, p: PersonIndexEntry) => {
      let arr = buckets.get(key);
      if (!arr) {
        arr = [];
        buckets.set(key, arr);
        order.push(key);
      }
      arr.push(p);
    };

    if (group === "country") {
      for (const p of filtered) {
        if (p.nationality.length === 0) pushTo("__nocountry", p);
        else for (const c of p.nationality) pushTo(c, p);
      }
    } else if (group === "era") {
      for (const p of filtered) pushTo(eraFor(p), p);
    } else {
      for (const p of filtered) {
        if (p.roles.length === 0) pushTo("__norole", p);
        else for (const r of p.roles) pushTo(r, p);
      }
    }

    // Сортировка секций по размеру (для country/role) и фиксированный
    // порядок для era.
    let sectionKeys: string[];
    if (group === "era") {
      sectionKeys = [...ERAS.map((e) => e.id)].filter((k) => buckets.has(k));
    } else {
      sectionKeys = order
        .slice()
        .sort((a, b) => (buckets.get(b)?.length ?? 0) - (buckets.get(a)?.length ?? 0));
    }

    const sections: Section[] = sectionKeys.map((key) => {
      const items = (buckets.get(key) ?? []).slice().sort(sortByName);
      let title: React.ReactNode;
      if (group === "country") {
        if (key === "__nocountry") title = "Без указания страны";
        else title = <ClientAbbr kind="countries" code={key} display="name" />;
      } else if (group === "era") {
        title = ERAS.find((e) => e.id === key)?.label ?? key;
      } else {
        if (key === "__norole") title = "Без роли";
        else title = <ClientAbbr kind="roles" code={key} display="name" />;
      }
      return { id: key, title, count: items.length, items };
    });

    return { sections, roles, total: filtered.length };
  }, [people, role, group]);

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

  const { sections, roles, total } = data;

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: "люди" }]} />
      <header className="space-y-2">
        <p className="titre">галерея</p>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="font-display text-3xl text-light">Люди</h1>
          <p className="titre">
            {total}
            {role && (
              <>
                {" · "}
                <ClientAbbr kind="roles" code={role} display="name" />
              </>
            )}
            {" · "}
            {GROUP_LABELS[group]}
          </p>
        </div>
      </header>

      <FilterRow label="группа">
        <Chip
          active={group === "country"}
          href={hrefWith({ role, group: undefined })}
          label="страна"
        />
        <Chip
          active={group === "era"}
          href={hrefWith({ role, group: "era" })}
          label="эпоха"
        />
        <Chip
          active={group === "role"}
          href={hrefWith({ role, group: "role" })}
          label="роль"
        />
      </FilterRow>

      <FilterRow label="роль">
        <Chip active={!role} href={hrefWith({ role: undefined, group })} label="Все" />
        {roles.map((r) => (
          <Chip
            key={r.code}
            active={role === r.code}
            href={hrefWith({ role: r.code, group })}
            label={
              <span>
                <ClientAbbr kind="roles" code={r.code} display="name" />{" "}
                <span className="text-light/40">{r.count}</span>
              </span>
            }
          />
        ))}
      </FilterRow>

      <p className="text-light/70 text-sm max-w-2xl">
        Часть записей — заглушки, созданные при импорте из Wikidata; портреты
        и биографии подгружаются по мере обогащения. Где фото нет — стоит
        приглушённый круг. Секции свёрнуты — раскрой нужную.
      </p>

      <div className="space-y-3">
        {sections.map((s, i) => (
          <PeopleSection key={s.id} section={s} defaultOpen={i === 0} />
        ))}
      </div>
    </section>
  );
}

const PAGE_SIZE = 200;

function PeopleSection({
  section,
  defaultOpen,
}: {
  section: Section;
  defaultOpen: boolean;
}) {
  // Ленивая монтировка: содержимое <details> рендерим только если
  // секция когда-либо открывалась. Это ключевой фикс — иначе при
  // первом рендере React пытается смонтировать тысячи Avatar/Link
  // во всех секциях и страница падает с client-side exception.
  const [open, setOpen] = useState(defaultOpen);
  const [shown, setShown] = useState(PAGE_SIZE);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="border border-light/10 rounded overflow-hidden group"
    >
      <summary className="cursor-pointer list-none flex items-baseline justify-between gap-4 px-3 py-2 hover:bg-light/5">
        <span className="font-display text-lg text-light">
          <span className="text-sepia/60 inline-block w-4 text-center mr-1 group-open:rotate-90 transition-transform">
            ▸
          </span>
          {section.title}
        </span>
        <span className="titre">{section.count}</span>
      </summary>
      {open && (
        <>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
            {section.items.slice(0, shown).map((p) => (
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
          {section.count > shown && (
            <div className="px-3 pb-3">
              <button
                type="button"
                onClick={() => setShown((s) => s + PAGE_SIZE)}
                className="px-3 py-1.5 border border-light/30 rounded text-sm text-light/80 hover:border-sepia hover:text-light transition-colors"
              >
                Показать ещё {Math.min(PAGE_SIZE, section.count - shown)} из{" "}
                {section.count - shown}
              </button>
            </div>
          )}
        </>
      )}
    </details>
  );
}

export default function PeoplePage() {
  return (
    <Suspense fallback={null}>
      <PeopleContent />
    </Suspense>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <p className="titre w-14 shrink-0">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
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

function hrefWith({
  role,
  group,
}: {
  role?: string;
  group?: GroupMode;
}): LinkHref {
  const query: Record<string, string> = {};
  if (role) query.role = role;
  if (group && group !== "country") query.group = group;
  return Object.keys(query).length
    ? { pathname: "/people", query }
    : { pathname: "/people" };
}

function dateYear(d?: string): string {
  if (!d) return "";
  return d.slice(0, 4);
}
