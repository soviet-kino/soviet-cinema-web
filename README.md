# soviet-cinema-web

Веб-приложение проекта **Soviet Bloc Cinema**.

## Стек

- **Next.js 15** (App Router) + React 19, TypeScript
- **Tailwind CSS**
- **better-sqlite3** — рантайм-БД, генерируется при сборке из
  `../soviet-cinema-data` через `scripts/build-db.mjs`. На старте FTS5
  встроен в SQLite; при росте — Meilisearch.

## Запуск

Предполагается, что в соседней директории клонирован `soviet-cinema-data`.

```bash
pnpm install   # или npm/yarn — на ваше усмотрение
pnpm build:db  # собрать data/soviet-cinema.sqlite из YAML
pnpm dev
```

Опционально путь к данным переопределяется переменной `SBC_DATA_DIR`.

## Структура

```
app/             — App Router: layout, страницы
lib/             — db, утилиты сервера
public/          — статика
scripts/         — build-db.mjs (YAML → SQLite)
```

## Деплой

Сайт собирается через `output: 'export'` — это полностью статический
HTML/JS/CSS, без серверного рантайма. Подходит для Cloudflare Pages
(бесплатно, без лимитов на трафик и запросы).

### Архитектура билда

- `npm run build:db` строит **и** `data/soviet-cinema.sqlite`,
  **и** JSON-индексы в `public/data/` (films-index, people-index,
  studios, topics, motifs, refs, vocabulary, stats).
- `next build` использует SQLite для пре-рендера detail-страниц
  (`/films/[slug]`, `/people/[slug]` и т. д.) через
  `generateStaticParams`.
- List-страницы (`/films`, `/people`, `/search`, `/random`, `/stats`)
  — client components: на клиенте грузят `/data/*.json` и фильтруют
  в памяти.
- Результат — папка `out/` с готовым статическим сайтом.

### Cloudflare Pages — однократная настройка

1. Создать API-токен в Cloudflare Dashboard:
   - Profile → API Tokens → Create Token → "Edit Cloudflare Workers"
     (включает Pages:Edit).
2. Получить Account ID: dashboard → правая колонка на любой странице.
3. В GitHub репозитории `soviet-cinema-web` добавить secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. Опционально — переменная `SITE_URL` (vars) с собственным доменом
   для корректного `sitemap.xml`.

После этого push в `main` автоматически:
- собирает сайт (`.github/workflows/deploy.yml`),
- пушит `out/` в Cloudflare Pages через `wrangler pages deploy`,
- проект на CFP создаётся при первом деплое; имя — `soviet-cinema`
  (меняется в deploy.yml).

## Лицензия

MIT — см. `LICENSE`. Это лицензия на **код приложения**.
Данные и эссе лежат в отдельных репозиториях и распространяются под
CC BY-SA 4.0 и CC BY-NC-SA 4.0 соответственно.
