'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type {
  AuthState,
  AuthTokens,
  LoginResponse,
  SessionLimitResponse,
  RefreshResponse,
  MeResponse,
} from './auth-types';

export type {
  AuthUser,
  AuthTenant,
  LoginResponse,
  SessionLimitResponse,
  ActiveSession,
} from './auth-types';

// --- Storage keys (sessionStorage — per-tab, cleared on close) ---
const STORAGE_ACCESS = 'vani-access-token';
const STORAGE_REFRESH = 'vani-refresh-token';
const STORAGE_EXPIRES = 'vani-token-expires-at';

// --- Context interface ---

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<LoginResponse | SessionLimitResponse>;
  logout: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
  revokeSessions: (sessionIds: string[], email: string, password: string) => Promise<LoginResponse | SessionLimitResponse>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  tenant: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => { throw new Error('AuthProvider not mounted'); },
  logout: async () => {},
  getAuthHeaders: () => ({}),
  revokeSessions: async () => { throw new Error('AuthProvider not mounted'); },
});

export const useAuth = () => useContext(AuthContext);

// --- Helpers ---

function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

function storageSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* SSR or incognito */ }
}

function storageGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function storageClear(): void {
  try {
    sessionStorage.removeItem(STORAGE_ACCESS);
    sessionStorage.removeItem(STORAGE_REFRESH);
    sessionStorage.removeItem(STORAGE_EXPIRES);
  } catch { /* ignore */ }
}

// --- Provider ---

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tenant: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiUrl = getApiUrl();

  // --- Schedule silent refresh ---
  const scheduleRefresh = useCallback((expiresIn: number, refreshToken: string) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Refresh 2 min before expiry (or half-life if < 4 min)
    const refreshAfterMs = Math.max((expiresIn - 120) * 1000, (expiresIn / 2) * 1000);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!res.ok) {
          storageClear();
          setState({
            user: null, tenant: null, tokens: null,
            isAuthenticated: false, isLoading: false,
          });
          return;
        }

        const data: RefreshResponse = await res.json();
        const newTokens: AuthTokens = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
        };

        storageSet(STORAGE_ACCESS, newTokens.access_token);
        storageSet(STORAGE_REFRESH, newTokens.refresh_token);
        storageSet(STORAGE_EXPIRES, String(Date.now() + newTokens.expires_in * 1000));

        setState((prev) => ({ ...prev, tokens: newTokens }));
        scheduleRefresh(newTokens.expires_in, newTokens.refresh_token);
      } catch {
        console.error('[Auth] Silent refresh failed');
      }
    }, refreshAfterMs);
  }, [apiUrl]);

  // --- Rehydrate on mount ---
  useEffect(() => {
    const accessToken = storageGet(STORAGE_ACCESS);
    const refreshToken = storageGet(STORAGE_REFRESH);
    const expiresAt = storageGet(STORAGE_EXPIRES);

    if (!accessToken || !refreshToken) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const now = Date.now();
    const expiry = expiresAt ? parseInt(expiresAt, 10) : 0;

    if (expiry > now) {
      // Token still valid — call /auth/me to get user+tenant
      fetch(`${apiUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('me failed');
          return res.json();
        })
        .then((data: MeResponse) => {
          const tokens: AuthTokens = {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: Math.floor((expiry - now) / 1000),
          };
          setState({
            user: data.user,
            tenant: data.tenant,
            tokens,
            isAuthenticated: true,
            isLoading: false,
          });
          scheduleRefresh(tokens.expires_in, refreshToken);
        })
        .catch(() => {
          tryRefreshOnMount(refreshToken);
        });
    } else {
      tryRefreshOnMount(refreshToken);
    }

    async function tryRefreshOnMount(rt: string) {
      try {
        const res = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: rt }),
        });

        if (!res.ok) {
          storageClear();
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        const refreshData: RefreshResponse = await res.json();
        const newTokens: AuthTokens = {
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_in: refreshData.expires_in,
        };

        storageSet(STORAGE_ACCESS, newTokens.access_token);
        storageSet(STORAGE_REFRESH, newTokens.refresh_token);
        storageSet(STORAGE_EXPIRES, String(Date.now() + newTokens.expires_in * 1000));

        const meRes = await fetch(`${apiUrl}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${newTokens.access_token}` },
        });

        if (!meRes.ok) {
          storageClear();
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        const meData: MeResponse = await meRes.json();
        setState({
          user: meData.user,
          tenant: meData.tenant,
          tokens: newTokens,
          isAuthenticated: true,
          isLoading: false,
        });
        scheduleRefresh(newTokens.expires_in, newTokens.refresh_token);
      } catch {
        storageClear();
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Login ---
  const login = useCallback(async (email: string, password: string): Promise<LoginResponse | SessionLimitResponse> => {
    const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.status === 409 && data.code === 'SESSION_LIMIT') {
      return data as SessionLimitResponse;
    }

    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    const loginData = data as LoginResponse;

    storageSet(STORAGE_ACCESS, loginData.tokens.access_token);
    storageSet(STORAGE_REFRESH, loginData.tokens.refresh_token);
    storageSet(STORAGE_EXPIRES, String(Date.now() + loginData.tokens.expires_in * 1000));

    setState({
      user: loginData.user,
      tenant: loginData.tenant,
      tokens: loginData.tokens,
      isAuthenticated: true,
      isLoading: false,
    });

    scheduleRefresh(loginData.tokens.expires_in, loginData.tokens.refresh_token);

    return loginData;
  }, [apiUrl, scheduleRefresh]);

  // --- Logout ---
  const logout = useCallback(async () => {
    const refreshToken = state.tokens?.refresh_token || storageGet(STORAGE_REFRESH);

    if (refreshToken) {
      try {
        await fetch(`${apiUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // Server unreachable — still clear local state
      }
    }

    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    storageClear();

    setState({
      user: null, tenant: null, tokens: null,
      isAuthenticated: false, isLoading: false,
    });
  }, [apiUrl, state.tokens]);

  // --- Revoke sessions then retry login ---
  const revokeSessions = useCallback(async (
    sessionIds: string[],
    email: string,
    password: string,
  ): Promise<LoginResponse | SessionLimitResponse> => {
    await fetch(`${apiUrl}/api/v1/auth/sessions/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, session_ids: sessionIds }),
    });

    return login(email, password);
  }, [apiUrl, login]);

  // --- Get auth headers ---
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = state.tokens?.access_token || storageGet(STORAGE_ACCESS);
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [state.tokens]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        getAuthHeaders,
        revokeSessions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
