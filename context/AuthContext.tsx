"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Autenticación de clientes en modo DEMO (localStorage).
 * ---------------------------------------------------------------------------
 * Es una maqueta funcional: registra e ingresa usuarios guardándolos en el
 * navegador. NO es seguro para producción (la contraseña no se hashea de
 * verdad). Está pensado para reemplazarse luego por el backend real
 * (Google Apps Script: acciones `registrar` / `login`).
 */

export interface Account {
  name: string;
  email: string;
}

interface StoredAccount extends Account {
  // "hash" simbólico solo para la demo local
  pass: string;
}

interface AuthContextValue {
  user: Account | null;
  ready: boolean;
  register: (name: string, email: string, password: string) => { ok: boolean; error?: string };
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USERS_KEY = "npm-users-v1";
const SESSION_KEY = "npm-session-v1";

// Ofuscación mínima (NO es seguridad real, solo evita texto plano en la demo).
function pseudoHash(s: string): string {
  try {
    return btoa(unescape(encodeURIComponent(`npm::${s}`)));
  } catch {
    return `npm::${s}`;
  }
}

function readUsers(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredAccount[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* ignore */
  }
}

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
      register: (name, email, password) => {
        const clean = email.trim().toLowerCase();
        if (!name.trim() || !clean || password.length < 4) {
          return { ok: false, error: "Completá nombre, email y una contraseña de 4+ caracteres." };
        }
        const users = readUsers();
        if (users.some((u) => u.email === clean)) {
          return { ok: false, error: "Ya existe una cuenta con ese email." };
        }
        const account: StoredAccount = {
          name: name.trim(),
          email: clean,
          pass: pseudoHash(password),
        };
        writeUsers([...users, account]);
        persistSession({ name: account.name, email: account.email });
        return { ok: true };
      },
      login: (email, password) => {
        const clean = email.trim().toLowerCase();
        const users = readUsers();
        const found = users.find((u) => u.email === clean);
        if (!found || found.pass !== pseudoHash(password)) {
          return { ok: false, error: "Email o contraseña incorrectos." };
        }
        persistSession({ name: found.name, email: found.email });
        return { ok: true };
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
