import { OAuth2Client } from 'google-auth-library';

// These variables are loaded from the environment.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Dynamically determine the base URL.
let baseUrl: string;

if (process.env.NODE_ENV === 'production') {
  let prodUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!prodUrl) {
    console.error("FATAL: NEXT_PUBLIC_BASE_URL is not set for the production environment.");
    prodUrl = ''; // Failsafe to avoid crashing the server. Auth will fail.
  }
  // Ensure the production URL has a protocol, defaulting to https.
  if (!prodUrl.startsWith('http')) {
    baseUrl = `https://${prodUrl}`;
  } else {
    baseUrl = prodUrl;
  }
} else {
  // Local development always uses http://localhost:9002
  baseUrl = 'http://localhost:9002';
}


const GOOGLE_REDIRECT_URI = `${baseUrl}/api/auth/google/callback`;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  // This check is important for both local and production.
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
