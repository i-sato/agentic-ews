import { getSupabase } from "./supabaseClient";

export interface LoginApiResponse {
  success: boolean;
  message?: string;
  isLockedOut?: boolean;
  remainingSeconds?: number;
  failedAttempts?: number;
  user?: {
    id: string;
    email: string;
    nama: string;
    role_id: string;
    must_change_password?: boolean;
  };
  sessionToken?: string;
}

const LOCAL_STORAGE_FAILED_KEY = "taldig_failed_login_attempts";
const LOCAL_STORAGE_LOCKED_KEY = "taldig_locked_until";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export async function clientLogin(email: string, password: string): Promise<LoginApiResponse> {
  const normEmail = email.trim().toLowerCase();

  // 1. Client-side password policy check
  if (!password || password.length < 12) {
    return {
      success: false,
      message: "Kebijakan keamanan: kata sandi harus memiliki minimal 12 karakter.",
    };
  }

  // 2. Check local lockout state
  const lockedUntilStr = localStorage.getItem(LOCAL_STORAGE_LOCKED_KEY);
  if (lockedUntilStr) {
    const lockedUntil = parseInt(lockedUntilStr, 10);
    const now = Date.now();
    if (lockedUntil > now) {
      const remainingSeconds = Math.ceil((lockedUntil - now) / 1000);
      return {
        success: false,
        isLockedOut: true,
        remainingSeconds,
        failedAttempts: MAX_ATTEMPTS,
        message: `Akun dikunci sementara karena 5 kali percobaan gagal. Coba lagi dalam ${Math.ceil(
          remainingSeconds / 60
        )} menit.`,
      };
    } else {
      localStorage.removeItem(LOCAL_STORAGE_LOCKED_KEY);
      localStorage.removeItem(LOCAL_STORAGE_FAILED_KEY);
    }
  }

  // 3. Try server API endpoint if available
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normEmail, password }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem(LOCAL_STORAGE_LOCKED_KEY);
        localStorage.removeItem(LOCAL_STORAGE_FAILED_KEY);
      }
      return data;
    }
  } catch {
    // If backend endpoint is unavailable or during static dev, proceed to Supabase client / policy handler
  }

  // 4. Try Supabase Auth directly from client
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normEmail,
        password,
      });

      if (authError || !authData.user) {
        return handleFailedAttempt(authError?.message || "Kredensial tidak valid");
      }

      // Check role in public.users
      const { data: profile, error: profError } = await supabase
        .from("users")
        .select("id, nama, role_id, aktif, must_change_password")
        .eq("id", authData.user.id)
        .single();

      if (profError || !profile || !profile.aktif || profile.role_id !== "admin") {
        return {
          success: false,
          message: "Akses ditolak: Hanya peran admin aktif yang dapat masuk ke antarmuka.",
        };
      }

      localStorage.removeItem(LOCAL_STORAGE_LOCKED_KEY);
      localStorage.removeItem(LOCAL_STORAGE_FAILED_KEY);

      return {
        success: true,
        user: {
          id: profile.id,
          email: normEmail,
          nama: profile.nama,
          role_id: profile.role_id,
          must_change_password: profile.must_change_password,
        },
        sessionToken: authData.session.access_token,
      };
    } catch (err: any) {
      return handleFailedAttempt(err.message || "Gagal masuk Supabase");
    }
  }

  // 5. Fallback Demo Admin (when Supabase credentials not yet configured)
  if (normEmail === "admin@blsdm.komdigi.go.id" && password === "AdminBLSDM2026!Yogya") {
    localStorage.removeItem(LOCAL_STORAGE_LOCKED_KEY);
    localStorage.removeItem(LOCAL_STORAGE_FAILED_KEY);
    return {
      success: true,
      user: {
        id: "demo-admin-id",
        email: normEmail,
        nama: "Administrator BLSDM (Dev Demo)",
        role_id: "admin",
        must_change_password: false,
      },
      sessionToken: "demo-session-token",
    };
  }

  return handleFailedAttempt("Email atau kata sandi tidak valid.");
}

