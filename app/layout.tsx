import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Soviet Bloc Cinema",
  description:
    "Открытый исследовательский портал о кино СССР и стран социалистического лагеря XX века.",
};

const NAV = [
  { href: "/films", label: "Фильмы" },
  { href: "/people", label: "Люди" },
  { href: "/personalities", label: "Личности" },
  { href: "/studios", label: "Студии" },
  { href: "/topics", label: "Темы" },
  { href: "/motifs", label: "Мотивы" },
  { href: "/essays", label: "Разборы" },
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
              <nav className="flex gap-5 text-sm font-mono uppercase tracking-wider text-light/70">
                {NAV.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="hover:text-sepia transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <form action="/search" method="get" className="flex">
                <input
                  type="search"
                  name="q"
                  placeholder="Поиск…"
                  className="bg-velvet border border-light/20 rounded px-2 py-1 text-sm text-light placeholder-light/40 focus:border-sepia focus:outline-none w-36"
                />
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>

        <footer className="border-t border-light/10 mt-24 py-8 text-xs">
          <div className="mx-auto max-w-6xl px-6 space-y-3 text-light/50">
            <nav className="flex flex-wrap gap-4 text-sepia_dim">
              <a href="/random" className="hover:text-sepia">
                🎲 Случайный фильм
              </a>
              <a href="/stats" className="hover:text-sepia">
                📊 Статистика базы
              </a>
              <a href="/search" className="hover:text-sepia">
                🔍 Поиск
              </a>
            </nav>
            <div className="grid sm:grid-cols-2 gap-4">
              <p>
                Данные — CC BY-SA 4.0. Разборы — CC BY-NC-SA 4.0. Постеры —
                Wikimedia Commons и TMDB, по лицензиям правообладателей.
              </p>
              <p className="sm:text-right">
                Исходники:{" "}
                <a
                  className="underline decoration-dotted underline-offset-2"
                  href="https://github.com/soviet-kino"
                >
                  github.com/soviet-kino
                </a>
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
