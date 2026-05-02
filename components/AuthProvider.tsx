'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin, validateSessionOnBackend } from '@/lib/api';

import type { AgentDetails } from '@/lib/api';

interface User {
  name: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  agent: AgentDetails | null;
  initializing: boolean;
  refreshAgent: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'indent-pwa-auth';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setInitializing(false);
      return;
    }

    (async () => {
      try {
        const parsed = JSON.parse(saved) as { user: User; token: string; agent?: AgentDetails };
        if (!parsed.token) {
          throw new Error('Missing token');
        }

        const response = await validateSessionOnBackend(parsed.token);
        setUser(response.user);
        setAgent(response.agent ?? parsed.agent ?? null);
        setToken(response.token);
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ user: response.user, token: response.token, agent: response.agent ?? parsed.agent ?? null })
        );
      } catch {
        setUser(null);
        setAgent(null);
        setToken(null);
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const response = await apiLogin(identifier, password);
    const profile = await validateSessionOnBackend(response.token);
    setUser(profile.user);
    setAgent(profile.agent ?? null);
    setToken(profile.token);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user: profile.user, token: profile.token, agent: profile.agent ?? null })
    );
  }, []);

  const refreshAgent = useCallback(async () => {
    if (!token) return;
    try {
      const response = await validateSessionOnBackend(token);
      setAgent(response.agent ?? null);
      // Use profile.user/token from response if possible, or just the current ones
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: response.user || user, token: response.token || token, agent: response.agent ?? null })
      );
    } catch (err) {
      console.error('Failed to refresh agent', err);
    }
  }, [token, user]);

  const logout = useCallback(() => {
    setUser(null);
    setAgent(null);
    setToken(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ user, token, agent, initializing, refreshAgent, login, logout }),
    [user, token, agent, initializing, refreshAgent, login, logout]
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
