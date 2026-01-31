
import admin from 'firebase-admin';

// This file initializes the Firebase Admin SDK.
// It handles different environments (Vercel, App Hosting, local) gracefully.

if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      // Environment with service account JSON (e.g., Vercel, or local with .env.local)
      console.log("Initializing Firebase Admin with Service Account JSON from environment variable.");
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Environment with Application Default Credentials (e.g., App Hosting, local gcloud)
      console.log("Initializing Firebase Admin with Application Default Credentials (ADC).");
      admin.initializeApp();
    }
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // Fallback for safety, might work in some environments
    if (!admin.apps.length) {
      admin.initializeApp();
    }
  }
}

export const firebaseAdmin = admin;
export const firestoreAdmin = admin.firestore();
export const authAdmin = admin.auth();
