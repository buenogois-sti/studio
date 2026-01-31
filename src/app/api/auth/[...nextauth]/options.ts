import type { NextAuthOptions, User, Account, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';
import { firestoreAdmin } from '@/firebase/admin';

async function refreshAccessToken(token: JWT): Promise<JWT> {
    try {
        if (!token.refreshToken) {
            throw new Error("Missing refresh token");
        }

        const url = "https://oauth2.googleapis.com/token?" + new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken,
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
        return { 
            ...token, 
            error: "RefreshAccessTokenError" 
        };
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
            try {
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
            } catch(error) {
                console.error("SignIn Callback Firestore Error:", error);
                return false; // Prevent sign in on DB error
            }

            return true;
        },
        async jwt({ token, user, account }: { token: JWT, user?: User, account?: Account | null }): Promise<JWT> {
            // Initial sign in
            if (account && user) {
                return {
                    id: user.id,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    accessTokenExpires: account.expires_at ? account.expires_at * 1000 : undefined,
                    name: user.name,
                    email: user.email,
                    picture: user.image,
                }
            }

            // Return previous token if the access token has not expired yet
            if (Date.now() < (token.accessTokenExpires ?? 0)) {
                return token;
            }

            // Access token has expired, try to update it.
            return refreshAccessToken(token);
        },
        async session({ session, token }: { session: Session, token: JWT }) {
            session.user.id = token.id;
            session.accessToken = token.accessToken;
            session.error = token.error;
            return session;
        },
    },
};
