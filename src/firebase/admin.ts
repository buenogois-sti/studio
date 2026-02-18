
import admin from 'firebase-admin';
import { firebaseConfig } from './config';

let initialized = false;
export let firebaseAdminInitializationError: string | null = null;

if (!admin.apps.length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      // Limpeza de Project ID para evitar erros de caractere invisível
      const serviceProjectId = serviceAccount.project_id?.trim();
      const configProjectId = firebaseConfig.projectId?.trim();

      console.log(`[Firebase Admin] 🔍 Analisando credenciais...`);
      console.log(`[Firebase Admin] JSON Project ID: "${serviceProjectId}"`);
      console.log(`[Firebase Admin] Config Project ID: "${configProjectId}"`);

      // Validação Crítica de Project ID
      if (serviceProjectId !== configProjectId) {
        console.error(`[Firebase Admin] ❌ PROJECT ID MISMATCH DETECTED!`);
        console.error(`[Firebase Admin] Token será assinado para '${serviceProjectId}' mas o cliente espera '${configProjectId}'.`);
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
