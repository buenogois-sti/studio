import { OAuth2Client } from 'google-auth-library';

// Hardcoding credentials to resolve environment variable loading issues.
// This is for debugging and development only. For production, use environment variables.
const GOOGLE_CLIENT_ID = "1052927104977-t77npqdjgl938qgcrmnmih626gqrkrpa.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";
const GOOGLE_REDIRECT_URI = "http://localhost:9002/api/auth/google/callback";

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  // This check is now redundant but safe to keep.
  console.error("FATAL: GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET não estão definidos no código. Isso é um erro crítico.");
} else {
    console.log("google-auth.ts: Usando credenciais definidas no código. Client ID:", GOOGLE_CLIENT_ID ? 'CONFIGURADO' : 'NÃO DEFINIDO');
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
