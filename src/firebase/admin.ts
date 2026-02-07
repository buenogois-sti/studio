
import admin from 'firebase-admin';
import { firebaseConfig } from './config';

let initialized = false;
export let firebaseAdminInitializationError: string | null = null;

if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      // Validação Crítica de Project ID
      if (serviceAccount.project_id !== firebaseConfig.projectId) {
        const error = `❌ PROJECT ID MISMATCH: O servidor está tentando usar o projeto '${serviceAccount.project_id}' mas o cliente espera '${firebaseConfig.projectId}'. Isso causará erro 400 (auth/invalid-custom-token) no login.`;
        console.error('[Firebase Admin]', error);
        // Não lançamos erro aqui para não quebrar o build, mas o erro de login será inevitável.
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log(`[Firebase Admin] ✅ Inicializado com sucesso para o projeto: ${serviceAccount.project_id}`);
      initialized = true;
    } else {
      console.warn('[Firebase Admin] ⚠️ FIREBASE_SERVICE_ACCOUNT_JSON não configurado. Tentando ADC...');
      admin.initializeApp();
      initialized = true;
    }
  } catch (error: any) {
    firebaseAdminInitializationError = error.message;
    console.error('[Firebase Admin] ❌ Falha na inicialização do SDK Admin:', error.message);
  }
} else {
  initialized = true;
}

export const firebaseAdmin = initialized ? admin : null;
export const firestoreAdmin = initialized ? admin.firestore() : null;
export const authAdmin = initialized ? admin.auth() : null;
