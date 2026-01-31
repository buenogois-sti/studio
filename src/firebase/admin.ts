import admin from 'firebase-admin';

// This file initializes the Firebase Admin SDK.
// It checks if an app is already initialized to prevent errors during hot-reloading
// in development. It relies on Application Default Credentials (ADC) for authentication,
// which is the standard for Google Cloud environments like App Hosting.

if (!admin.apps.length) {
  admin.initializeApp();
}

export const firebaseAdmin = admin;
export const firestoreAdmin = admin.firestore();
export const authAdmin = admin.auth();
