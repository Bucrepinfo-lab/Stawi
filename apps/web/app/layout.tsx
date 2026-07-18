import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stawi — Save · Grow · Thrive',
  description:
    'One trusted platform for every savings group, entrepreneur and enterprise to save, borrow, trade and grow — group savings, business matching, professional-grade accounting, and full savings & credit, adapted to your currency, language, tax and registration rules.',
  applicationName: 'Stawi',
  openGraph: {
    title: 'Stawi — Save · Grow · Thrive',
    description:
      'Save together. Grow together. Thrive. Records & table banking, business matching, accounting & compliance, and savings & credit — one platform, any pillar, joinable directly.',
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
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
