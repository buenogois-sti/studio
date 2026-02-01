
import type { NextAuthOptions, User, Account, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';
import { firebaseAdmin, firestoreAdmin, authAdmin } from '@/firebase/admin';
import type { UserProfile, UserRole } from '@/lib/types';

// --- Environment Variable Validation ---
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

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the original token and an error property
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
    try {
        if (!token.id) throw new Error("Token is missing user ID.");

        const userDoc = await firestoreAdmin?.collection('users').doc(token.id).get();
        if (!userDoc?.exists) throw new Error("User not found in database for token refresh.");

        const userProfile = userDoc.data();
        if (!userProfile?.googleRefreshToken) {
            throw new Error("Missing Google refresh token in database.");
        }

        const url = "https://oauth2.googleapis.com/token";
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: googleClientId,
                client_secret: googleClientSecret,
                grant_type: "refresh_token",
                refresh_token: userProfile.googleRefreshToken,
            }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            console.error("Failed to refresh access token, Google API responded with:", refreshedTokens);
            // If refresh fails (e.g., token revoked), clear it from our DB to prevent retries.
            await firestoreAdmin?.collection('users').doc(token.id).update({
                googleRefreshToken: firebaseAdmin.firestore.FieldValue.delete()
            });
            throw new Error("RefreshAccessTokenError");
        }

        console.log("Successfully refreshed access token.");
        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
            // Keep the existing refresh token, as it's usually long-lived
        };
    } catch (error) {
        console.error("Error refreshing access token:", error);
        return {
            ...token,
            error: "RefreshAccessTokenError",
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
                    scope: 'openid email profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar',
                },
            },
        }),
    ],
    secret: nextAuthSecret,
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async signIn({ user, account }) {
            // The signIn callback is used for access control.
            // We allow sign-in and handle user creation in the jwt callback.
            if (!user.email || !user.id) {
                console.error("SignIn rejected: Missing user email or id from Google.");
                return false;
            }
            return true;
        },

        async jwt({ token, user, account }) {
            // Guard clause to ensure Firebase Admin is initialized
            if (!firestoreAdmin || !authAdmin) {
                console.error("CRITICAL_ERROR: Firebase Admin SDK is not initialized. Cannot access Firestore or Auth.");
                token.error = "DatabaseError";
                return token;
            }
            const db = firestoreAdmin;

            // This block runs only on initial sign-in
            if (account && user) {
                try {
                    const userRef = db.collection('users').doc(user.id);
                    const userDoc = await userRef.get();
                    let role: UserRole = 'lawyer';

                    if (!userDoc.exists) {
                        const usersCollection = db.collection('users');
                        const existingUsersSnapshot = await usersCollection.limit(1).get();
                        
                        if (existingUsersSnapshot.empty) {
                            role = 'admin'; // First user is an admin
                        }

                        const [firstName, ...lastNameParts] = user.name?.split(' ') ?? ['', ''];
                        await userRef.set({
                            id: user.id,
                            googleId: user.id,
                            email: user.email,
                            firstName: firstName,
                            lastName: lastNameParts.join(' '),
                            role: role,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            ...(account.refresh_token && { googleRefreshToken: account.refresh_token }),
                        });
                    } else {
                        // User exists, just update the refresh token if a new one is provided.
                        const existingData = userDoc.data() as UserProfile;
                        role = existingData.role;
                        if (account.refresh_token) {
                            await userRef.update({
                                googleRefreshToken: account.refresh_token,
                                updatedAt: new Date(),
                            });
                        }
                    }

                    // Populate the token with essential info
                    token.id = user.id;
                    token.role = role;
                    token.accessToken = account.access_token;
                    token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : Date.now() + (account.expires_in ?? 3600) * 1000;
                    token.customToken = await authAdmin.createCustomToken(user.id, { role });

                } catch (error) {
                    console.error("JWT Callback Firestore Error:", error);
                    token.error = "DatabaseError";
                }
                return token;
            }

            // For subsequent requests, return the token if it's still valid
            if (Date.now() < (token.accessTokenExpires ?? 0)) {
                return token;
            }

            // If the token is expired, try to refresh it
            return refreshAccessToken(token);
        },

        async session({ session, token }) {
            // Pass info from the JWT to the client-side session
            if (token) {
                session.user.id = token.id;
                if (token.role) {
                    // @ts-ignore
                    session.user.role = token.role;
                }
                session.accessToken = token.accessToken;
                session.error = token.error;
                session.customToken = token.customToken;
            }
            return session;
        },
    },
    pages: {
        error: '/login', // Redirect to login page on error
    }
};
