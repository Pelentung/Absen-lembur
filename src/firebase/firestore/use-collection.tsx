
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, Query, DocumentData, getDocs } from 'firebase/firestore';

// A generic hook to subscribe to a collection
export function useCollection<T>(
  q: Query | null,
  options?: { isRealtime?: boolean }
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isRealtime = options?.isRealtime ?? true;

  useEffect(() => {
    if (!q) {
      setLoading(false);
      setData([]);
      return;
    }

    if (isRealtime) {
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
          setData(docs);
          setLoading(false);
        },
        (err) => {
          console.error("onSnapshot error:", err);
          setError(err);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } else {
      const fetchData = async () => {
        try {
          const snapshot = await getDocs(q);
          const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
          setData(docs);
        } catch (err) {
          console.error("getDocs error:", err);
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [q, isRealtime]);

  return { data, loading, error };
}
