import Link from "next/link";

interface Crumb {
  label: string;
  href?: string;
}

/**
 * Хлебные крошки для страниц сущностей.
 *
 * Пример: <Breadcrumbs items={[{ label: "Фильмы", href: "/films" }, { label: "Зеркало" }]} />
 * Последний элемент без href — текущая страница.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Хлебные крошки" className="text-xs">
      <ol className="flex flex-wrap items-baseline gap-x-1.5 text-light/50">
        <li>
          <Link
            href="/"
            className="hover:text-sepia transition-colors titre"
          >
            главная
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-baseline gap-x-1.5">
            <span aria-hidden="true">/</span>
            {item.href ? (
              <Link
                href={item.href as never}
                className="hover:text-sepia transition-colors titre"
              >
                {item.label}
              </Link>
            ) : (
              <span className="titre text-light/70">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
