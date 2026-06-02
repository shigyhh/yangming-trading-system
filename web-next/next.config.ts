import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@yangming/personality", "@yangming/content"],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
