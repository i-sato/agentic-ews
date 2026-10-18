import { jalankanPemantauanHarian } from "../cron/pantauHarian.ts";

export interface CronResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Handler endpoint cron harian /api/cron/pantau-harian
 * Memvalidasi Authorization: Bearer ${CRON_SECRET}
 */
export async function handleCronPantauHarian(
  authHeader: string | undefined | null,
  options?: { tahun?: number; forceAll?: boolean }
): Promise<{ status: number; data: CronResponse }> {
  const cronSecret = process.env.CRON_SECRET;

  // Jika CRON_SECRET tidak diatur atau header Authorization tidak cocok -> 401
  if (!cronSecret || !cronSecret.trim()) {
    return {
      status: 401,
      data: {
        success: false,
        error: "CRON_SECRET belum dikonfigurasi di server.",
      },
    };
  }

  const expectedHeader = `Bearer ${cronSecret.trim()}`;
  if (!authHeader || authHeader.trim() !== expectedHeader) {
    return {
      status: 401,
      data: {
        success: false,
        error: "Akses tidak sah: Header Authorization tidak valid.",
      },
    };
  }

  try {
    const hasil = await jalankanPemantauanHarian({
      pemicu: "terjadwal",
      tahun: options?.tahun,
      forceAll: options?.forceAll,
    });

    return {
      status: 200,
      data: {
        success: hasil.success,
        message: `Pemantauan harian selesai dengan status: ${hasil.status}`,
        data: hasil,
      },
    };
  } catch (err: any) {
    return {
      status: 500,
      data: {
        success: false,
        error: `Kesalahan saat menjalankan pemantauan harian: ${err.message}`,
      },
    };
  }
}
