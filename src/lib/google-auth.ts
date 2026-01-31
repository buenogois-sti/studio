import { OAuth2Client } from 'google-auth-library';

// These variables are loaded from the environment.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Dynamically determine the base URL.
// In production on Vercel, it uses the NEXT_PUBLIC_BASE_URL environment variable.
// In local development, it defaults to http://localhost:9002.
const baseUrl = process.env.NODE_ENV === 'production'
  ? process.env.NEXT_PUBLIC_BASE_URL
  : 'http://localhost:9002';

const GOOGLE_REDIRECT_URI = `${baseUrl}/api/auth/google/callback`;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error("FATAL: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET are not defined in environment variables.");
}

if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_BASE_URL) {
    console.error("FATAL: NEXT_PUBLIC_BASE_URL is not set for the production environment.");
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
