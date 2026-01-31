
import admin from 'firebase-admin';

let initialized = false;

// This file initializes the Firebase Admin SDK for server-side operations.
// It ensures initialization happens only once.

if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      // --- Initialize with Service Account from environment variable ---
      console.log("Initializing Firebase Admin with Service Account from environment variable.");
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
    } else {
      // --- Initialize with Application Default Credentials (ADC) ---
      // This is the default for many cloud environments like Firebase App Hosting.
      console.log("Initializing Firebase Admin with Application Default Credentials (ADC). No service account JSON found.");
      admin.initializeApp();
      initialized = true;
    }
  } catch (error: any) {
    // --- Log a detailed error if initialization fails but DO NOT THROW ---
    let errorMessage = 'CRITICAL_ERROR: Firebase Admin SDK initialization failed. ';

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      errorMessage += 'This likely means the `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable is malformed or has incorrect permissions. ';
    } else {
      errorMessage += 'This likely means Application Default Credentials (ADC) are not configured correctly in your server environment, or the `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable is missing. ';
    }

    errorMessage += `Original error: ${error.message}`;

    console.error(errorMessage);
    // The 'initialized' flag remains false.
  }
} else {
  initialized = true;
}

// Export the admin instance and services, which will be null if initialization failed.
// Code using these exports MUST check for their existence before use.
export const firebaseAdmin = initialized ? admin : null;
export const firestoreAdmin = initialized ? admin.firestore() : null;
export const authAdmin = initialized ? admin.auth() : null;
