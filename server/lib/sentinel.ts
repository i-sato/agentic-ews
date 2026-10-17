import { containsIdentifier } from "./rules.ts";
import { catatAuditLog } from "./audit.ts";

export interface SentinelCheckResult {
  passed: boolean;
  blocked: boolean;
  reason?: string;
}

/**
 * Sentinel Keluar: Memeriksa teks yang akan dikirim ke Gemini atau dokumen laporan
 * terhadap daftar nomor registrasi yang sedang diproses dan pola PII umum.
 * Terdeteksi -> BLOKIR dan catat ke audit_log TANPA mengutip nilainya.
 */
export async function sentinelPeriksaKeluar(
  teks: string,
  daftarNoRegBatchIni: string[] = [],
  userId?: string | null
): Promise<SentinelCheckResult> {
  const isDetected = containsIdentifier(teks, daftarNoRegBatchIni);

  if (isDetected) {
    // Audit log pencatatan keamanan TANPA mengutip nilai PII atau nomor registrasi
    await catatAuditLog({
      userId: userId || null,
      aksi: "sentinel_keluar_diblokir",
      objek: "teks_keluar_ke_ai_atau_laporan",
      alasan: "Sentinel keluar mendeteksi adanya PII atau nomor registrasi peserta pada teks. Eksekusi diblokir demi kepatuhan UU No. 27/2022.",
      detail: {
        panjang_teks: teks.length,
        jumlah_noreg_diawasi: daftarNoRegBatchIni.length,
        blokir: true,
      },
    });

    return {
      passed: false,
      blocked: true,
      reason: "Teks diblokir oleh Sentinel Keluar: Terdeteksi nomor registrasi atau pola data pribadi (PII).",
    };
  }

  return {
    passed: true,
    blocked: false,
  };
}
