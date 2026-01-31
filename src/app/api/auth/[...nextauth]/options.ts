import type { NextAuthOptions, User, Account } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';
import { firestoreAdmin } from '@/firebase/admin';

interface Token extends JWT {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  id?: string;
  error?: string;
}

async function refreshAccessToken(token: Token): Promise<Token> {
    try {
        const url = "https://oauth2.googleapis.com/token?" + new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken!,
        });

        const response = await fetch(url, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            method: "POST",
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            throw refreshedTokens;
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        };
    } catch (error) {
        console.error("Error refreshing access token", error);
        return { ...token, error: "RefreshAccessTokenError" };
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: 'consent',
                    access_type: 'offline',
                    response_type: 'code',
                    scope: 'openid email profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
                },
            },
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async signIn({ user, account }: { user: User, account: Account | null }) {
            if (!user.email || !user.id) {
                return false;
            }

            const userRef = firestoreAdmin.collection('users').doc(user.id);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                const [firstName, ...lastNameParts] = user.name?.split(' ') ?? ['', ''];
                const newUserProfile = {
                    id: user.id,
                    googleId: user.id,
                    email: user.email,
                    firstName: firstName,
                    lastName: lastNameParts.join(' '),
                    role: 'admin', // First user is always an admin
                    createdAt: firestoreAdmin.FieldValue.serverTimestamp(),
                    updatedAt: firestoreAdmin.FieldValue.serverTimestamp(),
                };
                await userRef.set(newUserProfile);
            }

            return true;
        },
        async jwt({ token, user, account }: { token: JWT, user?: User, account?: Account | null }): Promise<JWT> {
            const tokenAsToken = token as Token;
            
            if (account && user) {
                tokenAsToken.accessToken = account.access_token;
                tokenAsToken.refreshToken = account.refresh_token;
                tokenAsToken.accessTokenExpires = Date.now() + (account.expires_in as number) * 1000;
                tokenAsToken.id = user.id;
                return tokenAsToken;
            }

            if (Date.now() < (tokenAsToken.accessTokenExpires ?? 0)) {
                return tokenAsToken;
            }

            return refreshAccessToken(tokenAsToken);
        },
        async session({ session, token }: { session: any, token: JWT }) {
            if (session.user) {
                session.user.id = token.sub;
            }
            session.accessToken = (token as Token).accessToken;
            session.error = (token as Token).error;
            return session;
        },
    },
};
