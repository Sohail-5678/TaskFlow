import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { api } from "../api/client";
import { demoApi } from "../demo/demoStore";
import type { AuthResponse, User } from "../types";

interface AuthState {
  user: User | null;
  loading: boolean;
  demo: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, fullName: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const demo = demoApi.isEnabled();
  const [user, setUser] = useState<User | null>(demo ? demoApi.currentUser() : null);
  const [loading, setLoading] = useState(!demo);

  useEffect(() => {
    // Demo mode: no backend, auto sign-in as the demo user.
    if (demo) {
      setUser(demoApi.currentUser());
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("taskflow_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem("taskflow_token"))
      .finally(() => setLoading(false));
  }, [demo]);

  const persist = useCallback((data: AuthResponse) => {
    localStorage.setItem("taskflow_token", data.access_token);
    setUser(data.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<AuthResponse>("/auth/login", { email, password });
      persist(res.data);
    },
    [persist]
  );

  const register = useCallback(
    async (email: string, fullName: string, password: string) => {
      const res = await api.post<AuthResponse>("/auth/register", {
        email,
        full_name: fullName,
        password,
      });
      persist(res.data);
    },
    [persist]
  );

  const logout = useCallback(() => {
    // In demo mode there's nothing to sign out of; reset the demo data instead.
    if (demo) {
      demoApi.reset();
      setUser(demoApi.currentUser());
      location.href = "/";
      return;
    }
    localStorage.removeItem("taskflow_token");
    setUser(null);
  }, [demo]);

  const value = useMemo(
    () => ({ user, loading, demo, login, register, logout }),
    [user, loading, demo, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
