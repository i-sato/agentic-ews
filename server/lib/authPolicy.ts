import { catatAuditLog } from "./audit.ts";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 menit
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 menit

interface LockoutRecord {
  failedAttempts: number;
  lockedUntil: number | null;
  lastAttemptAt: number;
}

const lockoutStore = new Map<string, LockoutRecord>();

export function validatePasswordPolicy(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `Kata sandi harus memiliki minimal ${MIN_PASSWORD_LENGTH} karakter sesuai kebijakan keamanan.`,
    };
  }
  return { valid: true };
}

export function checkLockout(email: string): { isLocked: boolean; remainingSeconds: number; failedAttempts: number } {
  const normEmail = email.trim().toLowerCase();
  const record = lockoutStore.get(normEmail);

  if (!record) {
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
  }

  const now = Date.now();
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, remainingSeconds, failedAttempts: record.failedAttempts };
  }

  if (record.lockedUntil && record.lockedUntil <= now) {
    // Reset lockout after expiry
    lockoutStore.delete(normEmail);
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0 };
  }

  return { isLocked: false, remainingSeconds: 0, failedAttempts: record.failedAttempts };
}

export async function recordFailedLogin(email: string, reason = "kata_sandi_salah", ip = "unknown") {
  const normEmail = email.trim().toLowerCase();
  const now = Date.now();
  let record = lockoutStore.get(normEmail);

  if (!record) {
    record = { failedAttempts: 0, lockedUntil: null, lastAttemptAt: now };
  }

  record.failedAttempts += 1;
  record.lastAttemptAt = now;

  let isLocked = false;
  let remainingSeconds = 0;

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    isLocked = true;
    remainingSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);

    // Audit log account lockout
    await catatAuditLog({
      aksi: "penguncian_akun_sementara",
      objek: normEmail,
      alasan: `Gagal login ${record.failedAttempts} kali berturut-turut. Akun dikunci sementara selama 15 menit.`,
      detail: { ip, attempts: record.failedAttempts, lockedUntil: new Date(record.lockedUntil).toISOString() },
    });
  } else {
    // Audit log failed attempt
    await catatAuditLog({
      aksi: "login_gagal",
      objek: normEmail,
      alasan: reason,
      detail: { ip, attemptNumber: record.failedAttempts, maxAllowed: MAX_FAILED_ATTEMPTS },
    });
  }

  lockoutStore.set(normEmail, record);
  return { isLocked, remainingSeconds, failedAttempts: record.failedAttempts };
}

export async function recordSuccessfulLogin(userId: string, email: string, ip = "unknown") {
  const normEmail = email.trim().toLowerCase();
  lockoutStore.delete(normEmail);

  await catatAuditLog({
    userId,
    aksi: "login_berhasil",
    objek: normEmail,
    alasan: "Autentikasi admin berhasil",
    detail: { ip, timestamp: new Date().toISOString() },
  });
}

export async function recordLogout(userId?: string | null, email?: string | null, reason = "pengguna_keluar") {
  await catatAuditLog({
    userId: userId || null,
    aksi: "logout",
    objek: email || "unknown",
    alasan: reason === "inactivity_timeout" ? "Sesi berakhir otomatis setelah 30 menit tidak aktif" : "Pengguna melakukan logout manual",
    detail: { reason, timestamp: new Date().toISOString() },
  });
}
