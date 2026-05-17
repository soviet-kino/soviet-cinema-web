// Хелперы для построения URL'ов на внешние медиа: Wikimedia Commons и YouTube.

/**
 * URL на Wikimedia Commons CDN.
 *
 * Special:FilePath возвращает 302 на актуальный upload-URL (с правильным
 * CDN-хостом). Параметр `width` отдаёт thumbnail нужной ширины — это
 * **критично**: без него Commons отдаёт оригинал (часто 5–20 МБ).
 */
export function commonsUrl(filename: string, width: number): string {
  // filename приходит как «Andrei Tarkovsky.jpg» — encodeURIComponent
  // безопасен для пробелов, спецсимволов, кириллицы.
  const safe = encodeURIComponent(filename);
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${safe}?width=${width}`;
}

/** Прямая ссылка на страницу файла на Commons (для атрибуции). */
export function commonsFilePage(filename: string): string {
  const safe = encodeURIComponent(filename.replace(/ /g, "_"));
  return `https://commons.wikimedia.org/wiki/File:${safe}`;
}

/** Privacy-friendly URL для YouTube embed. */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
}

/** URL превью YouTube-видео для facade-карточки. */
export function youtubeThumbnail(videoId: string): string {
  // hqdefault — 480×360, есть у любого видео.
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

/** Открытая ссылка на YouTube-видео. */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

/** Поиск фильма на YouTube, когда конкретного ID нет. */
export function youtubeSearchUrl(title: string, year: number): string {
  const q = encodeURIComponent(`${title} ${year} фильм`);
  return `https://www.youtube.com/results?search_query=${q}`;
}
