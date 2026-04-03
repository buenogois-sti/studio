'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';

type WithId<T> = T & { id: string };

export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: any | null;
  isStale: boolean;
}

export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  const [state, setState] = useState<UseDocResult<T>>({
    data: null,
    isLoading: !!memoizedDocRef,
    error: null,
    isStale: false
  });

  useEffect(() => {
    if (!memoizedDocRef) {
      setState({ data: null, isLoading: false, error: null, isStale: false });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, isStale: false }));

    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        const result = snapshot.exists() ? { ...(snapshot.data() as T), id: snapshot.id } as WithId<T> : null;
        setState({ data: result, error: null, isLoading: false, isStale: false });
      },
      (err: FirestoreError) => {
        const errorToReport = new FirestorePermissionError({
          operation: 'get',
          path: memoizedDocRef.path,
        }) as any;
        setState({ data: null, error: errorToReport, isLoading: false, isStale: false });
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (err) {
        console.warn("[Firestore] Erro seguro ao encerrar listener:", err);
      }
    };
  }, [memoizedDocRef]);

  return state;
}
