import type { NextConfig } from "next";

const serverApiBaseUrl = (
  process.env.YM_API_BASE_URL ||
  process.env.NEXT_PUBLIC_YM_API_BASE_URL ||
  "http://127.0.0.1:8787"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@yangming/personality", "@yangming/content"],
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/kline-history/:path*",
        destination: `${serverApiBaseUrl}/api/v1/kline-history/:path*`,
      },
    ];
  },
};

export default nextConfig;
