import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for DigitalOcean App Platform Node.js runtime.
  output: 'standalone',
  reactStrictMode: true,
  // Pin the monorepo root so Next never infers a stray parent directory
  // (e.g. a package-lock.json in the user's home folder) as the workspace
  // root — that pulls in a second React copy and breaks prerender.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@stawi/core', '@stawi/db'],
  images: {
    remotePatterns: [
      // Add your DO Spaces CDN hostname here, e.g.
      // { protocol: 'https', hostname: 'stawi.fra1.cdn.digitaloceanspaces.com' },
    ],
  },
};

export default nextConfig;
