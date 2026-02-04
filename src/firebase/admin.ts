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
      console.log("[Firebase Admin] Initializing with Service Account from environment variable.");
      const serviceAccount = JSON.parse(serviceAccountJson);
      
      console.log('[Firebase Admin] Service Account project_id:', serviceAccount.project_id);
      console.log('[Firebase Admin] Client config projectId:', firebaseConfig.projectId);

      // Validate Project ID consistency to prevent auth/invalid-custom-token
      if (serviceAccount.project_id !== firebaseConfig.projectId) {
        const error = `CRITICAL_CONFIG_ERROR: Project ID mismatch. Server: '${serviceAccount.project_id}' vs Client: '${firebaseConfig.projectId}'. Check your FIREBASE_SERVICE_ACCOUNT_JSON.`;
        console.error('[Firebase Admin]', error);
        
        console.error('\n' + '='.repeat(60));
        console.error('❌ ERRO CRÍTICO DE CONFIGURAÇÃO FIREBASE');
        console.error('SERVER ID:', serviceAccount.project_id);
        console.error('CLIENT ID:', firebaseConfig.projectId);
        console.error('AÇÃO: Baixe a chave JSON do projeto correto e atualize o .env.local');
        console.error('='.repeat(60) + '\n');
        
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
      console.log('[Firebase Admin] ADC project_id:', adminProjectId);
      console.log('[Firebase Admin] Client config projectId:', firebaseConfig.projectId);
      
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