import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { lookupOfficial, type OfficialRecord } from "@/config/officials";

export type CivicRole = "citizen" | "official";

export interface CivicUser {
  id: string;
  role: CivicRole;
  name: string;
  /** Citizens only — always stored in full E.164 form, e.g. +919876543210 */
  phone?: string;
  /** Officials only */
  employeeCode?: string;
  designation?: string;
  /** Official's department slug, or "all" for the command centre. */
  department?: string;
}

const SESSION_KEY = "civicpulse_session";

interface AuthValue {
  user: CivicUser | null;
  ready: boolean;
  isOfficial: boolean;
  isCitizen: boolean;
  /** True when the official may act on this department's queue. */
  canWorkOn: (departmentSlug?: string | null) => boolean;
  signInCitizen: (tenDigits: string) => { ok: boolean; error?: string };
  signInOfficial: (code: string, pin: string) => { ok: boolean; error?: string };
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function readSession(): CivicUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as CivicUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CivicUser | null>(null);
  const [ready, setReady] = useState(false);

  // Read after mount so SSR and hydration render the same signed-out shell.
  useEffect(() => {
    setUser(readSession());
    setReady(true);
  }, []);

  const persist = (next: CivicUser | null) => {
    setUser(next);
    if (typeof window === "undefined") return;
    if (next) window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(SESSION_KEY);
  };

  const value = useMemo<AuthValue>(() => {
    const isOfficial = user?.role === "official";
    return {
      user,
      ready,
      isOfficial,
      isCitizen: user?.role === "citizen",
      canWorkOn: (departmentSlug) => {
        if (!isOfficial) return false;
        if (user?.department === "all") return true;
        return !departmentSlug || user?.department === departmentSlug;
      },
      signInCitizen: (tenDigits: string) => {
        const digits = tenDigits.replace(/\D/g, "");
        if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
          return { ok: false, error: "Enter a valid 10-digit Indian mobile number." };
        }
        persist({
          id: `citizen-${digits}`,
          role: "citizen",
          name: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
          phone: `+91${digits}`,
        });
        return { ok: true };
      },
      signInOfficial: (code: string, pin: string) => {
        const record: OfficialRecord | null = lookupOfficial(code, pin);
        if (!record) {
          return {
            ok: false,
            error: "That employee code and access PIN pair is not on the authority register.",
          };
        }
        persist({
          id: `official-${record.code}`,
          role: "official",
          name: record.name,
          employeeCode: record.code,
          designation: record.designation,
          department: record.department,
        });
        return { ok: true };
      },
      signOut: () => persist(null),
    };
  }, [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
