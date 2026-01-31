import { OAuth2Client } from 'google-auth-library';

// These variables are loaded from the environment.
// In local development, they come from .env.local.
// In Vercel, they are set in the project's Environment Variables settings.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/callback`;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  // This is a critical error for production builds or server-side rendering.
  console.error("FATAL: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET are not defined in environment variables.");
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