function handleFailedAttempt(message: string): LoginApiResponse {
  const currentAttempts = parseInt(localStorage.getItem(LOCAL_STORAGE_FAILED_KEY) || "0", 10) + 1;
  localStorage.setItem(LOCAL_STORAGE_FAILED_KEY, currentAttempts.toString());

  if (currentAttempts >= MAX_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_MS;
    localStorage.setItem(LOCAL_STORAGE_LOCKED_KEY, lockedUntil.toString());
    const remainingSeconds = Math.ceil(LOCKOUT_MS / 1000);
    return {
      success: false,
      isLockedOut: true,
      remainingSeconds,
      failedAttempts: currentAttempts,
      message: `Akun dikunci sementara karena 5 kali percobaan gagal. Coba lagi dalam 15 menit.`,
    };
  }

  return {
    success: false,
    isLockedOut: false,
    failedAttempts: currentAttempts,
    message: `${message} Sisa percobaan: ${MAX_ATTEMPTS - currentAttempts}.`,
  };
}

export async function clientLogout(userId?: string, email?: string, reason?: string) {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, email, reason }),
    });
  } catch {
    // ignore fetch error on logout
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
}

export async function clientFetchAuditLogs(): Promise<any[]> {
  try {
    const res = await fetch("/api/audit");
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .order("waktu", { ascending: false })
        .limit(50);
      if (data) return data;
    } catch {
      // ignore
    }
  }

  // Return initial demo audit log entries
  return [
    {
      id: 1,
      waktu: new Date().toISOString(),
      aksi: "sistem_diinisialisasi",
      objek: "EWS Capaian PK Talenta Digital",
      alasan: "Inisialisasi Fondasi Fase 1 UPT BLSDM Yogyakarta",
    },
    {
      id: 2,
      waktu: new Date(Date.now() - 3600000).toISOString(),
      aksi: "audit_kebijakan_keamanan",
      objek: "contracts/migrations/001_schema.sql",
      alasan: "RLS aktif, tanpa pendaftaran mandiri, password >= 12 karakter",
    },
  ];
}

// ==================== FASE 2: BATCH & FETCH CLIENT APIS ====================

export async function clientGetBatches(tahun?: number): Promise<any[]> {
  try {
    const url = tahun ? `/api/batches?tahun=${tahun}` : "/api/batches";
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Gagal mengambil batch:", err);
  }
  return [];
}

export async function clientRegisterBatches(inputs: any[], userId?: string): Promise<any> {
  const res = await fetch("/api/batches/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs, userId }),
  });
  return await res.json();
}

export async function clientFetchBatch(batchId: string, pemicu = "manual"): Promise<any> {
  const res = await fetch(`/api/batches/${batchId}/fetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pemicu }),
  });
  return await res.json();
}

export async function clientFetchAllBatches(tahun?: number, pemicu = "manual"): Promise<any> {
  const res = await fetch("/api/batches/fetch-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tahun, pemicu }),
  });
  return await res.json();
}

export async function clientUploadCsv(batchId: string, csvText: string): Promise<any> {
  const res = await fetch(`/api/batches/${batchId}/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvText }),
  });
  return await res.json();
}

export async function clientGetBatchDetail(batchId: string): Promise<any> {
  const res = await fetch(`/api/batches/${batchId}`);
  if (res.ok) {
    return await res.json();
  }
  return null;
}

// ==================== FASE 2: ANTREAN VALIDASI CLIENT APIS ====================

export async function clientGetValidationItems(status?: string): Promise<any[]> {
  try {
    const url = status ? `/api/validation?status=${status}` : "/api/validation";
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Gagal mengambil item validasi:", err);
  }
  return [];
}

export async function clientDecideValidationItem(
  id: string,
  status: "diterima" | "diubah" | "ditolak",
  catatan?: string,
  saran?: any,
  userId?: string
): Promise<any> {
  const res = await fetch(`/api/validation/${id}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, catatan, saran, userId }),
  });
  return await res.json();
}

// ==================== FASE 2: SETTINGS CLIENT APIS ====================

export async function clientGetSettings(): Promise<any> {
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Gagal mengambil pengaturan:", err);
  }
  return {
    noreg_stabil_lintas_batch: "belum_diverifikasi",
    catatan_lintas_batch_aktif: false,
    serviceAccount: { configured: false },
  };
}

export async function clientUpdateCrossBatchSettings(
  noregStabil: "ya" | "tidak" | "belum_diverifikasi",
  catatanAktif: boolean,
  userId?: string
): Promise<any> {
  const res = await fetch("/api/settings/cross-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      noreg_stabil_lintas_batch: noregStabil,
      catatan_lintas_batch_aktif: catatanAktif,
      userId,
    }),
  });
  return await res.json();
}
