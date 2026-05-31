// Удаляет RSC-пейлоады (*.txt) из статического экспорта Next.
//
// Зачем: Next 15.5+ при `output: export` генерирует на каждую страницу
// два файла — `page.html` и `page.txt` (RSC payload для client-side
// soft-navigation). Это удваивает число файлов в out/ и пробивает
// лимит Cloudflare Pages free (20 000 файлов в деплое).
//
// Для статического контент-сайта soft-navigation не критична: без .txt
// роутер при переходе по <Link> делает обычную (hard) навигацию на
// готовый .html. Контент тот же, переход чуть менее плавный.
//
// Удаляем .txt ТОЛЬКО если рядом лежит одноимённый .html — так
// сохраняются настоящие текстовые роуты без HTML-пары (robots.txt и т.п.).
//
// История: до обновления Next (~15.0 → 15.5.18) .txt не генерировались
// и бюджет файлов был вдвое меньше. См. project-state memory, 2026-05-31.

import { readdirSync, statSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const OUT = "out";

let removed = 0;
let kept = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p);
    } else if (entry.endsWith(".txt")) {
      const htmlTwin = p.slice(0, -4) + ".html";
      if (existsSync(htmlTwin)) {
        rmSync(p);
        removed++;
      } else {
        kept++;
      }
    }
  }
}

if (!existsSync(OUT)) {
  console.error(`[strip-rsc] нет директории ${OUT}/ — сначала next build`);
  process.exit(1);
}

walk(OUT);

const total = countFiles(OUT);
console.log(
  `[strip-rsc] удалено RSC .txt: ${removed}, сохранено текстовых роутов: ${kept}`,
);
console.log(`[strip-rsc] файлов в ${OUT}/ итого: ${total} (лимит CFP: 20000)`);
if (total > 20000) {
  console.error(`[strip-rsc] ВНИМАНИЕ: всё ещё > 20000 файлов — деплой упадёт`);
  process.exit(1);
}

function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) n += countFiles(p);
    else n++;
  }
  return n;
}
