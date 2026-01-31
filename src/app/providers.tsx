'use client';
import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { FirebaseClientProvider } from '@/firebase/client-provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <FirebaseClientProvider>{children}</FirebaseClientProvider>
    </SessionProvider>
  );
}
