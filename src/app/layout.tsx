
import type {Metadata} from 'next';
import {Toaster} from '@/components/ui/toaster';
import './globals.css';
import { Providers } from './providers';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { PWARegistration } from '@/components/pwa/PWARegistration';

export const metadata: Metadata = {
  title: 'Bueno Gois Advogados e Associados',
  description: 'Plataforma de gestão para escritórios de advocacia.',
  manifest: '/manifest.json',
  themeColor: '#F5D030',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bueno Gois',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
      </head>
      <body className="font-body antialiased bg-background">
        <Providers>
          {children}
        </Providers>
        <PWARegistration />
        <Toaster />
        <SpeedInsights />
      </body>
    </html>
  );
}
