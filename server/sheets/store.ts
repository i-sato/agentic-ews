import { getSupabaseServerClient } from "../lib/supabaseServer.ts";
import type { BatchItem, PesertaMasked, Snapshot, ValidationItem } from "../../shared/types.ts";

export interface AliasMapRow {
  alias: string;
  batch_id: string;
  kunci_baris: string;
  no_registrasi: string | null;
  kunci_orang_noreg: string | null;
  kunci_orang_nama: string | null;
  created_at?: string;
}

export interface FetchLogRow {
  id?: string;
  batch_id: string;
  waktu?: string;
  pemicu: "cron" | "manual" | "unggah";
  hasil: string;
  ringkasan?: Record<string, any>;
  durasi_ms?: number;
}

// In-memory fallback stores for dev / when Supabase is not connected
const localBatches = new Map<string, BatchItem>();
const localAliasMaps = new Map<string, AliasMapRow>(); // key: `${batch_id}|${kunci_baris}`
const localPeserta = new Map<string, PesertaMasked[]>(); // key: batch_id
const localSnapshots = new Map<string, Snapshot[]>(); // key: batch_id
const localValidationItems = new Map<string, ValidationItem>();
const localFetchLogs: FetchLogRow[] = [];
const localPengaturan = new Map<string, any>([
  ["noreg_stabil_lintas_batch", "belum_diverifikasi"],
  ["catatan_lintas_batch_aktif", false],
  ["ai_aktif", true],
  ["pemantauan_harian_aktif", true],
]);

// Helper ID generator
function generateId(): string {
  return "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2, 14).padStart(12, "0");
}

export async function getBatches(tahun?: number): Promise<BatchItem[]> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      let query = client.from("batch").select("*");
      if (tahun) query = query.eq("tahun", tahun);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (!error && data) return data as BatchItem[];
    } catch (err) {
      console.error("[getBatches DB error]", err);
    }
  }

  const list = Array.from(localBatches.values());
  if (tahun) {
    return list.filter((b) => b.tahun === tahun);
  }
  return list;
}

export async function getBatchById(id: string): Promise<BatchItem | null> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client.from("batch").select("*").eq("id", id).single();
      if (!error && data) return data as BatchItem;
    } catch {
      // ignore
    }
  }
  return localBatches.get(id) || null;
}

export async function saveBatch(batch: BatchItem): Promise<BatchItem> {
  localBatches.set(batch.id, batch);
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client.from("batch").upsert(batch).select().single();
      if (!error && data) return data as BatchItem;
    } catch (err) {
      // fallback
    }
  }
  return batch;
}

export async function getAliasMapForBatch(batchId: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const client = getSupabaseServerClient();

  if (client) {
    try {
      const { data, error } = await client
        .from("private.alias_map" as any)
        .select("kunci_baris, alias")
        .eq("batch_id", batchId);
      if (!error && data && data.length > 0) {
        for (const row of data as any[]) {
          if (row.kunci_baris && row.alias) {
            map.set(row.kunci_baris, row.alias);
          }
        }
        return map;
      }
    } catch (err) {
      // fallback
    }
  }

  for (const item of localAliasMaps.values()) {
    if (item.batch_id === batchId && item.kunci_baris) {
      map.set(item.kunci_baris, item.alias);
    }
  }
  return map;
}

export async function saveAliasMapRows(rows: AliasMapRow[]): Promise<void> {
  if (rows.length === 0) return;

  for (const r of rows) {
    localAliasMaps.set(`${r.batch_id}|${r.kunci_baris}`, r);
  }

  const client = getSupabaseServerClient();
  if (client) {
    try {
      // Pastikan nama & instansi TIDAK PERNAH dikirim ke database
      const sanitized = rows.map((r) => ({
        alias: r.alias,
        batch_id: r.batch_id,
        kunci_baris: r.kunci_baris,
        no_registrasi: r.no_registrasi,
        kunci_orang_noreg: r.kunci_orang_noreg,
        kunci_orang_nama: r.kunci_orang_nama,
      }));
      await client.from("private.alias_map" as any).upsert(sanitized);
    } catch (err) {
      // fallback
    }
  }
}

export async function savePesertaMasked(batchId: string, peserta: PesertaMasked[]): Promise<void> {
  localPeserta.set(batchId, peserta);
  const client = getSupabaseServerClient();
  if (client) {
    try {
      await client.from("peserta_masked").delete().eq("batch_id", batchId);
      await client.from("peserta_masked").insert(peserta);
    } catch (err) {
      // fallback
    }
  }
}

