'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { useSession } from 'next-auth/react';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

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

export interface UserHookResult {
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
  
  // Ref para evitar logins repetidos com o mesmo token
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.customToken && auth) {
      // Só tenta o login se o token for diferente do último processado com sucesso
      if (lastTokenRef.current === session.customToken && auth.currentUser) {
        return;
      }

      console.log('[Firebase Auth] Sincronizando com Custom Token...');
      
      signInWithCustomToken(auth, session.customToken).then(() => {
        console.log('[Firebase Auth] ✅ User signed in with custom token');
        lastTokenRef.current = session.customToken!;
      }).catch((error: any) => {
        const errorCode = error?.code || 'UNKNOWN_ERROR';
        const clientProject = auth.app.options.projectId;
        const expectedProject = 'studio-7080106838-23904';
        
        // Decodificar token para ver o projeto real para o qual foi emitido
        let tokenAudience = 'unknown';
        try {
          const parts = session.customToken!.split('.');
          if (parts.length > 1) {
            // No browser, usamos atob para decodificar o payload do JWT
            const payload = JSON.parse(atob(parts[1]));
            tokenAudience = payload.aud || 'not found in payload';
          }
        } catch (e) {}

        console.error('[Firebase Auth] ❌ Erro ao autenticar Custom Token:', {
          code: errorCode,
          message: error.message,
          clientProject,
          tokenAudience,
          expectedProject
        });

        // NOTA: Para Custom Tokens, a audiência (aud) é geralmente a URL do Identity Toolkit.
        // O erro 400 real acontece se a chave de serviço no servidor pertencer a um projeto diferente da chave de API no cliente.
        if (tokenAudience !== "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit") {
           console.warn(`[Firebase Auth] ⚠️ Token Audience incomum: "${tokenAudience}". Verifique se o FIREBASE_SERVICE_ACCOUNT_JSON no seu .env.local pertence ao projeto correto.`);
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
        console.error('[FirebaseProvider] onAuthStateChanged error:', error);
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

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  return memoized;
}

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};