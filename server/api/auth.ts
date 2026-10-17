import { getSupabaseServerClient } from "../lib/supabaseServer";
import {
  validatePasswordPolicy,
  checkLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
  recordLogout,
} from "../lib/authPolicy";
import { catatAuditLog } from "../lib/audit";

export interface LoginRequest {
  email: string;
  password: string;
  ip?: string;
}

export interface LoginResponse {
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

export async function handleAdminLogin(req: LoginRequest): Promise<LoginResponse> {
  const email = (req.email || "").trim().toLowerCase();
  const password = req.password || "";
  const ip = req.ip || "127.0.0.1";

  if (!email || !password) {
    return {
      success: false,
      message: "Email dan kata sandi wajib diisi.",
    };
  }

  // 1. Check lockout status
  const lockout = checkLockout(email);
  if (lockout.isLocked) {
    return {
      success: false,
      isLockedOut: true,
      remainingSeconds: lockout.remainingSeconds,
      failedAttempts: lockout.failedAttempts,
      message: `Akun dikunci sementara karena 5 kali percobaan gagal. Coba lagi dalam ${Math.ceil(
        lockout.remainingSeconds / 60
      )} menit.`,
    };
  }

  // 2. Validate password policy (>= 12 characters)
  const policyCheck = validatePasswordPolicy(password);
  if (!policyCheck.valid) {
    const failed = await recordFailedLogin(email, "kata_sandi_kurang_dari_12_karakter", ip);
    return {
      success: false,
      isLockedOut: failed.isLocked,
      remainingSeconds: failed.remainingSeconds,
      failedAttempts: failed.failedAttempts,
      message: policyCheck.message,
    };
  }

  // 3. Authenticate with Supabase
  const client = getSupabaseServerClient();

  if (client) {
    try {
      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        const failed = await recordFailedLogin(email, authError?.message || "Kredensial salah", ip);
        return {
          success: false,
          isLockedOut: failed.isLocked,
          remainingSeconds: failed.remainingSeconds,
          failedAttempts: failed.failedAttempts,
          message: failed.isLocked
            ? `Akun dikunci sementara karena 5 kali kegagalan. Coba lagi dalam 15 menit.`
            : `Email atau kata sandi tidak valid. Sisa percobaan: ${5 - failed.failedAttempts}.`,
        };
      }

      // Check user record in public.users to ensure role_id is admin and active
      const { data: userProfile, error: profileError } = await client
        .from("users")
        .select("id, nama, role_id, aktif, must_change_password")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !userProfile || !userProfile.aktif) {
        await recordFailedLogin(email, "pengguna_tidak_aktif_atau_tidak_terdaftar", ip);
        return {
          success: false,
          message: "Akun tidak terdaftar sebagai pengguna aktif dalam sistem.",
        };
      }

      if (userProfile.role_id !== "admin") {
        await catatAuditLog({
          userId: userProfile.id,
          aksi: "akses_ditolak_bukan_admin",
          objek: email,
          alasan: `Peran ${userProfile.role_id} mencoba masuk antarmuka admin MVP-1`,
        });
        return {
          success: false,
          message: "Hanya peran Administrator yang memiliki akses pada sistem MVP-1.",
        };
      }

      // Record successful login
      await recordSuccessfulLogin(userProfile.id, email, ip);

      return {
        success: true,
        user: {
          id: userProfile.id,
          email,
          nama: userProfile.nama,
          role_id: userProfile.role_id,
          must_change_password: userProfile.must_change_password,
        },
        sessionToken: authData.session?.access_token,
      };
    } catch (err: any) {
      console.error("[Login Exception]", err);
      return {
        success: false,
        message: err.message || "Terjadi kesalahan saat verifikasi server.",
      };
    }
  }

  // Fallback demo/mock mode when Supabase credentials are not yet configured in environment
  // Let the user know credentials need to be set in Supabase, but allow demo admin verification
  if (email === "admin@blsdm.komdigi.go.id" && password === "AdminBLSDM2026!Yogya") {
    await recordSuccessfulLogin("demo-admin-id", email, ip);
    return {
      success: true,
      user: {
        id: "demo-admin-id",
        email,
        nama: "Administrator BLSDM (Dev Demo)",
        role_id: "admin",
        must_change_password: false,
      },
      sessionToken: "demo-session-token",
    };
  }

  const failed = await recordFailedLogin(email, "kredensial_salah_demo_mode", ip);
  return {
    success: false,
    isLockedOut: failed.isLocked,
    remainingSeconds: failed.remainingSeconds,
    failedAttempts: failed.failedAttempts,
    message: failed.isLocked
      ? `Akun dikunci sementara karena 5 kali kegagalan. Coba lagi dalam 15 menit.`
      : `Email atau kata sandi tidak valid. Sisa percobaan: ${5 - failed.failedAttempts}.`,
  };
}

export async function handleAdminLogout(userId?: string, email?: string, reason?: string) {
  await recordLogout(userId, email, reason);
  return { success: true };
}
