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

const docCache = new Map<string, {
  unsubscribe: () => void;
  listeners: Set<(data: any, error: any, loading: boolean) => void>;
  lastData: any | null;
  lastError: any | null;
  isLoading: boolean;
}>();

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

    const key = memoizedDocRef.path;
    let cacheEntry = docCache.get(key);

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

    const onUpdate = (data: any, error: any, loading: boolean) => {
      setState({ data, error, isLoading: loading, isStale: false });
    };

    if (!cacheEntry) {
      const listeners = new Set<(data: any, error: any, loading: boolean) => void>();
      listeners.add(onUpdate);

      const entry = {
        listeners,
        lastData: null,
        lastError: null,
        isLoading: true,
        unsubscribe: () => {}
      };

      docCache.set(key, entry);

      const unsubscribe = onSnapshot(
        memoizedDocRef,
        (snapshot: DocumentSnapshot<DocumentData>) => {
          const result = snapshot.exists() ? { ...(snapshot.data() as T), id: snapshot.id } as WithId<T> : null;
          entry.lastData = result;
          entry.lastError = null;
          entry.isLoading = false;
          entry.listeners.forEach(l => l(result, null, false));
        },
        (err: FirestoreError) => {
          const errorToReport = new FirestorePermissionError({
            operation: 'get',
            path: key,
          });
          entry.lastError = errorToReport;
          entry.isLoading = false;
          entry.listeners.forEach(l => l(entry.lastData, errorToReport, false));
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
        setTimeout(() => {
          if (cacheEntry && cacheEntry.listeners.size === 0) {
            cacheEntry.unsubscribe();
            docCache.delete(key);
          }
        }, 5000);
      }
    };
  }, [memoizedDocRef]);

  return state;
}
