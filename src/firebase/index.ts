'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore, 
  memoryLocalCache, 
  MemoryLocalCache 
} from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  // If no Firebase app has been initialized yet...
  const apps = getApps();
  if (!apps.length) {
    const app = initializeApp(firebaseConfig);
    // Use MemoryLocalCache to prevent 'INTERNAL ASSERTION FAILED' (ID: ca9) 
    // caused by corrupted indexedDB state during Next.js 15 Turbopack HMR.
    initializeFirestore(app, {
      localCache: memoryLocalCache()
    });
    return getSdks(app);
  }
  
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';

// Singleton instances for direct access throughout the application
// This pattern avoids multiple SDK calls and improves HMR stability in Next.js Turbopack.
const services = initializeFirebase();
export const db = services.firestore;
export const auth = services.auth;
export const firebaseApp = services.firebaseApp;
