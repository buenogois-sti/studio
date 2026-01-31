import { NextRequest, NextResponse } from 'next/server';
import { oauth2Client, GOOGLE_DRIVE_SCOPES } from '@/lib/google-auth';

export async function GET(req: NextRequest) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Important to get a refresh token
    scope: GOOGLE_DRIVE_SCOPES,
    prompt: 'consent', // Force consent screen to ensure a refresh token is always granted
  });

  return NextResponse.redirect(authUrl);
}
