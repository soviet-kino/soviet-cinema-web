import { redirect } from "next/navigation";

import { allFilmIds } from "@/lib/queries";

// Динамический GET-роут: /random → 307 redirect на /films/<random-slug>.
// Не статика, поскольку каждый запрос даёт новый случайный фильм.
export const dynamic = "force-dynamic";

export function GET() {
  const ids = allFilmIds();
  if (ids.length === 0) redirect("/films");
  const id = ids[Math.floor(Math.random() * ids.length)];
  redirect(`/films/${id}`);
}
