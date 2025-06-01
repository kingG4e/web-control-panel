import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { User, AuthState } from '../types';

interface RootContextType {
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  data: any;
  setData: (data: any) => void;
  loading: {
    isLoading: boolean;
    message: string | null;
  };
  setLoading: (loading: { isLoading: boolean; message: string | null }) => void;
}

const RootContext = createContext<RootContextType | undefined>(undefined);

export function RootProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState({
    isLoading: false,
    message: null,
  });

  return (
    <RootContext.Provider
      value={{
        auth,
        setAuth,
        data,
        setData,
        loading,
        setLoading,
      }}
    >
      {children}
    </RootContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(RootContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a RootProvider');
  }
  return {
    auth: context.auth,
    setAuth: context.setAuth,
  };
}

export function useData() {
  const context = useContext(RootContext);
  if (context === undefined) {
    throw new Error('useData must be used within a RootProvider');
  }
  return {
    data: context.data,
    setData: context.setData,
  };
}

export function useLoading() {
  const context = useContext(RootContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a RootProvider');
  }
  return {
    loading: context.loading,
    setLoading: context.setLoading,
  };
} 