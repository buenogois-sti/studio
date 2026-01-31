import type { DefaultSession } from 'next-auth';
import type { UserRole } from './types';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    error?: string;
    user: {
      id: string;
      role?: UserRole;
    } & DefaultSession['user'];
    customToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    id: string;
    error?: string;
    role?: UserRole;
    customToken?: string;
  }
}
