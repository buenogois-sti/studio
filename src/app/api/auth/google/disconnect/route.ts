import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { firestoreAdmin, authAdmin } from '@/firebase/admin';
import { oauth2Client } from '@/lib/google-auth';

export async function GET(req: NextRequest) {
  const sessionCookie = cookies().get('__session')?.value || '';
  const errorUrl = new URL('/dashboard/configuracoes', req.url);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login?error=no_session', req.url));
  }

  try {
    const decodedIdToken = await authAdmin.verifySessionCookie(sessionCookie, true);
    const userId = decodedIdToken.uid;
    const userDocRef = firestoreAdmin.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    const userData = userDoc.data();
    const refreshToken = userData?.googleRefreshToken;

    if (refreshToken) {
      // Revoke the token on Google's side
      try {
        await oauth2Client.revokeToken(refreshToken);
        console.log(`Successfully revoked token for user ${userId}`);
      } catch (revokeError: any) {
        // Log the error but continue with cleanup, as the token might be already invalid.
        console.error(`Failed to revoke Google token for user ${userId}:`, revokeError.message);
      }
    }
    
    // Remove the token from Firestore
    await userDocRef.update({
      googleRefreshToken: firestoreAdmin.FieldValue.delete(),
      updatedAt: firestoreAdmin.FieldValue.serverTimestamp(),
    });

    const successUrl = new URL('/dashboard/configuracoes', req.url);
    successUrl.searchParams.set('success', 'google_disconnected');
    return NextResponse.redirect(successUrl);

  } catch (error: any) {
    console.error('Error during Google disconnect:', error);
    errorUrl.searchParams.set('error', 'disconnect_failed');
    errorUrl.searchParams.set('message', error.message);
    return NextResponse.redirect(errorUrl);
  }
}
