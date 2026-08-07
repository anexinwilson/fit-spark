import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: "https",
        port: "",
        pathname: "/**",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        port: "",
        pathname: "/**",
        hostname: "raw.githubusercontent.com",
      },
      {
        protocol: "https",
        port: "",
        pathname: "/**",
        hostname: "storage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
