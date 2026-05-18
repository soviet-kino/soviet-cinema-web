"use client";

// Клиентский <Abbr>, работающий с vocabulary.json. Аналог lib/abbr.tsx,
// но не читает SQLite — нужен для страниц с output: 'export'.

import { useEffect, useState } from "react";

import { loadVocabulary, type VocabKind, type Vocabulary } from "./client-data";

let cachedVocab: Vocabulary | null = null;
const subscribers = new Set<(v: Vocabulary) => void>();

function ensureVocab(): Vocabulary | null {
  if (cachedVocab) return cachedVocab;
  loadVocabulary().then((v) => {
    cachedVocab = v;
    subscribers.forEach((cb) => cb(v));
  });
  return null;
}

function useVocab(): Vocabulary | null {
  const [v, setV] = useState<Vocabulary | null>(cachedVocab);
  useEffect(() => {
    if (cachedVocab) {
      setV(cachedVocab);
      return;
    }
    const cb = (next: Vocabulary) => setV(next);
    subscribers.add(cb);
    ensureVocab();
    return () => {
      subscribers.delete(cb);
    };
  }, []);
  return v;
}

interface AbbrProps {
  kind: VocabKind;
  code: string;
  display?: "code" | "name";
  className?: string;
}

export function ClientAbbr({ kind, code, display = "code", className }: AbbrProps) {
  const vocab = useVocab();
  const entry = vocab?.[kind]?.[code];
  if (!entry) {
    // Пока словарь грузится — показываем код (или имя, если выбрано).
    // На втором рендере подставится полное.
    return <span className={className}>{code}</span>;
  }
  const visible = display === "name" ? entry.name : code;
  if (display === "name" && !entry.description) {
    return <span className={className}>{visible}</span>;
  }
  const tooltip = entry.description ?? entry.name;
  return (
    <abbr title={tooltip} className={className}>
      {visible}
    </abbr>
  );
}
