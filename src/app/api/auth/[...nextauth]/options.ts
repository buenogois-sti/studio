import type { NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';
import { firestoreAdmin, authAdmin, firebaseAdminInitializationError } from '@/firebase/admin';
import type { UserProfile, UserRole } from '@/lib/types';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!googleClientId || !googleClientSecret) {
  throw new Error('CRITICAL_ERROR: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.');
}
if (!nextAuthSecret) {
    throw new Error('CRITICAL_ERROR: Missing NEXTAUTH_SECRET variable.');
}

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
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: googleClientId!,
                client_secret: googleClientSecret!,
                grant_type: "refresh_token",
                refresh_token: userProfile.googleRefreshToken,
            }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            console.error("Failed to refresh access token:", refreshedTokens);
            throw new Error("RefreshAccessTokenError");
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
        };
    } catch (error) {
        console.error("Error refreshing access token:", error);
        return { ...token, error: "RefreshAccessTokenError" };
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            authorization: {
                params: {
                    prompt: 'select_account',
                    access_type: 'offline',
                    response_type: 'code',
                    scope: 'openid email profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar',
                },
            },
        }),
    ],
    secret: nextAuthSecret,
    session: { strategy: 'jwt' },
    callbacks: {
        async signIn({ user }) {
            return !!(user.email && user.id);
        },
        async jwt({ token, user, account }) {
            if (firebaseAdminInitializationError) {
                token.error = `ServerConfigError: ${firebaseAdminInitializationError}`;
                return token;
            }
            if (!firestoreAdmin || !authAdmin) {
                token.error = "DatabaseError";
                return token;
            }
            const db = firestoreAdmin;

            if (account && user && user.email) {
                try {
                    const userRef = db.collection('users').doc(user.id);
                    const userDoc = await userRef.get();
                    let role: UserRole = 'lawyer';

                    if (!userDoc.exists) {
                        const existingUsersSnapshot = await db.collection('users').limit(1).get();
                        if (existingUsersSnapshot.empty) {
                            role = 'admin';
                        } else {
                            const userRoleDoc = await db.collection('user_roles').doc(user.email).get();
                            if (userRoleDoc.exists) {
                                role = (userRoleDoc.data()?.role as UserRole) || 'lawyer';
                            }
                        }

                        const [firstName, ...lastNameParts] = user.name?.split(' ') ?? ['', ''];
                        await userRef.set({
                            id: user.id,
                            googleId: user.id,
                            email: user.email,
                            firstName,
                            lastName: lastNameParts.join(' '),
                            role,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            ...(account.refresh_token && { googleRefreshToken: account.refresh_token }),
                        });
                    } else {
                        const existingData = userDoc.data() as UserProfile;
                        role = existingData.role;
                        if (account.refresh_token) {
                            await userRef.update({
                                googleRefreshToken: account.refresh_token,
                                updatedAt: new Date(),
                            });
                        }
                    }

                    token.id = user.id;
                    token.role = role;
                    token.accessToken = account.access_token;
                    const expiresIn = Number(account.expires_in || 3600);
                    token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : Date.now() + (expiresIn * 1000);
                    token.customToken = await authAdmin.createCustomToken(user.id, { role });
                } catch (error) {
                    console.error("JWT Callback Error:", error);
                    token.error = "DatabaseError";
                }
                return token;
            }

            if (Date.now() < (token.accessTokenExpires ?? 0)) {
                return token;
            }
            return refreshAccessToken(token);
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                if (token.role) session.user.role = token.role;
                session.accessToken = token.accessToken;
                session.error = token.error;
                session.customToken = token.customToken;
            }
            return session;
        },
    },
    pages: { error: '/login' }
};