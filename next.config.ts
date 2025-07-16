import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: "https",
        port: "",
        pathname: "/**",
        hostname: "img.clerk.com",
      }
    ]
  },
    eslint: {
    ignoreDuringBuilds: true,   
  },
};

export default nextConfig;
