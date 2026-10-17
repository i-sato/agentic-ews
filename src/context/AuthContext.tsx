import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { UserProfile, AuthSessionState } from "../../shared/types";
import { getSupabase } from "../lib/supabaseClient";
import { clientLogin, clientLogout } from "../lib/apiClient";

interface AuthContextType extends AuthSessionState {
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: (reason?: string) => Promise<void>;
  clearLockout: () => void;
  inactivityNotice: boolean;
  dismissInactivityNotice: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 menit sesuai kebijakan keamanan

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem("taldig_user");
    return cached ? JSON.parse(cached) : null;
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem("taldig_token");
  });

  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [remainingLockoutSeconds, setRemainingLockoutSeconds] = useState<number>(0);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [inactivityNotice, setInactivityNotice] = useState<boolean>(false);

  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  // Sync Supabase Auth session if Supabase is connected
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from("users")
          .select("id, nama, role_id, aktif, must_change_password")
          .eq("id", session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile && profile.aktif && profile.role_id === "admin") {
              const u: UserProfile = {
                id: profile.id,
                email: session.user.email,
                nama: profile.nama,
                role_id: profile.role_id,
                aktif: profile.aktif,
                must_change_password: profile.must_change_password,
              };
              setUser(u);
              setSessionToken(session.access_token);
              localStorage.setItem("taldig_user", JSON.stringify(u));
              localStorage.setItem("taldig_token", session.access_token);
            }
          });
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setSessionToken(null);
        localStorage.removeItem("taldig_user");
        localStorage.removeItem("taldig_token");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (!isLockedOut || !lockedUntil) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= lockedUntil) {
        setIsLockedOut(false);
        setLockedUntil(null);
        setRemainingLockoutSeconds(0);
        clearInterval(interval);
      } else {
        setRemainingLockoutSeconds(Math.ceil((lockedUntil - now) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLockedOut, lockedUntil]);

  // Logout callback
  const logout = useCallback(async (reason = "manual_logout") => {
    const currentUser = user;
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem("taldig_user");
    localStorage.removeItem("taldig_token");

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Supabase signOut error:", err);
      }
    }

    await clientLogout(currentUser?.id, currentUser?.email, reason);
  }, [user]);

  // 30-minute inactivity timer
  useEffect(() => {
    if (!user) return;

    const checkInactivity = () => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      if (elapsed >= INACTIVITY_LIMIT_MS) {
        setInactivityNotice(true);
        logout("inactivity_timeout");
      }
    };

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((evt) => window.addEventListener(evt, resetActivity, { passive: true }));

    timerRef.current = setInterval(checkInactivity, 15000); // Check every 15s

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetActivity));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user, logout]);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    // Check client-side password policy first for immediate user feedback
    if (!password || password.length < 12) {
      return {
        success: false,
        message: "Kebijakan keamanan: kata sandi harus memiliki minimal 12 karakter.",
      };
    }

    try {
      const res = await clientLogin(email, password);

      if (res.isLockedOut) {
        setIsLockedOut(true);
        const until = Date.now() + (res.remainingSeconds || 900) * 1000;
        setLockedUntil(until);
        setRemainingLockoutSeconds(res.remainingSeconds || 900);
        setFailedAttempts(res.failedAttempts || 5);
        return {
          success: false,
          message: res.message || "Akun dikunci sementara karena 5 kali percobaan gagal.",
        };
      }

      if (!res.success) {
        setFailedAttempts(res.failedAttempts || 0);
        return {
          success: false,
          message: res.message || "Gagal masuk sistem. Periksa email dan kata sandi.",
        };
      }

      if (res.user) {
        const profile: UserProfile = {
          id: res.user.id,
          email: res.user.email,
          nama: res.user.nama,
          role_id: res.user.role_id as any,
          aktif: true,
          must_change_password: res.user.must_change_password || false,
        };
        setUser(profile);
        setSessionToken(res.sessionToken || "token-ok");
        localStorage.setItem("taldig_user", JSON.stringify(profile));
        if (res.sessionToken) {
          localStorage.setItem("taldig_token", res.sessionToken);
        }
        setIsLockedOut(false);
        setLockedUntil(null);
        setRemainingLockoutSeconds(0);
        setFailedAttempts(0);
        lastActivityRef.current = Date.now();
        return { success: true };
      }

      return { success: false, message: "Profil pengguna tidak valid." };
    } catch (err: any) {
      return { success: false, message: err.message || "Terjadi kesalahan saat memproses login." };
    }
  };

  const clearLockout = () => {
    setIsLockedOut(false);
    setLockedUntil(null);
    setRemainingLockoutSeconds(0);
    setFailedAttempts(0);
  };

  const dismissInactivityNotice = () => {
    setInactivityNotice(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(user),
        user,
        token: sessionToken,
        isLockedOut,
        lockedUntil,
        remainingLockoutSeconds,
        failedAttempts,
        login,
        logout,
        clearLockout,
        inactivityNotice,
        dismissInactivityNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
