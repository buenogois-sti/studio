import admin from 'firebase-admin';
import { firebaseConfig } from './config';

let initialized = false;
export let firebaseAdminInitializationError: string | null = null;

if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      console.log(`[Firebase Admin] 🔍 Tentando inicializar...`);
      console.log(`[Firebase Admin] JSON Project ID: "${serviceAccount.project_id}"`);
      console.log(`[Firebase Admin] Config Project ID: "${firebaseConfig.projectId}"`);

      // Validação Crítica de Project ID
      if (serviceAccount.project_id !== firebaseConfig.projectId) {
        console.error(`[Firebase Admin] ❌ PROJECT ID MISMATCH: O servidor está configurado para o projeto '${serviceAccount.project_id}' mas o cliente espera '${firebaseConfig.projectId}'. O login vai falhar.`);
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      
      console.log(`[Firebase Admin] ✅ Inicializado com sucesso para: ${serviceAccount.project_id}`);
      initialized = true;
    } else {
      console.warn('[Firebase Admin] ⚠️ FIREBASE_SERVICE_ACCOUNT_JSON não configurado no .env.local');
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
