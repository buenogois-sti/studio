'use client';
import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeProvider } from '@/hooks/use-theme';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <FirebaseClientProvider>{children}</FirebaseClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
