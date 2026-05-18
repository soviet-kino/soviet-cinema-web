/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export для Cloudflare Pages: всё пре-рендерится в out/ во
  // время билда. List-страницы (/films, /people, /search, /random,
  // /stats) — client components, грузят /data/*.json. Detail-страницы
  // (/films/[slug], /people/[slug], /studios/[slug], /topics/[slug])
  // пре-рендерятся через generateStaticParams.
  output: "export",
  // better-sqlite3 — нативный модуль, его нельзя бандлить
  serverExternalPackages: ["better-sqlite3"],
  // typedRoutes несовместим со static export
  typedRoutes: false,
  images: {
    // Cloudflare Pages не умеет next/image оптимизацию — используем
    // unoptimized, ссылки идут напрямую через Wikimedia/TMDB.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org" }],
  },
};

export default nextConfig;
