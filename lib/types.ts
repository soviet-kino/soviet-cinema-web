// Минимальные типы для данных, рендеримых страницами.
// Источник истины — Pydantic-схемы в soviet-cinema-tools/validators/schemas.py.
// Здесь — только то, что нужно UI.

export interface CastEntry {
  person: string;
  role?: string;
}

export interface ExternalIds {
  wikidata?: string;
  imdb?: string;
  tmdb?: number | string;
  kinopoisk?: number | string;
  /** YouTube video id (Wikidata P1651). */
  youtube?: string;
}

export interface Film {
  id: string;
  title_ru: string;
  title_original: string;
  title_translit?: string;
  title_en?: string;
  year: number;
  country: string[];
  republic?: string;
  studio?: string[];
  director?: string[];
  screenwriter?: string[];
  cinematographer?: string[];
  composer?: string[];
  cast?: CastEntry[];
  runtime_min?: number;
  language?: string[];
  genre?: string[];
  color?: "color" | "bw" | "color_and_bw";
  release_date?: string;
  production_status?: string;
  censorship_status?: string;
  /** Имя файла на Wikimedia Commons (Wikidata P18). */
  poster_commons?: string;
  /** Slug-и тематических разделов, к которым относится фильм. */
  topics?: string[];
  external_ids?: ExternalIds;
  sources?: string[];
}

export interface TopicFilter {
  year_from?: number;
  year_to?: number;
  director?: string;
  screenwriter?: string;
  book_author?: string;
  country?: string;
}

export interface Topic {
  id: string;
  name_ru: string;
  name_original?: string;
  description_ru: string;
  long_description_ru?: string;
  related_motifs?: string[];
  filter?: TopicFilter;
  sources?: string[];
}

export interface Person {
  id: string;
  name_ru: string;
  name_original?: string;
  name_translit?: string;
  birth?: string;
  death?: string;
  nationality?: string[];
  roles?: string[];
  image_commons?: string;
  external_ids?: ExternalIds;
}

export interface Motif {
  id: string;
  name_ru: string;
  description_ru: string;
  category?: string[];
  sources?: string[];
}

export interface Studio {
  id: string;
  name_ru: string;
  name_original?: string;
  country: string;
  founded?: number;
  image_commons?: string;
  external_ids?: ExternalIds;
}
