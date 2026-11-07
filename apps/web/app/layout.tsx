import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Stawi — Save · Grow · Thrive',
  description:
    'One trusted platform for every savings group, entrepreneur and enterprise — group records and contributions, minutes, month-end statements, business matching and professional-grade accounting, adapted to your currency, language, tax and registration rules.',
  applicationName: 'Stawi',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'Stawi', statusBarStyle: 'default' },
  openGraph: {
    title: 'Stawi — Save · Grow · Thrive',
    description:
      'Save together. Grow together. Thrive. Group records & contributions, business matching, and accounting & compliance — one platform for your chama.',
    siteName: 'Stawi',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#1f4d3a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
