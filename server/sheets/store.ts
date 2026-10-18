import { getSupabaseServerClient } from "../lib/supabaseServer.ts";
import type {
  BatchItem,
  PesertaMasked,
  Snapshot,
  ValidationItem,
  AgentRun,
  AgentRunStep,
} from "../../shared/types.ts";
import { PARAM_AWAL, type EwsParam } from "../lib/rules.ts";

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

export interface EwsPerubahanTingkatRow {
  id?: string;
  tanggal: string;
  tahun: number;
  batch_id: string | null;
  dari: string | null;
  ke: string;
  alasan?: string | null;
  k?: number | null;
  b?: number | null;
  r?: number | null;
  fase?: string | null;
  agent_run_id?: string | null;
}

// In-memory fallback stores for dev / when Supabase is not connected
const localBatches = new Map<string, BatchItem>();
const localAliasMaps = new Map<string, AliasMapRow>(); // key: `${batch_id}|${kunci_baris}`
const localPeserta = new Map<string, PesertaMasked[]>(); // key: batch_id
const localSnapshots = new Map<string, Snapshot[]>(); // key: batch_id
const localValidationItems = new Map<string, ValidationItem>();
const localFetchLogs: FetchLogRow[] = [];
const localAgentRuns = new Map<string, AgentRun>();
const localAgentRunSteps = new Map<string, AgentRunStep[]>(); // key: run_id
const localEwsPerubahan: EwsPerubahanTingkatRow[] = [];
const localRingkasanHarian = new Map<string, any>(); // key: `${tanggal}|${tahun}`
const localPengaturan = new Map<string, any>([
  ["noreg_stabil_lintas_batch", "belum_diverifikasi"],
  ["catatan_lintas_batch_aktif", false],
  ["ai_aktif", true],
  ["pemantauan_harian_aktif", true],
  ["jam_pemantauan_wib", "07:00"],
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

export async function getSnapshotsForBatch(batchId: string): Promise<Snapshot[]> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("snapshot")
        .select("*")
        .eq("batch_id", batchId)
        .order("tanggal", { ascending: true });
      if (!error && data && data.length > 0) return data as Snapshot[];
    } catch {
      // fallback
    }
  }
  return localSnapshots.get(batchId) || [];
}

export async function saveSnapshot(snapshot: Snapshot): Promise<Snapshot> {
  const list = localSnapshots.get(snapshot.batch_id) || [];
  const existingIdx = list.findIndex((s) => s.tanggal === snapshot.tanggal);
  if (existingIdx >= 0) {
    // Pertahankan ID asli jika memperbarui snapshot di hari yang sama
    snapshot.id = list[existingIdx].id;
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
        .upsert(snapshot, { onConflict: "batch_id,tanggal" })
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

// ==================== AGENT RUNS & STEPS ====================

export async function createAgentRun(run: {
  jenis: string;
  status?: AgentRun["status"];
  pemicu?: "manual" | "terjadwal";
  parameter?: Record<string, any> | null;
  model?: string | null;
  dimulai_oleh?: string | null;
}): Promise<AgentRun> {
  const id = generateId();
  const entry: AgentRun = {
    id,
    jenis: run.jenis,
    status: run.status || "menunggu",
    pemicu: run.pemicu || "manual",
    parameter: run.parameter || null,
    model: run.model || null,
    dimulai_oleh: run.dimulai_oleh || null,
    mulai: new Date().toISOString(),
    selesai: null,
  };

  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client.from("agent_runs").insert(entry).select().single();
      if (!error && data) {
        localAgentRuns.set(id, data as AgentRun);
        return data as AgentRun;
      }
    } catch {
      // fallback
    }
  }

  localAgentRuns.set(id, entry);
  return entry;
}

export async function updateAgentRun(
  id: string,
  updates: Partial<AgentRun>
): Promise<AgentRun | null> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("agent_runs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (!error && data) {
        localAgentRuns.set(id, data as AgentRun);
        return data as AgentRun;
      }
    } catch {
      // fallback
    }
  }

  const existing = localAgentRuns.get(id);
  if (existing) {
    const updated = { ...existing, ...updates };
    localAgentRuns.set(id, updated);
    return updated;
  }
  return null;
}

export async function addAgentRunStep(step: {
  run_id: string;
  urutan: number;
  nama: string;
  alat?: string | null;
  status?: AgentRunStep["status"];
  ringkasan?: string | null;
  data_dikirim_ai?: Record<string, any> | null;
  durasi_ms?: number | null;
  mulai?: string | null;
  selesai?: string | null;
}): Promise<AgentRunStep> {
  const id = generateId();
  const entry: AgentRunStep = {
    id,
    run_id: step.run_id,
    urutan: step.urutan,
    nama: step.nama,
    alat: step.alat || null,
    status: step.status || "menunggu",
    ringkasan: step.ringkasan || null,
    data_dikirim_ai: step.data_dikirim_ai || null,
    durasi_ms: step.durasi_ms ?? null,
    mulai: step.mulai || new Date().toISOString(),
    selesai: step.selesai || null,
  };

  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client.from("agent_run_steps").insert(entry).select().single();
      if (!error && data) {
        const list = localAgentRunSteps.get(step.run_id) || [];
        list.push(data as AgentRunStep);
        localAgentRunSteps.set(step.run_id, list);
        return data as AgentRunStep;
      }
    } catch {
      // fallback
    }
  }

  const list = localAgentRunSteps.get(step.run_id) || [];
  list.push(entry);
  localAgentRunSteps.set(step.run_id, list);
  return entry;
}

