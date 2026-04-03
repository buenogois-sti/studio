'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: any | null;
  isStale: boolean;
}

export function useCollection<T = any>(
  memoizedQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean}) | null | undefined,
): UseCollectionResult<T> {
  const [state, setState] = useState<UseCollectionResult<T>>({
    data: null,
    isLoading: !!memoizedQuery,
    error: null,
    isStale: false
  });

  useEffect(() => {
    if (!memoizedQuery) {
      setState({ data: null, isLoading: false, error: null, isStale: false });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, isStale: false }));

    const unsubscribe = onSnapshot(
      memoizedQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results = snapshot.docs.map(doc => ({ ...(doc.data() as T), id: doc.id }));
        setState({ data: results, error: null, isLoading: false, isStale: false });
      },
      (err: FirestoreError) => {
        let errorToReport = err;
        if (err.code === 'permission-denied') {
          errorToReport = new FirestorePermissionError({
            operation: 'list',
            path: 'unknown',
          }) as any;
        }
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
  }, [memoizedQuery]);

  return state;
}
