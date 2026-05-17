// Семантический <abbr> с tooltip-ом — расшифровкой кода из vocabulary.
// На hover браузер показывает name_ru, screen reader зачитывает расшифровку.

import { vocabName, type VocabKind } from "./queries";

interface AbbrProps {
  kind: VocabKind;
  code: string;
  className?: string;
}

export function Abbr({ kind, code, className }: AbbrProps) {
  const name = vocabName(kind, code);
  if (name === code) {
    return <span className={className}>{code}</span>;
  }
  return (
    <abbr
      title={name}
      className={
        "cursor-help underline decoration-dotted underline-offset-2 " +
        (className ?? "")
      }
    >
      {code}
    </abbr>
  );
}
