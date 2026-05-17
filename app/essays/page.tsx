export const dynamic = "force-static";

export default function EssaysPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="titre">лонгриды</p>
        <h1 className="font-display text-3xl text-light">Разборы</h1>
      </header>
      <div className="frame p-8 text-center space-y-3">
        <p className="text-light/80 text-lg">Раздел готовится.</p>
        <p className="text-light/60 max-w-xl mx-auto">
          Авторские разборы фильмов и тем — второй смысловой ряд, эзопов
          язык, мотивы. Их пишут редакторы, не AI. Каркас репозитория
          <code className="text-sepia mx-1">soviet-cinema-essays</code>
          готов; первые тексты появятся по мере подготовки.
        </p>
        <p className="titre">
          предложить разбор —{" "}
          <a
            href="https://github.com/soviet-kino/soviet-cinema-essays/issues/new/choose"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-dotted underline-offset-2 hover:text-sepia"
          >
            github · issue
          </a>
        </p>
      </div>
    </section>
  );
}
