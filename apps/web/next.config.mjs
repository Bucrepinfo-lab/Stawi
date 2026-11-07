import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone server for the Fly.io Docker image (see /Dockerfile).
  output: 'standalone',
  reactStrictMode: true,
  // Pin the monorepo root so Next never infers a stray parent directory
  // (e.g. a package-lock.json in the user's home folder) as the workspace
  // root — that pulls in a second React copy and breaks prerender.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@stawi/core', '@stawi/db'],
  images: {
    remotePatterns: [
      // Add an object-storage/CDN hostname here when receipts move off-box.
    ],
  },
};

export default nextConfig;
