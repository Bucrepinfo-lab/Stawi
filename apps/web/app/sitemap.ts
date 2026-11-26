import type { MetadataRoute } from 'next';

const SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://getstawi.com').replace(/\/$/, '');

/** Public pages only (owner 26/11/26: be seen by Google). */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/subscribe`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/sign-up`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE}/delete-account`, lastModified: now, changeFrequency: 'monthly', priority: 0.2 },
  ];
}
