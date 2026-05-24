import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Soviet Bloc Cinema",
  description:
    "Открытый исследовательский портал о кино СССР и стран социалистического лагеря XX века.",
};

// Основная навигация — то что точно стоит в хедере.
const NAV_MAIN = [
  { href: "/films", label: "Фильмы" },
  { href: "/people", label: "Люди" },
  { href: "/topics", label: "Темы" },
];
// «Ещё ▼» — второстепенные разделы; на десктопе раскрывается hover-ом.
const NAV_MORE = [
  { href: "/coproductions", label: "Со-продукции" },
  { href: "/personalities", label: "Личности" },
  { href: "/studios", label: "Студии" },
  { href: "/motifs", label: "Мотивы" },
  { href: "/essays", label: "Разборы" },
  { href: "/stats", label: "Статистика" },
  { href: "/random", label: "🎲 Случайный" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="border-b border-light/10">
          <div className="mx-auto max-w-6xl px-6 py-5 flex items-baseline justify-between gap-6 flex-wrap">
            <a href="/" className="group">
              <p className="titre">soviet • bloc • cinema</p>
              <p className="font-display text-2xl text-light leading-none mt-1 group-hover:text-sepia transition-colors">
                Кинолетопись Восточного блока
              </p>
            </a>
            <div className="flex items-center gap-5 flex-wrap">
              <nav className="flex gap-5 text-sm font-mono uppercase tracking-wider text-light/70 items-center">
                {NAV_MAIN.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="hover:text-sepia transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
                {/* «Ещё» — hover-driven dropdown через group/peer (без JS). */}
                <details className="relative group">
                  <summary className="cursor-pointer list-none hover:text-sepia transition-colors">
                    Ещё ▾
                  </summary>
                  <div className="absolute right-0 top-full mt-2 z-10 frame bg-screen p-2 min-w-[180px] shadow-xl">
                    <ul className="flex flex-col gap-1.5">
                      {NAV_MORE.map((item) => (
                        <li key={item.href}>
                          <a
                            href={item.href}
                            className="block px-2 py-1 rounded hover:bg-sepia/20 hover:text-light text-sm normal-case tracking-normal font-sans"
                          >
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              </nav>
              <form action="/search" method="get" className="flex">
                <input
                  type="search"
                  name="q"
                  placeholder="Найти фильм или человека…"
                  className="bg-velvet border border-light/20 rounded px-3 py-1.5 text-sm text-light placeholder-light/40 focus:border-sepia focus:outline-none w-64"
                />
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>

        <footer className="border-t border-light/10 mt-24 py-6 text-xs text-light/50">
          <div className="mx-auto max-w-6xl px-6 flex items-center justify-between gap-4 flex-wrap">
            <p>
              Данные — CC BY-SA 4.0 · Разборы — CC BY-NC-SA 4.0 · Постеры
              с{" "}
              <a
                className="underline decoration-dotted underline-offset-2"
                href="https://commons.wikimedia.org/"
              >
                Wikimedia Commons
              </a>{" "}
              и{" "}
              <a
                className="underline decoration-dotted underline-offset-2"
                href="https://www.themoviedb.org/"
              >
                TMDB
              </a>
              .
            </p>
            <p>
              <a
                className="underline decoration-dotted underline-offset-2"
                href="https://github.com/soviet-kino"
              >
                github.com/soviet-kino
              </a>
            </p>
          </div>
          <p className="mx-auto max-w-6xl px-6 mt-2 text-light/30">
            Продукт использует TMDB API, не одобрен и не сертифицирован TMDB.
          </p>
        </footer>
      </body>
    </html>
  );
}
