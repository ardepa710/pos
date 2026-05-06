import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost", "*.localhost"],
    },
  },
};

export default nextConfig;
