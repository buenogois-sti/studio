
import admin from 'firebase-admin';
import { firebaseConfig } from './config';

let initialized = false;
export let firebaseAdminInitializationError: string | null = null;

if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      const serviceProjectId = serviceAccount.project_id?.trim();
      const configProjectId = firebaseConfig.projectId?.trim();

      console.log(`[Firebase Admin] 🔍 Analisando credenciais...`);
      console.log(`[Firebase Admin] JSON Project ID: "${serviceProjectId}"`);
      console.log(`[Firebase Admin] Config Project ID: "${configProjectId}"`);

      if (serviceProjectId !== configProjectId) {
        console.error(`[Firebase Admin] ❌ CRITICAL PROJECT ID MISMATCH!`);
        console.error(`[Firebase Admin] Token is being signed for project '${serviceProjectId}' but browser config expects '${configProjectId}'.`);
        console.error(`[Firebase Admin] SOLUTION: Update FIREBASE_SERVICE_ACCOUNT_JSON with credentials for '${configProjectId}'.`);
        
        // Em desenvolvimento local, lançamos erro explícito para não deixar passar
        if (process.env.NODE_ENV === 'development') {
          throw new Error(`Project ID Mismatch: Server="${serviceProjectId}", Client="${configProjectId}"`);
        }
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      
      console.log(`[Firebase Admin] ✅ Inicializado com sucesso para: ${serviceProjectId}`);
      initialized = true;
    } else {
      console.warn('[Firebase Admin] ⚠️ FIREBASE_SERVICE_ACCOUNT_JSON não configurado no ambiente');
      admin.initializeApp();
      initialized = true;
    }
  } catch (error: any) {
    firebaseAdminInitializationError = error.message;
    console.error('[Firebase Admin] ❌ Erro fatal na inicialização:', error.message);
  }
} else {
  initialized = true;
}

export const firebaseAdmin = initialized ? admin : null;
export const firestoreAdmin = initialized ? admin.firestore() : null;
export const authAdmin = initialized ? admin.auth() : null;
