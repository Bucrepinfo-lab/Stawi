import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Resolve THE single React/ReactDOM instance as seen from apps/web, wherever
// npm physically placed it (hoisted root or nested). Aliasing every import to
// these paths guarantees one React at runtime — the mixed-copy scenario is what
// crashes /_error prerender with "Cannot read properties of null (useContext)".
const reactPath = path.dirname(require.resolve('react/package.json'));
const reactDomPath = path.dirname(require.resolve('react-dom/package.json'));

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
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: reactPath,
      'react-dom': reactDomPath,
    };
    return config;
  },
};

export default nextConfig;
