import {
  kunciBaris,
  petakanAlias,
  kunciOrang,
  hitungBatch,
  histogram,
  checksumRows,
  bandingkanSnapshot,
  hariIniWib,
  type Peserta,
  type Ringkas,
} from "../lib/rules.ts";
import {
  getBatchById,
  saveBatch,
  getAliasMapForBatch,
  saveAliasMapRows,
  savePesertaMasked,
  getPesertaMasked,
  getLatestSnapshot,
  saveSnapshot,
  saveValidationItem,
  saveFetchLog,
  getPengaturan,
  type AliasMapRow,
} from "./store.ts";
import type { BatchItem, PesertaMasked, Snapshot, ValidationItem } from "../../shared/types.ts";
import { catatAuditLog } from "../lib/audit.ts";

export interface ProcessSheetResult {
  success: boolean;
  batchId: string;
  pemicu: "cron" | "manual" | "unggah";
  ringkasan: {
    totalBaris: number;
    pesertaAktif: number;
    onboarding: number;
    lulus: number;
    capaian: number | null;
    batal: number;
    totalModul: number;
    aliasBaru: number;
    aliasHilang: number;
    kunciDuplikat: number;
    barisDibuang?: number;
    noRegKosong?: number;
  };
  anomali: string[];
  durasiMs: number;
  error?: string;
}

const DEFAULT_SECRET = process.env.ALIAS_HMAC_SECRET || "taldig-secret-key-blsdm-jogja-2026-secure-hmac";

/**
 * Memproses sheet data peserta, melakukan masking deterministik,
 * menghitung capaian & snapshot, membandingkan anomali, serta menyimpan log.
 *
 * PENTING: Data mentah nama dan instansi HANYA ada di memori selama pemrosesan,
 * TIDAK PERNAH DISIMPAN KE DATABASE DAN TIDAK PERNAH DI-LOG.
 */
