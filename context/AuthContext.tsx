"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { registerUser, loginUser } from "@/lib/api";

/**
 * Autenticación de clientes contra el backend real (Google Apps Script).
 * ---------------------------------------------------------------------------
 * El registro/ingreso guarda la cuenta en la planilla (pestaña Clientes), con
 * la contraseña hasheada. La sesión activa (nombre + email) se recuerda en el
 * navegador para no volver a pedir el login en cada visita.
 */

export interface Account {
  name: string;
  email: string;
}

interface AuthContextValue {
  user: Account | null;
  ready: boolean;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = "npm-session-v1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw) as Account);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const persistSession = (acc: Account | null) => {
      setUser(acc);
      try {
        if (acc) localStorage.setItem(SESSION_KEY, JSON.stringify(acc));
        else localStorage.removeItem(SESSION_KEY);
      } catch {
        /* ignore */
      }
    };

    return {
      user,
      ready,
      register: async (name, email, password) => {
        const clean = email.trim().toLowerCase();
        if (!name.trim() || !clean || password.length < 4) {
          return {
            ok: false,
            error: "Completá nombre, email y una contraseña de 4+ caracteres.",
          };
        }
        const r = await registerUser(name.trim(), clean, password);
        if (r.ok) {
          persistSession({ name: r.user?.nombre || name.trim(), email: r.user?.email || clean });
          return { ok: true };
        }
        return { ok: false, error: r.error };
      },
      login: async (email, password) => {
        const clean = email.trim().toLowerCase();
        if (!clean || !password) {
          return { ok: false, error: "Completá email y contraseña." };
        }
        const r = await loginUser(clean, password);
        if (r.ok) {
          persistSession({ name: r.user?.nombre || "", email: r.user?.email || clean });
          return { ok: true };
        }
        return { ok: false, error: r.error };
      },
      logout: () => persistSession(null),
    };
  }, [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
