import { parseSheetUrl, bacaGoogleSheet, parseCsvRows, getServiceAccountInfo } from "../sheets/reader.ts";
import { prosesSheet, ProcessSheetResult } from "../sheets/processor.ts";
import {
  getBatches,
  getBatchById,
  saveBatch,
  getLatestSnapshot,
  getPesertaMasked,
  saveValidationItem,
} from "../sheets/store.ts";
import { parseNamaBerkas, normalisasiLevel, hariIniWib } from "../lib/rules.ts";
import type { BatchItem } from "../../shared/types.ts";
import { catatAuditLog } from "../lib/audit.ts";

export interface RegisterBatchInput {
  url: string;
  namaBerkas?: string;
  idPelatihan?: string | null;
  tema?: string | null;
  level?: "Fundamental" | "Intermediate" | null;
  levelSource?: "nama_berkas" | "manual" | "program_ref" | "belum";
  tanggalMulai?: string | null;
  tanggalSelesai?: string | null;
  tahun?: number | null;
}

export interface RegisterBatchResult {
  success: boolean;
  registeredCount: number;
  batches: BatchItem[];
  duplicates: string[];
  errors: string[];
}

/**
 * Pendaftaran batch dari tautan Google Sheets (boleh banyak, satu per baris)
 */
export async function handleRegisterBatches(
  inputs: RegisterBatchInput[],
  userId?: string
): Promise<RegisterBatchResult> {
  const existingBatches = await getBatches();
  const registered: BatchItem[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];

  for (const item of inputs) {
    const rawUrl = (item.url || "").trim();
    if (!rawUrl) continue;

    const parsedUrl = parseSheetUrl(rawUrl);
    const sheetId = parsedUrl ? parsedUrl.sheetId : null;
    const sheetGid = parsedUrl ? parsedUrl.gid : null;

    // Nama berkas default dari input atau ekstrak nama
    let namaBerkas = (item.namaBerkas || "").trim();
    if (!namaBerkas && sheetId) {
      namaBerkas = `Google Sheet ${sheetId.slice(0, 10)}`;
    }

    // Parse nama berkas dengan parseNamaBerkas deterministik
    const parseRes = parseNamaBerkas(namaBerkas);

    const idPelatihan = item.idPelatihan !== undefined
      ? item.idPelatihan
      : parseRes.idPelatihan;

    const tema = item.tema !== undefined
      ? item.tema
      : parseRes.temaAtauAlias;

    // Normalisasi level
    let level = item.level;
    let levelSource = item.levelSource || (level ? "manual" : "belum");

    if (!level) {
      const norm = normalisasiLevel(namaBerkas);
      if (norm) {
        level = norm;
        levelSource = "nama_berkas";
      } else {
        level = null;
        levelSource = "belum";
      }
    }

    // Tanggal
    let tglMulai = item.tanggalMulai || null;
    let tglSelesai = item.tanggalSelesai || null;
    let tahunAnggaran = item.tahun || 2026;

    if (!tglMulai && parseRes.tglMulai) {
      const d = String(parseRes.tglMulai.d).padStart(2, "0");
      const m = String(parseRes.tglMulai.m).padStart(2, "0");
      tglMulai = `${tahunAnggaran}-${m}-${d}`;
    }
    if (!tglSelesai && parseRes.tglSelesai) {
      const d = String(parseRes.tglSelesai.d).padStart(2, "0");
      const m = String(parseRes.tglSelesai.m).padStart(2, "0");
      tglSelesai = `${tahunAnggaran}-${m}-${d}`;
    }

    if (tglMulai) {
      // Tahun Anggaran otomatis ditentukan dari tanggal mulai batch
      tahunAnggaran = parseInt(tglMulai.slice(0, 4), 10) || tahunAnggaran;
    }

    // 1. Validasi Duplikasi: (id_pelatihan + tahun) atau (sheet_id + sheet_gid)
    const isDupId = idPelatihan && existingBatches.some(
      (b) => b.id_pelatihan === idPelatihan && b.tahun === tahunAnggaran
    );

    const isDupSheet = sheetId && existingBatches.some(
      (b) => b.sheet_id === sheetId && (b.sheet_gid || null) === (sheetGid || null)
    );

    if (isDupId || isDupSheet) {
      const reason = isDupId
        ? `ID Pelatihan ${idPelatihan} pada TA ${tahunAnggaran} sudah terdaftar.`
        : `Tautan sheet (${sheetId}) sudah terdaftar dalam sistem.`;
      duplicates.push(reason);
      continue;
    }

    // 2. Tentukan status validasi dan masuk_capaian_pk
    // Fundamental terkonfirmasi -> masuk_capaian_pk: true
    // Intermediate / level belum terkonfirmasi -> masuk_capaian_pk: false
    const isFundamental = level === "Fundamental";
    const isLevelConfirmed = levelSource !== "belum" && Boolean(level);
    const masukCapaianPk = isFundamental && isLevelConfirmed;

    const validasiStatus = !isLevelConfirmed
      ? "perlu_validasi"
      : parseRes.keyakinan === "rendah"
      ? "valid_dengan_peringatan"
      : "valid";

    const newBatchId = "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2, 14).padStart(12, "0");

    const newBatch: BatchItem = {
      id: newBatchId,
      id_pelatihan: idPelatihan,
      tema: tema,
      alias: tema,
      nama_program: `Talenta Digital - ${tema || idPelatihan || "Pelatihan"}`,
      level,
      level_source: levelSource,
      tahun: tahunAnggaran,
      tanggal_mulai: tglMulai,
      tanggal_selesai: tglSelesai,
      cross_year: Boolean(tglMulai && tglSelesai && tglMulai.slice(0, 4) !== tglSelesai.slice(0, 4)),
      nama_berkas: namaBerkas,
      sheet_url: rawUrl,
      sheet_id: sheetId,
      sheet_gid: sheetGid,
      tab_nama: "All Pendaftar Web",
      total_modul: null,
      masuk_capaian_pk: masukCapaianPk,
      validasi_status: validasiStatus,
      dipantau: true,
      last_fetch_at: null,
      last_fetch_status: null,
      created_by: userId || null,
      created_at: new Date().toISOString(),
    };

    await saveBatch(newBatch);
    existingBatches.push(newBatch);
    registered.push(newBatch);

    // Jika level belum terkonfirmasi, catat ke Antrean Validasi
    if (!isLevelConfirmed) {
      await saveValidationItem({
        batch_id: newBatchId,
        jenis: "level",
        detail: {
          pesan: `Level batch '${namaBerkas}' belum terkonfirmasi secara pasti. Diproses sementara dan belum masuk capaian resmi.`,
          sumber: levelSource,
        },
        saran: { level: "Fundamental", catatan: "Sebagian besar pelatihan UPT merupakan level Fundamental/Basic." },
        status: "terbuka",
      });
    }

    await catatAuditLog({
      userId: userId || null,
      aksi: "tambah_batch",
      objek: idPelatihan || namaBerkas,
      alasan: `Mendaftarkan batch baru via tautan sheet (TA ${tahunAnggaran})`,
      detail: { id: newBatchId, sheetId, level, masukCapaianPk },
    });
  }

  return {
    success: registered.length > 0,
    registeredCount: registered.length,
    batches: registered,
    duplicates,
    errors,
  };
}

