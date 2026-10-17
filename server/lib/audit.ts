import { getSupabaseServerClient } from "./supabaseServer.ts";

export interface AuditParams {
  userId?: string | null;
  aksi: string;
  objek?: string | null;
  alasan?: string | null;
  detail?: Record<string, any> | null;
}

// In-memory buffer for local dev / when Supabase is not connected
const fallbackAuditLogs: Array<AuditParams & { id: number; waktu: string }> = [];
let localIdCounter = 1;

export async function catatAuditLog(params: AuditParams): Promise<boolean> {
  const client = getSupabaseServerClient();
  const timestamp = new Date().toISOString();

  // Always keep in local memory for dev/test verification
  fallbackAuditLogs.unshift({
    id: localIdCounter++,
    waktu: timestamp,
    ...params,
  });
  if (fallbackAuditLogs.length > 500) {
    fallbackAuditLogs.pop();
  }

  if (!client) {
    return true;
  }

  try {
    const { error } = await client.from("audit_log").insert({
      user_id: params.userId || null,
      aksi: params.aksi,
      objek: params.objek || null,
      alasan: params.alasan || null,
      detail: params.detail || null,
      waktu: timestamp,
    });

    if (error) {
      console.error("[AuditLog Error]", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[AuditLog Exception]", err);
    return false;
  }
}

export function getLocalAuditLogs() {
  return [...fallbackAuditLogs];
}
