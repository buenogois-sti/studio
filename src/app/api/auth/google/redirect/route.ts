import { NextRequest, NextResponse } from 'next/server';
import { oauth2Client, GOOGLE_DRIVE_SCOPES } from '@/lib/google-auth';

export async function GET(req: NextRequest) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Important to get a refresh token
    scope: GOOGLE_DRIVE_SCOPES,
    // By adding 'consent', we force Google to show the consent screen
    // and issue a new refresh token, which can fix invalid_grant errors.
    prompt: 'consent',
  });

  return NextResponse.redirect(authUrl);
}
