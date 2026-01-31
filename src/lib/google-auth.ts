import { OAuth2Client } from 'google-auth-library';

// =================================================================================
// IMPORTANT: ACTION REQUIRED
// =================================================================================
// 1. Create an OAuth 2.0 Client ID in your Google Cloud Console.
// 2. Set the following environment variables in a .env.local file in your project root.
//
// .env.local file:
// GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
// GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
// NEXT_PUBLIC_BASE_URL="http://localhost:9002"
//
// The redirect URI must be added to the "Authorized redirect URIs" in your
// Google Cloud OAuth 2.0 Client ID settings.
// =================================================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`
  : 'http://localhost:9002/api/auth/google/callback';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    // This check runs on the server, so it's safe.
    console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables.");
}

export const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
];
