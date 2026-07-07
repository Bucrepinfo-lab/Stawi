import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stawi — save together, grow together',
  description:
    'From the merry-go-round to a registered group to a real business — table banking, business matching, and accounting in one platform. Mobile-first, M-Pesa-native.',
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
