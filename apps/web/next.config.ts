import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bidmarket/api", "@bidmarket/shared"],
  serverExternalPackages: [
    "fastify",
    "@fastify/cors",
    "@fastify/multipart",
    "@fastify/static",
  ],
  typescript: {
    // Next.js typed-routes validator uses incorrect paths with src/app layout.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
