/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3 — нативный модуль, его нельзя бандлить
  serverExternalPackages: ["better-sqlite3"],
  typedRoutes: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
  },
};

export default nextConfig;
