
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Global Registry para compartilhamento de subscrições.
 * Evita múltiplas conexões para a mesma query e permite retorno instantâneo de cache.
 */
const queryCache = new Map<string, {
  unsubscribe: () => void;
  listeners: Set<(data: any[], error: any, loading: boolean) => void>;
  lastData: any[] | null;
  lastError: any | null;
  isLoading: boolean;
}>();

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: any | null;
  isStale: boolean;
}

export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
    }
  }
}

function getQueryKey(query: CollectionReference<DocumentData> | Query<DocumentData>): string {
  if (query.type === 'collection') {
    return (query as CollectionReference).path;
  }
  try {
    const q = query as any;
    return q._query?.path?.canonicalString() || query.toString();
  } catch (e) {
    return query.toString();
  }
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

  const lastKeyRef = useRef<string>('');

  useEffect(() => {
    if (!memoizedQuery) {
      setState({ data: null, isLoading: false, error: null, isStale: false });
      return;
    }

    const key = getQueryKey(memoizedQuery);
    lastKeyRef.current = key;
    
    let cacheEntry = queryCache.get(key);

    if (cacheEntry && cacheEntry.lastData) {
      setState({
        data: cacheEntry.lastData,
        isLoading: false,
        error: cacheEntry.lastError,
        isStale: true
      });
    } else {
      setState(prev => ({ ...prev, isLoading: true, isStale: false }));
    }

    const onUpdate = (data: any[], error: any, loading: boolean) => {
      setState({ data, error, isLoading: loading, isStale: false });
    };

    if (!cacheEntry) {
      const listeners = new Set<(data: any[], error: any, loading: boolean) => void>();
      listeners.add(onUpdate);

      const entry = {
        listeners,
        lastData: null as any[] | null,
        lastError: null as any,
        isLoading: true,
        unsubscribe: () => {}
      };

      queryCache.set(key, entry);

      const unsubscribe = onSnapshot(
        memoizedQuery,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const results = snapshot.docs.map(doc => ({ ...(doc.data() as T), id: doc.id }));
          entry.lastData = results;
          entry.lastError = null;
          entry.isLoading = false;
          entry.listeners.forEach(l => l(results, null, false));
        },
        (err: FirestoreError) => {
          let errorToReport = err;
          if (err.code === 'permission-denied') {
            errorToReport = new FirestorePermissionError({
              operation: 'list',
              path: key,
            }) as any;
          }
          entry.lastError = errorToReport;
          entry.isLoading = false;
          entry.listeners.forEach(l => l(entry.lastData || [], errorToReport, false));
        }
      );

      entry.unsubscribe = unsubscribe;
      cacheEntry = entry;
    } else {
      cacheEntry.listeners.add(onUpdate);
    }

    return () => {
      if (cacheEntry) {
        cacheEntry.listeners.delete(onUpdate);
        // Delay para remover a subscrição (mantém cache vivo em navegações rápidas)
        const currentKey = lastKeyRef.current;
        setTimeout(() => {
          const freshEntry = queryCache.get(currentKey);
          if (freshEntry && freshEntry.listeners.size === 0) {
            freshEntry.unsubscribe();
            queryCache.delete(currentKey);
          }
        }, 5000);
      }
    };
  }, [memoizedQuery]);

  return state;
}