export async function prosesSheet(
  batchId: string,
  rows: string[][],
  pemicu: "cron" | "manual" | "unggah" = "manual"
): Promise<ProcessSheetResult> {
  const tMulai = Date.now();

  const batch = await getBatchById(batchId);
  if (!batch) {
    throw new Error(`Batch dengan id '${batchId}' tidak ditemukan.`);
  }

  if (!rows || rows.length === 0) {
    await saveFetchLog({
      batch_id: batchId,
      pemicu,
      hasil: "gagal",
      ringkasan: { error: "Sheet kosong tanpa baris data" },
      durasi_ms: Date.now() - tMulai,
    });
    throw new Error("Sheet kosong tanpa baris data.");
  }

  // 1. Identifikasi Header Kolom
  const header = rows[0].map((h) => (h || "").trim());
  const headerLower = header.map((h) => h.toLowerCase());

  const colNama = headerLower.findIndex((h) => h.includes("nama") && !h.includes("program"));
  const colNoReg = headerLower.findIndex(
    (h) => h.includes("registrasi") || h.includes("no reg") || h === "noreg"
  );
  const colInstansi = headerLower.findIndex((h) => h.includes("instansi") || h.includes("lembaga"));
  const colStatus = headerLower.findIndex((h) => h === "status" || h === "status peserta");
  const colPersenLms = headerLower.findIndex((h) => h.includes("%") || h.includes("persen") || h.includes("progres"));

  // Cari semua kolom modul
  const modulIndices: number[] = [];
  header.forEach((h, idx) => {
    if (/^modul\s*\d+/i.test(h)) {
      modulIndices.push(idx);
    }
  });

  const totalModul = modulIndices.length > 0 ? modulIndices.length : (batch.total_modul || 28);

  // 2. Baca pengaturan catatan pembatalan lintas batch
  const noregStabilSetting = await getPengaturan("noreg_stabil_lintas_batch", "belum_diverifikasi");
  const catatanLintasBatchAktif = await getPengaturan("catatan_lintas_batch_aktif", false);

  // 3. Baca alias_map yang sudah ada dari database (private.alias_map)
  const existingAliasMap = await getAliasMapForBatch(batchId);

  // 4. Proses baris per baris di memori
  const dataRows = rows.slice(1);
  const rawKeyList: string[] = [];
  const rowTempData: Array<{
    noReg: string;
    nama: string;
    instansi: string;
    statusDaftar: string;
    isBatal: boolean;
    modulSelesai: number;
    persenLmsVal?: number;
    kunciBarisVal: string;
    kunciOrangVal: string | null;
  }> = [];

  let lmsMismatchCount = 0;
  let emptyNoRegCount = 0;
  let emptyRowsDiscarded = 0;

  for (let rIdx = 0; rIdx < dataRows.length; rIdx++) {
    const row = dataRows[rIdx];
    const rawNamaCell = colNama >= 0 ? (row[colNama] || "").trim() : "";
    const nama = rawNamaCell || (colNama >= 0 ? "" : `Peserta_${rIdx + 1}`);
    const noReg = colNoReg >= 0 ? (row[colNoReg] || "").trim() : "";
    const instansi = colInstansi >= 0 ? (row[colInstansi] || "").trim() : "";
    const statusDaftar = colStatus >= 0 ? (row[colStatus] || "").trim() : "Peserta";

    // Hitung ulang dari kolom modul (abaikan % LMS dan STATUS)
    let modulSelesai = 0;
    for (const mIdx of modulIndices) {
      const val = (row[mIdx] || "").trim().toLowerCase();
      if (val === "selesai" || val === "1" || val === "100%" || val === "lulus" || val === "completed") {
        modulSelesai++;
      }
    }

    // Identifikasi baris kosong atau baris label ringkasan (TOTAL, JUMLAH, REKAPITULASI)
    const isNonParticipantSummary =
      /^(total|jumlah|ringkasan|rekapitulasi)\b/i.test(nama) ||
      /^(total|jumlah|ringkasan|rekapitulasi)\b/i.test(row[0] || "");

    const hasAnyIdentity = Boolean(noReg || rawNamaCell || instansi);

    if (isNonParticipantSummary || (!hasAnyIdentity && modulSelesai === 0)) {
      emptyRowsDiscarded++;
      continue; // Buang baris kosong atau baris rekapitulasi
    }

    // Pembatalan dikeluarkan dari semua perhitungan
    const isBatal =
      statusDaftar.toLowerCase().includes("batal") ||
      statusDaftar.toLowerCase().includes("drop");

    // Periksa apakah LMS tidak cocok
    let persenLmsVal: number | undefined;
    if (colPersenLms >= 0) {
      const pText = (row[colPersenLms] || "").replace("%", "").trim();
      const pNum = parseFloat(pText);
      if (!isNaN(pNum)) {
        persenLmsVal = pNum;
        const modulCalcPersen = totalModul > 0 ? (modulSelesai / totalModul) * 100 : 0;
        if (Math.abs(modulCalcPersen - pNum) > 10) {
          lmsMismatchCount++;
        }
      }
    }

    // Validasi baris peserta yang sah tetapi tidak memiliki nomor registrasi
    if (!noReg) {
      emptyNoRegCount++;
    }

    // Kunci baris stabil per batch
    const kBaris = kunciBaris(DEFAULT_SECRET, batchId, { noReg, nama, instansi });
    rawKeyList.push(kBaris);

    // Kunci orang lintas batch (jika fitur aktif)
    let kOrang: string | null = null;
    if (catatanLintasBatchAktif && noregStabilSetting !== "belum_diverifikasi") {
      const mode = noregStabilSetting === "ya" ? "noreg" : "nama";
      kOrang = kunciOrang(DEFAULT_SECRET, { noReg, nama }, mode);
    }

    rowTempData.push({
      noReg,
      nama,
      instansi,
      statusDaftar,
      isBatal,
      modulSelesai,
      persenLmsVal,
      kunciBarisVal: kBaris,
      kunciOrangVal: kOrang,
    });
  }

  // 5. Petakan Alias (mapping yang sudah ada dipakai ulang; baris baru alias baru)
  const mappingResult = petakanAlias(existingAliasMap, rawKeyList, DEFAULT_SECRET, batchId);
  const assignedAliases = mappingResult.alias;

  // 6. Siapkan data alias_map baru untuk disimpan (HANYA ALIAS, KUNCI, DAN NO REGISTRASI)
  // Kolom nama dan instansi TIDAK DISIMPAN ke private.alias_map
  const newAliasMapRows: AliasMapRow[] = [];
  const pesertaMaskedList: PesertaMasked[] = [];
  const pesertaHitungList: Peserta[] = [];
  const curPerAlias = new Map<string, number>();

  for (let i = 0; i < rowTempData.length; i++) {
    const item = rowTempData[i];
    const alias = assignedAliases[i];

    // Simpan ke private.alias_map jika belum ada
    newAliasMapRows.push({
      alias,
      batch_id: batchId,
      kunci_baris: item.kunciBarisVal,
      no_registrasi: item.noReg || null,
      kunci_orang_noreg: noregStabilSetting === "ya" ? item.kunciOrangVal : null,
      kunci_orang_nama: noregStabilSetting === "tidak" ? item.kunciOrangVal : null,
    });

    const onb = item.modulSelesai * 10 >= totalModul * 9;
    const lul = item.modulSelesai === totalModul && totalModul > 0;

    pesertaMaskedList.push({
      id: "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2, 14).padStart(12, "0"),
      batch_id: batchId,
      alias,
      status_daftar: item.statusDaftar,
      modul_selesai: item.modulSelesai,
      total_modul: totalModul,
      onboarding: onb,
      lulus: lul,
      batal: item.isBatal,
    });

    if (!item.isBatal) {
      pesertaHitungList.push({
        modulSelesai: item.modulSelesai,
        totalModul,
        batal: false,
      });
      curPerAlias.set(alias, item.modulSelesai);
    }
  }

  // 7. Ambil data snapshot dan peserta sebelumnya SEBELUM upsert (sesuai SPEC Fase 2.3(e))
  const prevSnapshot = await getLatestSnapshot(batchId);
  const prevPeserta = await getPesertaMasked(batchId);
  const prevPerAlias = new Map<string, number>();
  for (const p of prevPeserta) {
    if (!p.batal) {
      prevPerAlias.set(p.alias, p.modul_selesai);
    }
  }

  // Simpan alias_map & peserta_masked ke store
  await saveAliasMapRows(newAliasMapRows);
  await savePesertaMasked(batchId, pesertaMaskedList);

  // 8. Hitung Capaian Batch Resmi
  const hitungRes = hitungBatch(pesertaHitungList);
  const hist = histogram(pesertaHitungList);
  const checksum = checksumRows(rows);
  const todayWib = hariIniWib(new Date());

  const prevRingkas: Ringkas | null = prevSnapshot
    ? {
        aktif: prevSnapshot.peserta_aktif,
        onboarding: prevSnapshot.onboarding,
        lulus: prevSnapshot.lulus,
        totalModul: prevSnapshot.total_modul || totalModul,
      }
    : null;

  const curRingkas: Ringkas = {
    aktif: hitungRes.aktif,
    onboarding: hitungRes.onboarding,
    lulus: hitungRes.lulus,
    totalModul,
  };

  const anomaliAudit = bandingkanSnapshot(
    prevRingkas,
    curRingkas,
    prevPerAlias.size > 0 ? prevPerAlias : null,
    curPerAlias,
    mappingResult.duplikat.length
  );

  const isBerubah = !prevSnapshot || prevSnapshot.checksum !== checksum;

  // 9. Simpan Snapshot Baru
  const snapshotData: Snapshot = {
    id: "00000000-0000-4000-8000-" + Math.random().toString(16).slice(2, 14).padStart(12, "0"),
    batch_id: batchId,
    tanggal: todayWib,
    diambil_pada: new Date().toISOString(),
    peserta_aktif: hitungRes.aktif,
    onboarding: hitungRes.onboarding,
    lulus: hitungRes.lulus,
    capaian: hitungRes.capaian,
    total_modul: totalModul,
    histogram: hist,
    checksum,
    berubah: isBerubah,
    anomali: anomaliAudit.anomali,
    sumber: pemicu === "unggah" ? "unggah_berkas" : "google_sheets_api",
    pemicu,
  };

  await saveSnapshot(snapshotData);

  // 10. Tambahkan ke Antrean Validasi jika ada anomali atau ketidakcocokan
  // Catat: jenis dibatasi sesuai kontrak '001_schema.sql' check (jenis in ('level','id_pelatihan','tema_tidak_dikenal','lintas_tahun','lms_tidak_cocok','tab_hilang','pk_formula','lainnya'))
  if (lmsMismatchCount > 0) {
    await saveValidationItem({
      batch_id: batchId,
      jenis: "lms_tidak_cocok",
      detail: {
        pesan: `Terdapat ${lmsMismatchCount} baris data dengan perselisihan antara kolom modul LMS dengan % LMS.`,
        lmsMismatchCount,
      },
      saran: { tindakan: "Perhitungan resmi tetap mengacu pada modul terselesaikan." },
      status: "terbuka",
    });
  }

  if (emptyNoRegCount > 0) {
    await saveValidationItem({
      batch_id: batchId,
      jenis: "lainnya",
      detail: {
        subjenis: "no_registrasi_kosong",
        pesan: `${emptyNoRegCount} baris tidak memiliki nomor registrasi, tidak dapat ditelusuri untuk tindak lanjut.`,
        emptyCount: emptyNoRegCount,
      },
      saran: { tindakan: "Verifikasi nomor registrasi pada sistem LMS asal." },
      status: "terbuka",
    });
  }

  for (const anomaliItem of anomaliAudit.anomali) {
    await saveValidationItem({
      batch_id: batchId,
      jenis: "lainnya",
      detail: {
        subjenis: anomaliItem,
        pesan: `Terdeteksi anomali saat sinkronisasi: ${anomaliItem}`,
        regresi: anomaliAudit.regresi,
        hilang: anomaliAudit.hilang,
        baru: anomaliAudit.baru,
      },
      saran: { tindakan: "Tinjau apakah ada perubahan struktur modul atau pembersihan data di LMS." },
      status: "terbuka",
    });
  }

  // 11. Perbarui last_fetch_* pada Batch
  batch.last_fetch_at = new Date().toISOString();
  batch.last_fetch_status = isBerubah ? "ok" : "tidak_berubah";
  batch.last_checksum = checksum;
  batch.total_modul = totalModul;
  await saveBatch(batch);

  // 12. Catat fetch_log
  const durasiMs = Date.now() - tMulai;
  await saveFetchLog({
    batch_id: batchId,
    pemicu,
    hasil: batch.last_fetch_status,
    ringkasan: {
      aktif: hitungRes.aktif,
      onboarding: hitungRes.onboarding,
      lulus: hitungRes.lulus,
      capaian: hitungRes.capaian,
      baru: mappingResult.baru,
      hilang: mappingResult.hilang.length,
      anomali: anomaliAudit.anomali,
      total_baris_sheet: rows.length,
      baris_kosong_diabaikan: emptyRowsDiscarded,
      no_registrasi_kosong: emptyNoRegCount,
    },
    durasi_ms: durasiMs,
  });

  // 13. Audit Log Sinkronisasi
  await catatAuditLog({
    aksi: pemicu === "unggah" ? "unggah_berkas_batch" : "fetch_sheet_batch",
    objek: batch.id_pelatihan || batch.nama_berkas,
    alasan: `Sinkronisasi batch selesai: ${hitungRes.aktif} peserta aktif, ${hitungRes.lulus} lulus (${(hitungRes.capaian || 0).toFixed(1)}%).`,
    detail: {
      batchId,
      pemicu,
      anomaliCount: anomaliAudit.anomali.length,
      barisDibuang: emptyRowsDiscarded,
      durasiMs,
    },
  });

  // Kembalikan HANYA ringkasan agregat, TIDAK ADA BARIS MENTAH
  return {
    success: true,
    batchId,
    pemicu,
    ringkasan: {
      totalBaris: dataRows.length,
      pesertaAktif: hitungRes.aktif,
      onboarding: hitungRes.onboarding,
      lulus: hitungRes.lulus,
      capaian: hitungRes.capaian,
      batal: rowTempData.filter((x) => x.isBatal).length,
      totalModul,
      aliasBaru: mappingResult.baru,
      aliasHilang: mappingResult.hilang.length,
      kunciDuplikat: mappingResult.duplikat.length,
      barisDibuang: emptyRowsDiscarded,
      noRegKosong: emptyNoRegCount,
    },
    anomali: anomaliAudit.anomali,
    durasiMs,
  };
}
