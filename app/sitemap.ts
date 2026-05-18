import type { MetadataRoute } from "next";

import {
  allFilmIds,
  allMotifIds,
  allPersonIds,
  allStudioIds,
  allTopicIds,
} from "@/lib/queries";

// На проде поменяем на собственный домен через env.
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://soviet-kino.github.io";

// Для static export sitemap нужно явно объявить статическим.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticUrls = [
    "",
    "/films",
    "/films?year=all",
    "/people",
    "/studios",
    "/topics",
    "/motifs",
    "/essays",
    "/search",
  ];
  const entries: MetadataRoute.Sitemap = staticUrls.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1.0 : 0.7,
  }));
  for (const id of allFilmIds()) {
    entries.push({ url: `${BASE}/films/${id}`, lastModified: now, priority: 0.5 });
  }
  for (const id of allPersonIds()) {
    entries.push({ url: `${BASE}/people/${id}`, lastModified: now, priority: 0.4 });
  }
  for (const id of allStudioIds()) {
    entries.push({ url: `${BASE}/studios/${id}`, lastModified: now, priority: 0.4 });
  }
  for (const id of allTopicIds()) {
    entries.push({ url: `${BASE}/topics/${id}`, lastModified: now, priority: 0.6 });
  }
  for (const id of allMotifIds()) {
    entries.push({ url: `${BASE}/motifs/${id}`, lastModified: now, priority: 0.5 });
  }
  return entries;
}
