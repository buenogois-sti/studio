
import admin from 'firebase-admin';

// This file initializes the Firebase Admin SDK for server-side operations.

// --- Check if already initialized ---
if (!admin.apps.length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  try {
    if (serviceAccountJson) {
      // --- Initialize with Service Account from environment variable ---
      console.log("Initializing Firebase Admin with Service Account from environment variable.");
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // --- Initialize with Application Default Credentials (ADC) ---
      // This is the default for many cloud environments like Firebase App Hosting.
      console.log("Initializing Firebase Admin with Application Default Credentials (ADC). No service account JSON found.");
      admin.initializeApp();
    }
  } catch (error: any) {
    // --- Throw a detailed error if initialization fails ---
    let errorMessage = 'CRITICAL_ERROR: Firebase Admin SDK initialization failed. ';

    if (serviceAccountJson) {
      errorMessage += 'This likely means the `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable is malformed or has incorrect permissions. ';
    } else {
      errorMessage += 'This likely means Application Default Credentials (ADC) are not configured correctly in your server environment, or the `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable is missing. ';
    }

    errorMessage += `Original error: ${error.message}`;

    console.error(errorMessage);
    
    // We throw the error to halt execution (e.g., crash the build or API route)
    // to make it clear that the server is not configured correctly.
    // Silently failing leads to confusing downstream errors like 'Failed to fetch'.
    throw new Error(errorMessage);
  }
}

export const firebaseAdmin = admin;
// We can now assume that if this code runs, initialization was successful.
export const firestoreAdmin = admin.firestore();
export const authAdmin = admin.auth();
