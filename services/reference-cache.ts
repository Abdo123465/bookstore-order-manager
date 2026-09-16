import { useState, useEffect, useCallback } from 'react';
import { getReferenceTable, STORAGE_KEYS, getAppSettings } from './storage';
import { captureError } from './error-handler';
import { setInvalidateHandler } from './cache-invalidation';
import { Publisher, AcademicYear, Subject, Employee, PaymentMethod, AppSettings, BookType } from '../types';

export interface ReferenceCacheData {
  publishers: Publisher[];
  academicYears: AcademicYear[];
  subjects: Subject[];
  employees: Employee[];
  paymentMethods: PaymentMethod[];
  bookTypes: BookType[];
  settings: AppSettings;
}

let loadPromise: Promise<ReferenceCacheData> | null = null;
let cachedData: ReferenceCacheData | null = null;
let loadError: string | null = null;
let loading = false;
const listeners = new Set<() => void>();

export const cacheStats = { hits: 0, misses: 0 };

setInvalidateHandler(() => { cachedData = null; loadPromise = null; loadError = null; notify(); });

function notify() {
  listeners.forEach(fn => fn());
}

async function doLoad(): Promise<ReferenceCacheData> {
  loading = true;
  loadError = null;
  try {
    const [publishers, academicYears, subjects, employees, paymentMethods, bookTypes] = await Promise.all([
      getReferenceTable<Publisher>(STORAGE_KEYS.PUBLISHERS),
      getReferenceTable<AcademicYear>(STORAGE_KEYS.ACADEMIC_YEARS),
      getReferenceTable<Subject>(STORAGE_KEYS.SUBJECTS),
      getReferenceTable<Employee>(STORAGE_KEYS.EMPLOYEES),
      getReferenceTable<PaymentMethod>(STORAGE_KEYS.PAYMENT_METHODS),
      getReferenceTable<BookType>(STORAGE_KEYS.BOOK_TYPES),
    ]);

    const settings = (await getAppSettings()) as AppSettings;

    cachedData = { publishers, academicYears, subjects, employees, paymentMethods, bookTypes, settings };
    loadError = null;
    return cachedData;
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Failed to load reference data';
    captureError(error, { source: 'reference-cache', action: 'doLoad' });
    throw error;
  } finally {
    loading = false;
    notify();
  }
}

export function loadReferenceData(): Promise<ReferenceCacheData> {
  if (cachedData) { cacheStats.hits++; return Promise.resolve(cachedData); }
  if (loadPromise) { cacheStats.hits++; return loadPromise; }
  cacheStats.misses++;
  loadPromise = doLoad().finally(() => { loadPromise = null; });
  return loadPromise;
}

export function invalidateCache() {
  cachedData = null;
  loadPromise = null;
  loadError = null;
}

export async function refreshCache(): Promise<ReferenceCacheData> {
  invalidateCache();
  return loadReferenceData();
}

export function getCachedData(): ReferenceCacheData | null {
  return cachedData;
}

export function useReferenceData(): {
  data: ReferenceCacheData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<ReferenceCacheData>;
} {
  const [state, setState] = useState<{
    data: ReferenceCacheData | null;
    loading: boolean;
    error: string | null;
  }>({ data: cachedData, loading: !cachedData && loading, error: loadError });

  useEffect(() => {
    if (cachedData) {
      setState({ data: cachedData, loading: false, error: null });
      return;
    }

    loadReferenceData()
      .then(data => setState({ data, loading: false, error: null }))
      .catch(err => setState(s => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Load failed' })));

    const onUpdate = () => {
      setState({ data: cachedData, loading, error: loadError });
    };
    listeners.add(onUpdate);
    return () => { listeners.delete(onUpdate); };
  }, []);

  const refresh = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    try {
      const data = await refreshCache();
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Refresh failed' }));
      throw err;
    }
  }, []);

  return { ...state, refresh };
}
