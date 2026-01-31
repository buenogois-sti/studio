
import admin from 'firebase-admin';

// This file initializes the Firebase Admin SDK.
// It is designed to work in environments with Application Default Credentials (ADC),
// such as Firebase App Hosting, Vercel with a Firebase integration, ou uma máquina
// local que foi autenticada usando `gcloud auth application-default login`.

if (!admin.apps.length) {
  try {
    // Ao chamar initializeApp() sem argumentos, o SDK automaticamente
    // descobre e usa as credenciais disponíveis no ambiente.
    // Este é o método mais robusto para implantações na nuvem.
    console.log("Initializing Firebase Admin with Application Default Credentials (ADC).");
    admin.initializeApp();
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // Este bloco de captura lidará com casos em que até o ADC falha,
    // impedindo que o aplicativo quebre durante a inicialização.
  }
}

export const firebaseAdmin = admin;
export const firestoreAdmin = admin.firestore();
export const authAdmin = admin.auth();
