import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'BOND — AI finds the connection',
  description:
    'BOND is an AI dating app with no swipe and no pre-date chat. AI builds a deep compatibility profile, proposes a few well-matched people, explains why, and helps you agree on a real date.',
  applicationName: 'BOND',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'BOND' },
};

export const viewport: Viewport = {
  themeColor: '#060816',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
