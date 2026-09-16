import { createContext, useCallback, useEffect, useState, ReactNode } from "react";
import { authApi, Me } from "../api/auth";

type AuthCtx = {
  me: Me | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<Me>;
  register: (data: {
    org_name: string;
    admin_name: string;
    username: string;
    password: string;
    contact_phone?: string;
    contact_telegram?: string;
  }) => Promise<Me>;
  logout: () => void;
  refresh: () => Promise<void>;
};

export const AuthContext = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem("shoda_token")) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const m = await authApi.me();
      setMe(m);
    } catch {
      setMe(null);
      localStorage.removeItem("shoda_token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (u: string, p: string) => {
    const r = await authApi.login(u, p);
    localStorage.setItem("shoda_token", r.access_token);
    const m = await authApi.me();
    setMe(m);
    return m;
  };

  const register = async (data: Parameters<typeof authApi.register>[0]) => {
    const r = await authApi.register(data);
    localStorage.setItem("shoda_token", r.access_token);
    const m = await authApi.me();
    setMe(m);
    return m;
  };

  const logout = () => {
    localStorage.removeItem("shoda_token");
    setMe(null);
    location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ me, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
