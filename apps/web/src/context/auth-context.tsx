"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@bidmarket/shared";
import { parseSessionToken } from "@bidmarket/shared";
import { api, ApiError, getErrorMessage } from "@/lib/api";

const SESSION_KEY = "bidmarket_session";
const LEGACY_TOKEN_KEY = "bidmarket_token";

interface StoredSession {
  token: string;
  user: User;
}

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(SESSION_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacyToken) {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    const legacyUser = parseSessionToken(legacyToken);
    if (legacyUser) {
      return { token: legacyToken, user: legacyUser };
    }
  }

  return null;
}

function restoreSessionFromStorage(): StoredSession | null {
  const stored = readStoredSession();
  if (!stored?.token) {
    return null;
  }

  const user = stored.user?.id
    ? stored.user
    : parseSessionToken(stored.token);

  if (!user) {
    return null;
  }

  return { token: stored.token, user };
}

function writeStoredSession(session: StoredSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  becomeSeller: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistSession = useCallback((nextToken: string, nextUser: User) => {
    writeStoredSession({ token: nextToken, user: nextUser });
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(() => {
    writeStoredSession(null);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const stored = restoreSessionFromStorage();
    if (!stored) {
      setIsLoading(false);
      return;
    }

    setToken(stored.token);
    setUser(stored.user);

    let cancelled = false;

    api
      .me(stored.token)
      .then(({ user: currentUser }) => {
        if (!cancelled) {
          persistSession(stored.token, currentUser);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          const tokenUser = parseSessionToken(stored.token);
          if (tokenUser) {
            persistSession(stored.token, tokenUser);
            return;
          }
          clearSession();
          return;
        }

        persistSession(stored.token, stored.user);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession, persistSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await api.login({
        email: normalizedEmail,
        password,
      });
      persistSession(response.token, response.user);
    },
    [persistSession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await api.register({
        name: name.trim(),
        email: normalizedEmail,
        password,
      });
      persistSession(response.token, response.user);
    },
    [persistSession],
  );

  const becomeSeller = useCallback(async () => {
    if (!token) {
      throw new Error("Sign in required");
    }
    const response = await api.becomeSeller(token);
    persistSession(response.token, response.user);
  }, [token, persistSession]);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!user && !!token,
      isSeller: !!user?.isSeller,
      isAdmin: !!user?.isAdmin,
      login,
      register,
      becomeSeller,
      logout,
    }),
    [user, token, isLoading, login, register, becomeSeller, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
