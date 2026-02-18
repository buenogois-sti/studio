
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { useSession } from 'next-auth/react';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { firebaseConfig } from './config';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const { data: session, status: sessionStatus } = useSession();
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });
  
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.customToken && auth) {
      if (lastTokenRef.current === session.customToken && auth.currentUser) {
        return;
      }

      console.log('[Firebase Auth] Intentando autenticação com Custom Token...');
      
      signInWithCustomToken(auth, session.customToken).then((userCredential) => {
        console.log('[Firebase Auth] ✅ Sessão Firebase vinculada:', userCredential.user.email);
        lastTokenRef.current = session.customToken!;
        setUserAuthState(prev => ({ ...prev, isUserLoading: false, userError: null }));
      }).catch((error: any) => {
        const errorCode = error?.code || 'UNKNOWN_ERROR';
        console.error('[Firebase Auth] ❌ Falha na autenticação do token:', errorCode);
        
        if (errorCode === 'auth/invalid-custom-token') {
          console.error('[Firebase Auth] Erro de integridade de projeto detectado. O token foi gerado para um Project ID diferente do cliente.');
        }
        
        setUserAuthState((state) => ({ ...state, userError: error, isUserLoading: false }));
      });
    } else if (sessionStatus === 'unauthenticated') {
      lastTokenRef.current = null;
      setUserAuthState((state) => ({ ...state, isUserLoading: false }));
    }
  }, [session?.customToken, sessionStatus, auth]);

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => {
        console.error('[Firebase Auth] Erro no estado de autenticação:', error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error as Error });
      }
    );

    return () => unsubscribe();
  }, [auth]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading || sessionStatus === 'loading',
      userError: userAuthState.userError,
    };
  }, [firebaseApp, firestore, auth, userAuthState, sessionStatus]);

  return (
    <div className="contents">
      <FirebaseContext.Provider value={contextValue}>
        <FirebaseErrorListener />
        {children}
      </FirebaseContext.Provider>
    </div>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available.');
  }
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T & {__memo?: boolean} {
  const memoized = useMemo(() => {
    const result = factory();
    if (result && typeof result === 'object') {
      (result as any).__memo = true;
    }
    return result;
  }, deps);
  return memoized as T & {__memo?: boolean};
}

export const useUser = () => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};

export const useAuth = () => useFirebase().auth;
export const useFirestore = () => useFirebase().firestore;
export const useFirebaseApp = () => useFirebase().firebaseApp;
