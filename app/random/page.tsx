"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { loadFilms } from "@/lib/client-data";

// /random выбирает случайный фильм на клиенте и редиректит на /films/<id>.
// Заменяет старый server-side route (force-dynamic), несовместимый с
// static export.
export default function RandomPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    loadFilms().then((films) => {
      if (cancelled || films.length === 0) {
        router.replace("/films");
        return;
      }
      const id = films[Math.floor(Math.random() * films.length)].id;
      router.replace(`/films/${id}`);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <section className="space-y-2">
      <p className="titre">случайный фильм</p>
      <p className="text-light/60">Выбираем…</p>
    </section>
  );
}
