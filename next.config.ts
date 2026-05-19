import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Capacitor는 server.url로 Vercel에 연결 — static export 불필요
  images: { unoptimized: true },
};

export default nextConfig;
