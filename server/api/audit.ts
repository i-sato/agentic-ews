import { getSupabaseServerClient } from "../lib/supabaseServer";
import { getLocalAuditLogs, catatAuditLog } from "../lib/audit";

export async function fetchAuditLogs(limit = 100) {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("audit_log")
        .select("*")
        .order("waktu", { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.error("[fetchAuditLogs error]", err);
    }
  }

  // Fallback to in-memory logs
  return getLocalAuditLogs().slice(0, limit);
}

export async function logAction(
  userId: string | null,
  aksi: string,
  objek?: string | null,
  alasan?: string | null,
  detail?: Record<string, any> | null
) {
  return await catatAuditLog({
    userId,
    aksi,
    objek,
    alasan,
    detail,
  });
}
