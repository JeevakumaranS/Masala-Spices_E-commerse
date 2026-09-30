import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiTarget = (
      process.env.API_PROXY_TARGET ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:8080"
    ).replace(/\/+$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },

  images: {
    // Allow Next.js Image Optimization to fetch images from local RustFS.
    // Development only.
    dangerouslyAllowLocalIP: true,

    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/masala-store/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9000",
        pathname: "/masala-store/**",
      },
    ],

    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },
};

export default nextConfig;
