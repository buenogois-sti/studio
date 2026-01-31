import { OAuth2Client } from 'google-auth-library';

// =================================================================================
// NOTE: The credentials below have been hardcoded for development convenience
// based on the user's provided JSON. For a production environment, these should
// be managed securely through environment variables.
// =================================================================================

const GOOGLE_CLIENT_ID = "1052927104977-t77npqdjgl938qgcrmnmih626gqrkrpa.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";
const GOOGLE_REDIRECT_URI = 'http://localhost:9002/api/auth/google/callback';

export const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
];
