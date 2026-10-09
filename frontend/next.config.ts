import type { NextConfig } from "next";

const rustfsPublicEndpoint = process.env.NEXT_PUBLIC_RUSTFS_PUBLIC_ENDPOINT;
if (!rustfsPublicEndpoint) {
  throw new Error("NEXT_PUBLIC_RUSTFS_PUBLIC_ENDPOINT must be configured.");
}

const rustfsUrl = new URL(rustfsPublicEndpoint);
const rustfsBuckets = [
  process.env.RUSTFS_BUCKET,
  process.env.RUSTFS_LEGACY_BUCKET,
].filter((bucket): bucket is string => Boolean(bucket));

if (!rustfsBuckets.length) {
  throw new Error("Configure RUSTFS_BUCKET in the frontend environment.");
}

const nextConfig: NextConfig = {
  allowedDevOrigins: [rustfsUrl.hostname, "10.50.213.182"],

  images: {
    dangerouslyAllowLocalIP: ["localhost", "127.0.0.1", "::1"].includes(
      rustfsUrl.hostname,
    ),
    remotePatterns: rustfsBuckets.map((bucket) => ({
      protocol: rustfsUrl.protocol.slice(0, -1) as "http" | "https",
      hostname: rustfsUrl.hostname,
      port: rustfsUrl.port,
      pathname: `/${bucket}/**`,
    })),
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },
};

export default nextConfig;
