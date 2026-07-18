/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for DigitalOcean App Platform Node.js runtime.
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@stawi/core'],
  images: {
    remotePatterns: [
      // Add your DO Spaces CDN hostname here, e.g.
      // { protocol: 'https', hostname: 'stawi.fra1.cdn.digitaloceanspaces.com' },
    ],
  },
};

export default nextConfig;