export async function getAgentRuns(limit = 50): Promise<AgentRun[]> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("agent_runs")
        .select("*")
        .order("mulai", { ascending: false })
        .limit(limit);
      if (!error && data && data.length > 0) return data as AgentRun[];
    } catch {
      // fallback
    }
  }

  return Array.from(localAgentRuns.values())
    .sort((a, b) => new Date(b.mulai).getTime() - new Date(a.mulai).getTime())
    .slice(0, limit);
}

export async function getAgentRunById(id: string): Promise<{ run: AgentRun; steps: AgentRunStep[] } | null> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data: run, error: errRun } = await client.from("agent_runs").select("*").eq("id", id).single();
      if (!errRun && run) {
        const { data: steps } = await client
          .from("agent_run_steps")
          .select("*")
          .eq("run_id", id)
          .order("urutan", { ascending: true });
        return { run: run as AgentRun, steps: (steps || []) as AgentRunStep[] };
      }
    } catch {
      // fallback
    }
  }

  const run = localAgentRuns.get(id);
  if (!run) return null;
  const steps = localAgentRunSteps.get(id) || [];
  return { run, steps };
}

// ==================== EWS PERUBAHAN TINGKAT ====================

export async function saveEwsPerubahanTingkat(entry: EwsPerubahanTingkatRow): Promise<void> {
  const id = entry.id || generateId();
  const row = { id, ...entry };

  const client = getSupabaseServerClient();
  if (client) {
    try {
      await client.from("ews_perubahan_tingkat").insert(row);
    } catch {
      // fallback
    }
  }

  localEwsPerubahan.unshift(row);
}

export async function getLatestEwsTingkat(batchId: string | null): Promise<string | null> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      let q = client.from("ews_perubahan_tingkat").select("ke").order("tanggal", { ascending: false }).limit(1);
      if (batchId) {
        q = q.eq("batch_id", batchId);
      } else {
        q = q.is("batch_id", null);
      }
      const { data, error } = await q.maybeSingle();
      if (!error && data) return data.ke;
    } catch {
      // fallback
    }
  }

  const match = localEwsPerubahan.find((r) => (batchId ? r.batch_id === batchId : r.batch_id === null));
  return match ? match.ke : null;
}

export async function getEwsPerubahanTingkat(batchId?: string, limit = 50): Promise<EwsPerubahanTingkatRow[]> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      let q = client.from("ews_perubahan_tingkat").select("*").order("tanggal", { ascending: false }).limit(limit);
      if (batchId) q = q.eq("batch_id", batchId);
      const { data, error } = await q;
      if (!error && data && data.length > 0) return data as EwsPerubahanTingkatRow[];
    } catch {
      // fallback
    }
  }

  if (batchId) {
    return localEwsPerubahan.filter((r) => r.batch_id === batchId).slice(0, limit);
  }
  return localEwsPerubahan.slice(0, limit);
}

// ==================== RINGKASAN HARIAN ====================

export async function saveRingkasanHarian(
  tanggal: string,
  tahun: number,
  isi: Record<string, any>,
  agentRunId?: string
): Promise<void> {
  const entry = {
    tanggal,
    tahun,
    isi,
    agent_run_id: agentRunId || null,
  };

  const client = getSupabaseServerClient();
  if (client) {
    try {
      await client.from("ringkasan_harian").upsert(entry, { onConflict: "tanggal,tahun" });
    } catch {
      // fallback
    }
  }

  localRingkasanHarian.set(`${tanggal}|${tahun}`, entry);
}

export async function getRingkasanHarian(tanggal: string, tahun: number): Promise<any | null> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("ringkasan_harian")
        .select("*")
        .eq("tanggal", tanggal)
        .eq("tahun", tahun)
        .single();
      if (!error && data) return data;
    } catch {
      // fallback
    }
  }

  return localRingkasanHarian.get(`${tanggal}|${tahun}`) || null;
}

// ==================== EWS PARAMETERS ====================

export async function getEwsParameters(): Promise<EwsParam> {
  const param: EwsParam = { ...PARAM_AWAL };
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from("ews_parameter")
        .select("kunci, nilai")
        .eq("rule_pack", "talenta_digital_v1");
      if (!error && data && data.length > 0) {
        for (const item of data) {
          const val = Number(item.nilai);
          if (item.kunci in param && !isNaN(val)) {
            (param as any)[item.kunci] = val;
          }
        }
      }
    } catch {
      // fallback
    }
  }
  return param;
}

