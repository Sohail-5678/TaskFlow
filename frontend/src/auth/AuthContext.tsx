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
import type { AuthResponse, User } from "../types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, fullName: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

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
    localStorage.removeItem("taskflow_token");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
