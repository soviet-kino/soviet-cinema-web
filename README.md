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

Целевые платформы — Cloudflare Pages и Vercel (бесплатные тарифы).
Данные собираются в `data/soviet-cinema.sqlite` и попадают в билд.
Внешний рантайм-БД не требуется.

## Лицензия

MIT — см. `LICENSE`. Это лицензия на **код приложения**.
Данные и эссе лежат в отдельных репозиториях и распространяются под
CC BY-SA 4.0 и CC BY-NC-SA 4.0 соответственно.
