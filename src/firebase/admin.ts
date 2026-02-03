
import admin from 'firebase-admin';
import { firebaseConfig } from './config';

let initialized = false;
export let firebaseAdminInitializationError: string | null = null;

// This file initializes the Firebase Admin SDK for server-side operations.
// It ensures initialization happens only once.

if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      console.log("Initializing Firebase Admin with Service Account from environment variable.");
      const serviceAccount = JSON.parse(serviceAccountJson);

      // Validate Project ID consistency to prevent auth/invalid-custom-token
      if (serviceAccount.project_id !== firebaseConfig.projectId) {
        throw new Error(`CRITICAL_CONFIG_ERROR: Project ID mismatch. Server: '${serviceAccount.project_id}' vs Client: '${firebaseConfig.projectId}'. Check your FIREBASE_SERVICE_ACCOUNT_JSON.`);
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
    } else {
      console.log("Initializing Firebase Admin with Application Default Credentials (ADC).");
      admin.initializeApp();
      
      const adminProjectId = admin.app().options.projectId;
      if (adminProjectId && adminProjectId !== firebaseConfig.projectId) {
        throw new Error(`CRITICAL_CONFIG_ERROR: Project ID mismatch in ADC. Server: '${adminProjectId}' vs Client: '${firebaseConfig.projectId}'.`);
      }

      initialized = true;
    }
  } catch (error: any) {
    firebaseAdminInitializationError = error.message;
    console.error('Firebase Admin SDK initialization failed:', error.message);
  }
} else {
  initialized = true;
}

export const firebaseAdmin = initialized ? admin : null;
export const firestoreAdmin = initialized ? admin.firestore() : null;
export const authAdmin = initialized ? admin.auth() : null;
