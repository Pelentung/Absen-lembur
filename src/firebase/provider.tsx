
'use client';

import React, { createContext, useContext } from 'react';
import { initializeFirebase, FirebaseInstances } from '.';

const FirebaseContext = createContext<FirebaseInstances | null>(null);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const firebase = initializeFirebase();

  return (
    <FirebaseContext.Provider value={firebase}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};


export const useFirebaseApp = () => useFirebase().app;
export const useFirestore = () => useFirebase();
export const useAuth = () => useFirebase().auth;
