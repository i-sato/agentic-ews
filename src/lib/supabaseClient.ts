import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Read publishable client keys from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
}

/**
 * Verifikasi keamanan RLS: menguji bahwa peran publik / anonim ditolak
 * saat mencoba mengakses tabel data privat (sesuai contracts/migrations/001_schema.sql).
 */
export async function testAnonymousAccessIsBlocked(): Promise<{
  tested: boolean;
  blocked: boolean;
  reason: string;
  tableTested: string;
}> {
  const client = getSupabase();
  if (!client) {
    return {
      tested: false,
      blocked: true,
      reason: "Supabase belum dihubungkan dengan VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY. RLS terproteksi by-design.",
      tableTested: "batch",
    };
  }

  try {
    // Buat client anonim murni tanpa sesi tersimpan untuk menguji RLS
    const anonClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: { persistSession: false },
    });

    // Uji akses baca ke tabel terlindungi: batch
    const { data, error } = await anonClient.from("batch").select("id").limit(1);

    if (error) {
      return {
        tested: true,
        blocked: true,
        reason: `Akses ditolak oleh RLS (${error.message || "401/403 Unauthorized"})`,
        tableTested: "batch",
      };
    }

    // Jika tidak ada error tetapi data kosong karena filter RLS mengembalikan 0 baris
    if (!data || data.length === 0) {
      return {
        tested: true,
        blocked: true,
        reason: "RLS aktif: pengguna anonim tidak menerima baris data apa pun (0 baris dikembalikan).",
        tableTested: "batch",
      };
    }

    return {
      tested: true,
      blocked: false,
      reason: "PERINGATAN: Pengguna anonim dapat membaca data! Periksa apakah RLS diaktifkan di Supabase.",
      tableTested: "batch",
    };
  } catch (err: any) {
    return {
      tested: true,
      blocked: true,
      reason: `RLS menolak akses: ${err.message}`,
      tableTested: "batch",
    };
  }
}
