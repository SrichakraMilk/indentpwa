'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentAgent, login as apiLogin } from '@/lib/api';

interface User {
  name: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  initializing: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'indent-pwa-auth';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setInitializing(false);
      return;
    }

    (async () => {
      try {
        const parsed = JSON.parse(saved) as { user: User; token: string };
        if (!parsed.token) {
          throw new Error('Missing token');
        }

        const response = await fetchCurrentAgent(parsed.token);
        setUser(response.user);
        setToken(response.token);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: response.user, token: response.token }));
      } catch {
        setUser(null);
        setToken(null);
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const login = async (identifier: string, password: string) => {
    const response = await apiLogin(identifier, password);
    setUser(response.user);
    setToken(response.token);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({ user, token, initializing, login, logout }),
    [user, token, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
