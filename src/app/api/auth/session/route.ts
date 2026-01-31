import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authAdmin } from '@/firebase/admin';

// Creates a server-side session cookie from a client-side ID token.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = body.idToken;

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    // Set session expiration to 5 days.
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });
    
    const options = {
      name: '__session',
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
    };
    
    // Set cookie on the browser.
    cookies().set(options);

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('Session login error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// Clears the server-side session cookie.
export async function DELETE(request: NextRequest) {
  try {
    cookies().delete('__session');
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Session logout error:', error);
    return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
  }
}
