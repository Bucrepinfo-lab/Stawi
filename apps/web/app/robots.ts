import type { MetadataRoute } from 'next';

const SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://getstawi.com').replace(/\/$/, '');

/** Google may read the public pages; group records, books and APIs stay out of search (owner 26/11/26). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/subscribe', '/sign-up', '/terms', '/privacy', '/delete-account'],
        disallow: ['/api/', '/dashboard', '/groups', '/books', '/business', '/messages', '/account', '/admin', '/pin', '/receipt', '/sacco'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
