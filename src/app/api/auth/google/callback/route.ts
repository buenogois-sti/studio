import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { firestoreAdmin, authAdmin } from '@/firebase/admin';
import { oauth2Client } from '@/lib/google-auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const sessionCookie = cookies().get('__session')?.value || '';

  const errorUrl = new URL('/dashboard/configuracoes', req.url);

  if (!code) {
    errorUrl.searchParams.set('error', 'missing_code');
    return NextResponse.redirect(errorUrl);
  }

  if (!sessionCookie) {
    // This can happen if the user is not logged into Firebase on the client.
    return NextResponse.redirect(new URL('/login?error=no_session', req.url));
  }

  try {
    const decodedIdToken = await authAdmin.verifySessionCookie(sessionCookie, true);
    const userId = decodedIdToken.uid;

    const { tokens } = await oauth2Client.getToken(code);

    const userDocRef = firestoreAdmin.collection('users').doc(userId);

    const userDataToUpdate: { googleRefreshToken?: string; updatedAt: FirebaseFirestore.FieldValue } = {
      updatedAt: firestoreAdmin.FieldValue.serverTimestamp(),
    };

    if (tokens.refresh_token) {
      userDataToUpdate.googleRefreshToken = tokens.refresh_token;
    } else {
        // This can happen if the user has already granted consent and is not prompted again.
        // The 'prompt: consent' in the redirect URL is designed to prevent this, 
        // but we log a warning just in case. The existing token should still be valid.
        console.warn('Refresh token not received from Google. User might have already consented.');
    }

    // Only write to the DB if we received a new refresh token
    if (userDataToUpdate.googleRefreshToken) {
        await userDocRef.set(userDataToUpdate, { merge: true });
    }

    const successUrl = new URL('/dashboard/configuracoes', req.url);
    successUrl.searchParams.set('success', 'google_connected');
    return NextResponse.redirect(successUrl);

  } catch (error: any) {
    console.error('Error during Google OAuth callback:', error);
    errorUrl.searchParams.set('error', 'auth_failed');
    errorUrl.searchParams.set('message', error.message);
    return NextResponse.redirect(errorUrl);
  }
}
