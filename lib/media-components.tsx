// Презентационные компоненты для постера/аватара/«смотреть».

import {
  commonsFilePage,
  commonsUrl,
  youtubeEmbedUrl,
  youtubeSearchUrl,
  youtubeThumbnail,
  youtubeWatchUrl,
} from "./media";
import { ZoomableImage } from "./zoomable-image";

interface PosterProps {
  filename?: string;
  alt: string;
  /** Желаемая ширина изображения в пикселях. */
  width?: number;
  className?: string;
}

/**
 * Постер фильма с Wikimedia Commons.
 *
 * Если filename не передан — рендерим декоративный плейсхолдер,
 * чтобы вёрстка карточки не прыгала между фильмами с/без постера.
 */
export function Poster({ filename, alt, width = 400, className }: PosterProps) {
  if (!filename) {
    return (
      <div
        className={
          "aspect-[2/3] w-full bg-light/5 border border-light/10 flex items-center justify-center text-light/30 text-sm " +
          (className ?? "")
        }
        aria-hidden="true"
      >
        нет постера
      </div>
    );
  }
  return (
    <figure className={"space-y-1 " + (className ?? "")}>
      <ZoomableImage
        src={commonsUrl(filename, width)}
        fullSrc={commonsUrl(filename, 1600)}
        alt={alt}
        imgClassName="w-full h-auto block border border-light/10 hover:border-sepia/40 transition-colors"
        caption={
          <>
            {alt}
            {" · "}
            <a
              href={commonsFilePage(filename)}
              target="_blank"
              rel="noreferrer noopener"
              className="underline decoration-dotted underline-offset-2 hover:text-sepia"
            >
              на Wikimedia Commons
            </a>
          </>
        }
      />
      <figcaption className="text-[10px] text-light/50 leading-tight">
        Wikimedia Commons
      </figcaption>
    </figure>
  );
}

interface AvatarProps {
  filename?: string;
  alt: string;
  size?: number;
}

/**
 * Маленький круглый портрет рядом с именем.
 * Если filename нет — инициалы или просто отступ.
 */
export function Avatar({ filename, alt, size = 28 }: AvatarProps) {
  if (!filename) {
    return (
      <span
        aria-hidden="true"
        className="inline-block shrink-0 rounded-full bg-light/10"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <ZoomableImage
      src={commonsUrl(filename, size * 2)}
      fullSrc={commonsUrl(filename, 1200)}
      alt={alt}
      width={size}
      height={size}
      imgClassName="inline-block shrink-0 rounded-full object-cover bg-light/5"
      triggerClassName="inline-block shrink-0 rounded-full overflow-hidden hover:ring-2 hover:ring-sepia/60 transition"
      caption={
        <>
          {alt}
          {" · "}
          <a
            href={commonsFilePage(filename)}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-dotted underline-offset-2 hover:text-sepia"
          >
            на Wikimedia Commons
          </a>
        </>
      }
    />
  );
}

interface WatchBlockProps {
  youtubeId?: string;
  titleRu: string;
  year: number;
}

/**
 * Блок «Смотреть».
 *
 * Если есть YouTube ID — рендерим facade: превью с YouTube CDN + кнопка
 * Play, по клику разворачиваем iframe (без JS facade тоже работает —
 * ссылка ведёт на YouTube).
 *
 * Если ID нет — кнопка с поиском по названию.
 *
 * Без клиентского JS embed не загружается — это правильно: страница
 * остаётся быстрой, а пользователь явно подтверждает желание смотреть.
 */
export function WatchBlock({ youtubeId, titleRu, year }: WatchBlockProps) {
  if (youtubeId) {
    return <YouTubeFacade videoId={youtubeId} title={titleRu} />;
  }
  return (
    <a
      href={youtubeSearchUrl(titleRu, year)}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-2 px-3 py-2 border border-light/30 hover:border-light rounded text-sm"
    >
      <span aria-hidden="true">🔍</span>
      Найти на YouTube
    </a>
  );
}

function YouTubeFacade({ videoId, title }: { videoId: string; title: string }) {
  // Server-rendered facade. Прогрессивное улучшение: <details>/<summary>
  // даёт раскрытие без JS (без iframe), а iframe загружается только
  // после клика на «Загрузить плеер».
  return (
    <details className="block border border-light/20 rounded overflow-hidden">
      <summary className="cursor-pointer list-none flex items-center gap-3 p-3 hover:bg-light/5">
        <img
          src={youtubeThumbnail(videoId)}
          alt=""
          width={120}
          height={90}
          loading="lazy"
          className="w-30 h-auto rounded border border-light/10"
        />
        <span className="flex-1">
          <span className="block font-medium">Смотреть на YouTube</span>
          <span className="block text-sm text-light/60">
            «{title}» — нажмите для открытия плеера.
          </span>
        </span>
        <span aria-hidden="true" className="text-2xl text-sepia">
          ▶
        </span>
      </summary>
      <div className="aspect-video">
        <iframe
          src={youtubeEmbedUrl(videoId)}
          title={`«${title}» — встроенный плеер`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="w-full h-full border-0"
        />
      </div>
      <div className="p-2 text-sm text-light/70 border-t border-light/10">
        <a
          href={youtubeWatchUrl(videoId)}
          target="_blank"
          rel="noreferrer noopener"
          className="underline"
        >
          Открыть на YouTube
        </a>
      </div>
    </details>
  );
}
