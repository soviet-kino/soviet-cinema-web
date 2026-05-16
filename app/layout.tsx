import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Soviet Bloc Cinema",
  description:
    "Открытый исследовательский портал о кино СССР и стран социалистического лагеря XX века.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="border-b border-ink/10">
          <div className="mx-auto max-w-5xl px-4 py-6 flex items-baseline justify-between">
            <a href="/" className="text-xl font-semibold">
              Soviet Bloc Cinema
            </a>
            <nav className="space-x-4 text-sm">
              <a href="/films" className="hover:underline">
                Фильмы
              </a>
              <a href="/people" className="hover:underline">
                Люди
              </a>
              <a href="/essays" className="hover:underline">
                Разборы
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
        <footer className="border-t border-ink/10 mt-16 py-8 text-sm text-ink/70">
          <div className="mx-auto max-w-5xl px-4 space-y-1">
            <p>
              Данные — CC BY-SA 4.0. Разборы — CC BY-NC-SA 4.0. Постеры — TMDB,
              с указанием правообладателей.
            </p>
            <p>
              Исходники:{" "}
              <a className="underline" href="https://github.com/soviet-kino">
                github.com/soviet-kino
              </a>
              .
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
