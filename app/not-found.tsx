import Link from "next/link";

export const metadata = { title: "Не найдено — Soviet Bloc Cinema" };

export default function NotFound() {
  return (
    <section className="cinema-screen aspect-[21/9] rounded-sm flex items-center justify-center px-8 text-center">
      <div className="space-y-3 max-w-2xl">
        <p className="titre text-sepia">404 · cut</p>
        <h1 className="font-display text-4xl text-light leading-tight">
          Этого кадра нет в плёнке
        </h1>
        <p className="text-light/70">
          Возможно, фильм или человек ещё не добавлены в базу, либо ссылка
          устарела после переименования. Попробуйте поиск или начните с главной.
        </p>
        <div className="flex justify-center gap-3 pt-2 flex-wrap">
          <Link
            href="/"
            className="px-3 py-1.5 border border-sepia/40 text-sepia hover:bg-sepia/10 rounded transition-colors"
          >
            На главную
          </Link>
          <Link
            href="/search"
            className="px-3 py-1.5 border border-light/30 text-light hover:border-light rounded transition-colors"
          >
            Поиск
          </Link>
        </div>
      </div>
    </section>
  );
}
