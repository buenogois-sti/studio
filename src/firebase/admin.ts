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
      console.log("[Firebase Admin] Initializing with Service Account.");
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      // Critical check for Project ID Mismatch
      if (serviceAccount.project_id !== firebaseConfig.projectId) {
        const error = `❌ PROJECT ID MISMATCH: Server is using '${serviceAccount.project_id}' but Client expects '${firebaseConfig.projectId}'. This causes status 400 errors. Please update FIREBASE_SERVICE_ACCOUNT_JSON in .env.local with the correct key from project '${firebaseConfig.projectId}'.`;
        console.error('[Firebase Admin]', error);
        throw new Error(error);
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[Firebase Admin] ✅ Successfully initialized with project:', serviceAccount.project_id);
      initialized = true;
    } else {
      console.log('[Firebase Admin] Initializing with Application Default Credentials (ADC).');
      admin.initializeApp();
      
      const adminProjectId = admin.app().options.projectId;
      if (adminProjectId && adminProjectId !== firebaseConfig.projectId) {
        const error = `CRITICAL_CONFIG_ERROR: Project ID mismatch in ADC. Server: '${adminProjectId}' vs Client: '${firebaseConfig.projectId}'.`;
        console.error('[Firebase Admin]', error);
        throw new Error(error);
      }

      console.log('[Firebase Admin] ✅ Successfully initialized with ADC project:', adminProjectId);
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