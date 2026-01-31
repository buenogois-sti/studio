import type { NextAuthOptions, User, Account, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';
import { firestoreAdmin } from '@/firebase/admin';

// --- Environment Variable Validation ---
// Ensure that the required environment variables are set.
// If not, throw an error at server start-up for clear debugging.
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!googleClientId || !googleClientSecret) {
  throw new Error('CRITICAL_ERROR: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables. Please check your .env.local or deployment settings.');
}

if (!nextAuthSecret) {
    throw new Error('CRITICAL_ERROR: Missing NEXTAUTH_SECRET environment variable. Please check your .env.local or deployment settings.');
}
// --- End Validation ---

async function refreshAccessToken(token: JWT): Promise<JWT> {
    try {
        if (!token.refreshToken) {
            throw new Error("Missing refresh token");
        }

        const url = "https://oauth2.googleapis.com/token?" + new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
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
            // The refresh token might be updated by Google, so we persist the new one if it exists.
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
            clientId: googleClientId,
            clientSecret: googleClientSecret,
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
    secret: nextAuthSecret,
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
            // Initial sign in: Persist account details to the JWT.
            if (account && user) {
                token.id = user.id;
                token.accessToken = account.access_token;
                token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
                // A refresh token is only sent on the first authorization. We must persist it.
                if (account.refresh_token) {
                    token.refreshToken = account.refresh_token;
                }
                // Also persist user details for convenience
                token.name = user.name;
                token.email = user.email;
                token.picture = user.image;
                return token;
            }

            // On subsequent requests, the token from the cookie is passed in.
            // If the access token has not expired yet, return it.
            if (Date.now() < (token.accessTokenExpires ?? 0)) {
                return token;
            }

            // Access token has expired, try to refresh it using the refresh token.
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
