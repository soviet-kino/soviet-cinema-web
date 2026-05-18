// Клиентские типы и загрузчики статических JSON-индексов из public/data/.
// Используются страницами, переписанными как client components для static
// export. Каждый JSON загружается лениво и кэшируется в модуле — повторные
// рендеры не повторяют сетевой запрос.

export interface FilmIndexEntry {
  id: string;
  title_ru: string;
  title_original: string;
  title_en?: string;
  year: number | null;
  country: string[];
  republic?: string;
  studio: string[];
  director: string[];
  genre: string[];
  topics: string[];
  poster_commons?: string;
  youtube?: string;
}

export interface PersonIndexEntry {
  id: string;
  name_ru?: string;
  name_original?: string;
  name_translit?: string;
  roles: string[];
  nationality: string[];
  birth?: string;
  death?: string;
  image_commons?: string;
}

export interface StudioIndexEntry {
  id: string;
  name_ru: string;
  name_original?: string;
  country?: string;
  founded?: number;
  image_commons?: string;
  external_ids?: { wikidata?: string };
  film_count: number;
}

export interface TopicIndexEntry {
  id: string;
  name_ru: string;
  description_ru?: string;
  films?: string[];
  filter?: {
    director?: string;
    screenwriter?: string;
    book_author?: string;
    year_from?: number;
    year_to?: number;
    country?: string;
  };
}

export interface MotifIndexEntry {
  id: string;
  name_ru: string;
  description_ru?: string;
  category?: string[];
}

export interface ReferenceIndexEntry {
  id: string;
  source_film: string;
  target: { type: string; ref: string };
  kind: string;
  description_ru?: string;
  confidence?: string;
}

export type VocabKind =
  | "countries"
  | "republics"
  | "genres"
  | "roles"
  | "motif_categories"
  | "reference_kinds"
  | "censorship_statuses";

export interface VocabEntry {
  name: string;
  description: string | null;
}

export type Vocabulary = Record<VocabKind, Record<string, VocabEntry>>;

export interface StatsData {
  totals: {
    films: number;
    people: number;
    studios: number;
    topics: number;
    refs: number;
  };
  coverage: Record<string, number>;
  by_country: { code: string; count: number }[];
  by_decade: { decade: number; count: number }[];
  by_role: { code: string; count: number }[];
  top_studios: { id: string; name_ru: string; count: number }[];
  top_directors: {
    id: string;
    name_ru: string;
    image_commons?: string;
    film_count: number;
  }[];
}

// Module-level cache: один Promise на тип JSON — переиспользуется
// между рендерами и компонентами.
const cache = new Map<string, Promise<unknown>>();

function load<T>(file: string): Promise<T> {
  let p = cache.get(file) as Promise<T> | undefined;
  if (!p) {
    p = fetch(`/data/${file}`, { cache: "force-cache" }).then((r) => {
      if (!r.ok) throw new Error(`failed to load /data/${file}: ${r.status}`);
      return r.json() as Promise<T>;
    });
    cache.set(file, p as Promise<unknown>);
  }
  return p;
}

export const loadFilms = () => load<FilmIndexEntry[]>("films-index.json");
export const loadPeople = () => load<PersonIndexEntry[]>("people-index.json");
export const loadStudios = () => load<StudioIndexEntry[]>("studios.json");
export const loadTopics = () => load<TopicIndexEntry[]>("topics.json");
export const loadMotifs = () => load<MotifIndexEntry[]>("motifs.json");
export const loadRefs = () => load<ReferenceIndexEntry[]>("refs.json");
export const loadVocabulary = () => load<Vocabulary>("vocabulary.json");
export const loadStats = () => load<StatsData>("stats.json");