/**
 * Mengambil (fetch) data sheet untuk satu batch
 */
export async function handleFetchBatch(
  batchId: string,
  pemicu: "manual" | "cron" = "manual"
): Promise<ProcessSheetResult> {
  const batch = await getBatchById(batchId);
  if (!batch) {
    throw new Error(`Batch '${batchId}' tidak ditemukan.`);
  }

  if (!batch.sheet_id) {
    throw new Error("Batch tidak memiliki tautan Google Sheets terdaftar.");
  }

  // 1. Baca data dari Google Sheet
  const readRes = await bacaGoogleSheet(batch.sheet_id, batch.tab_nama || "All Pendaftar Web");

  if (!readRes.success || !readRes.rows) {
    batch.last_fetch_at = new Date().toISOString();
    batch.last_fetch_status = readRes.status;
    batch.last_fetch_error = readRes.error || "Gagal membaca Google Sheets";
    await saveBatch(batch);

    // Jika tab hilang atau akses ditolak, buat item validasi
    if (readRes.status === "tab_hilang") {
      await saveValidationItem({
        batch_id: batchId,
        jenis: "tab_hilang",
        detail: {
          pesan: readRes.error,
          tabDicari: batch.tab_nama || "All Pendaftar Web",
        },
        saran: { tindakan: "Periksa nama tab pada Google Sheet atau ubah konfigurasi tab_nama." },
        status: "terbuka",
      });
    }

    return {
      success: false,
      batchId,
      pemicu,
      ringkasan: {
        totalBaris: 0,
        pesertaAktif: 0,
        onboarding: 0,
        lulus: 0,
        capaian: null,
        batal: 0,
        totalModul: batch.total_modul || 28,
        aliasBaru: 0,
        aliasHilang: 0,
        kunciDuplikat: 0,
      },
      anomali: [readRes.status],
      durasiMs: 0,
      error: readRes.error,
    };
  }

  // Jika nama berkas belum terbaca, update dengan judul sheet dari metadata Google
  if (readRes.title && batch.nama_berkas.startsWith("Google Sheet")) {
    batch.nama_berkas = readRes.title;
    await saveBatch(batch);
  }

  // 2. Proses sheet dengan fungsi inti prosesSheet
  return await prosesSheet(batchId, readRes.rows, pemicu);
}

/**
 * Perbarui semua batch aktif sekaligus (Tombol 'Perbarui Semua')
 */
export async function handleFetchAllBatches(
  tahun?: number,
  pemicu: "manual" | "cron" = "manual"
): Promise<{ total: number; successCount: number; results: ProcessSheetResult[] }> {
  const allBatches = await getBatches(tahun);
  const activeBatches = allBatches.filter((b) => b.dipantau && b.sheet_id);

  const results: ProcessSheetResult[] = [];
  let successCount = 0;

  for (const b of activeBatches) {
    try {
      const res = await handleFetchBatch(b.id, pemicu);
      results.push(res);
      if (res.success) successCount++;
    } catch (err: any) {
      results.push({
        success: false,
        batchId: b.id,
        pemicu,
        ringkasan: {
          totalBaris: 0,
          pesertaAktif: 0,
          onboarding: 0,
          lulus: 0,
          capaian: null,
          batal: 0,
          totalModul: b.total_modul || 28,
          aliasBaru: 0,
          aliasHilang: 0,
          kunciDuplikat: 0,
        },
        anomali: ["gagal_fetch"],
        durasiMs: 0,
        error: err.message,
      });
    }
  }

  return {
    total: activeBatches.length,
    successCount,
    results,
  };
}

/**
 * Unggah berkas cadangan (.csv)
 */
export async function handleUploadBatchCsv(
  batchId: string,
  csvText: string
): Promise<ProcessSheetResult> {
  const rows = parseCsvRows(csvText);
  return await prosesSheet(batchId, rows, "unggah");
}
