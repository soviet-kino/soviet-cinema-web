// Семантический <abbr> с tooltip-ом — расшифровкой кода из vocabulary.
// На hover браузер показывает name_ru, screen reader зачитывает расшифровку.

import { vocabEntry, type VocabKind } from "./queries";

interface AbbrProps {
  kind: VocabKind;
  code: string;
  /** Что показать как видимый текст: код (по умолчанию) или развёрнутое имя. */
  display?: "code" | "name";
  className?: string;
}

export function Abbr({ kind, code, display = "code", className }: AbbrProps) {
  const entry = vocabEntry(kind, code);
  // Если в словаре нет — отдаём просто текст, без вводящего в заблуждение тултипа.
  if (!entry) {
    return <span className={className}>{code}</span>;
  }
  const visible = display === "name" ? entry.name : code;
  // Тултип: если есть полное описание — оно; иначе развёрнутое имя
  // (имеет смысл, когда видим только код).
  const tooltip =
    entry.description ?? (display === "code" ? entry.name : entry.name);
  // Если показываем уже само имя и описания нет — тултип бесполезен.
  if (display === "name" && !entry.description) {
    return <span className={className}>{visible}</span>;
  }
  return (
    <abbr
      title={tooltip}
      className={
        "cursor-help underline decoration-dotted underline-offset-2 " +
        (className ?? "")
      }
    >
      {visible}
    </abbr>
  );
}