export async function getPesertaMasked(batchId: string): Promise<PesertaMasked[]> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("peserta_masked")
        .select("*")
        .eq("batch_id", batchId);
      if (!error && data && data.length > 0) return data as PesertaMasked[];
    } catch {
      // fallback
    }
  }
  return localPeserta.get(batchId) || [];
}

export async function getLatestSnapshot(batchId: string): Promise<Snapshot | null> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("snapshot")
        .select("*")
        .eq("batch_id", batchId)
        .order("diambil_pada", { ascending: false })
        .limit(1)
        .single();
      if (!error && data) return data as Snapshot;
    } catch {
      // fallback
    }
  }

  const list = localSnapshots.get(batchId) || [];
  return list.length > 0 ? list[list.length - 1] : null;
}

export async function saveSnapshot(snapshot: Snapshot): Promise<Snapshot> {
  const list = localSnapshots.get(snapshot.batch_id) || [];
  const existingIdx = list.findIndex((s) => s.tanggal === snapshot.tanggal);
  if (existingIdx >= 0) {
    list[existingIdx] = snapshot;
  } else {
    list.push(snapshot);
  }
  localSnapshots.set(snapshot.batch_id, list);

  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("snapshot")
        .upsert(snapshot)
        .select()
        .single();
      if (!error && data) return data as Snapshot;
    } catch (err) {
      // fallback
    }
  }

  return snapshot;
}

export async function saveValidationItem(item: Omit<ValidationItem, "id"> & { id?: string }): Promise<ValidationItem> {
  const id = item.id || generateId();
  const fullItem: ValidationItem = {
    id,
    batch_id: item.batch_id || null,
    jenis: item.jenis,
    detail: item.detail,
    saran: item.saran || null,
    status: item.status || "terbuka",
    diputuskan_oleh: item.diputuskan_oleh || null,
    diputuskan_pada: item.diputuskan_pada || null,
  };

  localValidationItems.set(id, fullItem);

  const client = getSupabaseServerClient();
  if (client) {
    try {
      await client.from("validation_items").upsert(fullItem);
    } catch (err) {
      // fallback
    }
  }

  return fullItem;
}

export async function getValidationItems(status?: string): Promise<ValidationItem[]> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      let q = client.from("validation_items").select("*");
      if (status) q = q.eq("status", status);
      const { data, error } = await q.order("id", { ascending: false });
      if (!error && data && data.length > 0) return data as ValidationItem[];
    } catch {
      // fallback
    }
  }

  let items = Array.from(localValidationItems.values());
  if (status) {
    items = items.filter((it) => it.status === status);
  }
  return items;
}

export async function updateValidationItemStatus(
  id: string,
  status: "terbuka" | "diterima" | "diubah" | "ditolak",
  adminUserId?: string,
  saran?: any
): Promise<ValidationItem | null> {
  const client = getSupabaseServerClient();
  const timestamp = new Date().toISOString();

  if (client) {
    try {
      const { data, error } = await client
        .from("validation_items")
        .update({
          status,
          diputuskan_oleh: adminUserId || null,
          diputuskan_pada: timestamp,
          ...(saran ? { saran } : {}),
        })
        .eq("id", id)
        .select()
        .single();
      if (!error && data) return data as ValidationItem;
    } catch {
      // fallback
    }
  }

  const it = localValidationItems.get(id);
  if (it) {
    it.status = status;
    it.diputuskan_oleh = adminUserId || null;
    it.diputuskan_pada = timestamp;
    if (saran) it.saran = saran;
    localValidationItems.set(id, it);
    return it;
  }
  return null;
}

export async function saveFetchLog(log: FetchLogRow): Promise<void> {
  const id = log.id || generateId();
  const entry = {
    id,
    waktu: new Date().toISOString(),
    ...log,
  };

  const client = getSupabaseServerClient();
  if (client) {
    try {
      await client.from("fetch_log").insert(entry);
    } catch {
      // fallback
    }
  }
  localFetchLogs.unshift(entry);
}

export async function getPengaturan(kunci: string, defaultVal: any = null): Promise<any> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client.from("pengaturan").select("nilai").eq("kunci", kunci).single();
      if (!error && data) return data.nilai;
    } catch {
      // fallback
    }
  }
  return localPengaturan.has(kunci) ? localPengaturan.get(kunci) : defaultVal;
}

export async function setPengaturan(kunci: string, nilai: any): Promise<void> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      await client.from("pengaturan").upsert({ kunci, nilai, diubah_pada: new Date().toISOString() });
    } catch {
      // fallback
    }
  }
  localPengaturan.set(kunci, nilai);
}
