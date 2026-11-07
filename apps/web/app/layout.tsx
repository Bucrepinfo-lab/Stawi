import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stawi — Save · Grow · Thrive',
  description:
    'One trusted platform for every savings group, entrepreneur and enterprise — group records and contributions, minutes, month-end statements, business matching and professional-grade accounting, adapted to your currency, language, tax and registration rules.',
  applicationName: 'Stawi',
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
      <body>{children}</body>
    </html>
  );
}
