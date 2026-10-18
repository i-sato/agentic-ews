import {
  hariIniWib,
  pemantauanAktif,
  dataBasi,
  evaluasiPortofolio,
  type TargetBerlaku,
  type BatchPantau,
} from "../lib/rules.ts";
import {
  getBatches,
  getLatestSnapshot,
  getPengaturan,
  getEwsParameters,
  createAgentRun,
  updateAgentRun,
  addAgentRunStep,
  saveEwsPerubahanTingkat,
  getLatestEwsTingkat,
  saveRingkasanHarian,
} from "../sheets/store.ts";
import { handleFetchBatch } from "../api/batch.ts";
import { catatAuditLog } from "../lib/audit.ts";

export interface PemantauanOptions {
  pemicu: "terjadwal" | "manual";
  tahun?: number;
  userId?: string;
  forceAll?: boolean; // Paksa perbarui semua tanpa cek dataBasi
}

export interface HasilPemantauanHarian {
  success: boolean;
  runId?: string;
  status: "selesai" | "selesai_dengan_peringatan" | "gagal" | "dilewati";
  alasan?: string;
  tanggalWib: string;
  tahun: number;
  totalBatchDipantau: number;
  batchDiproses: number;
  suksesCount: number;
  gagalCount: number;
  portofolio?: {
    tingkat: string;
    alasan: string;
    K: number;
    B: number;
    R: number | null;
  };
  kumulatif?: {
    onboarding: number;
    lulus: number;
    capaian: number | null;
  };
  durasiMs: number;
}

/**
 * Orkestrasi Pemantauan Harian
 * Menjalankan fetch batch aktif, evaluasi EWS deterministik, dan pencatatan ringkasan harian
 */
export async function jalankanPemantauanHarian(
  options: PemantauanOptions
): Promise<HasilPemantauanHarian> {
  const tMulai = Date.now();
  const now = new Date();
  const todayWib = hariIniWib(now);
  const nowIso = now.toISOString();

  // 1. Periksa Pengaturan Pemantauan Harian
  const pemantauanAktifConfig = await getPengaturan("pemantauan_harian_aktif", true);
  if (!pemantauanAktifConfig && options.pemicu === "terjadwal") {
    return {
      success: true,
      status: "dilewati",
      alasan: "Pemantauan harian terjadwal dinonaktifkan di pengaturan sistem.",
      tanggalWib: todayWib,
      tahun: options.tahun || parseInt(todayWib.slice(0, 4), 10),
      totalBatchDipantau: 0,
      batchDiproses: 0,
      suksesCount: 0,
      gagalCount: 0,
      durasiMs: Date.now() - tMulai,
    };
  }

  const tahun = options.tahun || parseInt(todayWib.slice(0, 4), 10);

  // 2. Buat Catatan agent_runs
  const run = await createAgentRun({
    jenis: "pemantauan_harian",
    status: "berjalan",
    pemicu: options.pemicu,
    parameter: {
      tahun,
      tanggal: todayWib,
      pemicu: options.pemicu,
    },
    dimulai_oleh: options.userId || null,
  });

  const param = await getEwsParameters();
  const allBatches = await getBatches(tahun);

  // 3. Filter batch yang sedang dalam periode pemantauan aktif (mulai <= hariIni <= selesai + grace)
  const candidateBatches = allBatches.filter((b) => {
    if (!b.dipantau || !b.sheet_id) return false;
    if (!b.tanggal_mulai || !b.tanggal_selesai) return true;
    return pemantauanAktif(
      { dipantau: b.dipantau, mulai: b.tanggal_mulai, selesai: b.tanggal_selesai },
      todayWib,
      param
    );
  });

  // Tentukan batch yang perlu di-fetch:
  // Jika manual / forceAll: proses semua
  // Jika terjadwal (cron): proses yang belum punya snapshot hari ini atau yang datanya basi
  const batchesToProcess = [];
  for (const b of candidateBatches) {
    if (options.pemicu === "manual" || options.forceAll) {
      batchesToProcess.push(b);
    } else {
      const snap = await getLatestSnapshot(b.id);
      const isSnapToday = snap && snap.tanggal === todayWib;
      const isStale = dataBasi(b.last_fetch_at, nowIso, param);
      if (!isSnapToday || isStale) {
        batchesToProcess.push(b);
      }
    }
  }

  let stepUrutan = 1;
  let suksesCount = 0;
  let gagalCount = 0;

  // 4. Proses satu per satu batch dengan penanganan kesalahan mandiri
  for (const b of batchesToProcess) {
    const tStepMulai = Date.now();
    const batchLabel = b.id_pelatihan || b.nama_berkas;

    const step = await addAgentRunStep({
      run_id: run.id,
      urutan: stepUrutan++,
      nama: `Sinkronisasi batch ${batchLabel}`,
      alat: "bacaGoogleSheet + prosesSheet",
      status: "berjalan",
      mulai: new Date().toISOString(),
    });

    try {
      const fetchRes = await handleFetchBatch(
        b.id,
        options.pemicu === "terjadwal" ? "cron" : "manual"
      );

      if (fetchRes.success) {
        suksesCount++;
        await addAgentRunStep({
          ...step,
          status: "selesai",
          ringkasan: `Sukses: ${fetchRes.ringkasan.pesertaAktif} aktif, ${fetchRes.ringkasan.lulus} lulus (${(fetchRes.ringkasan.capaian || 0).toFixed(1)}%). Baru: ${fetchRes.ringkasan.aliasBaru}, Dibuang: ${fetchRes.ringkasan.barisDibuang || 0}.`,
          durasi_ms: Date.now() - tStepMulai,
          selesai: new Date().toISOString(),
        });
      } else {
        gagalCount++;
        await addAgentRunStep({
          ...step,
          status: "gagal",
          ringkasan: `Gagal: ${fetchRes.error || "Gagal sinkronisasi"}`,
          durasi_ms: Date.now() - tStepMulai,
          selesai: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      gagalCount++;
      await addAgentRunStep({
        ...step,
        status: "gagal",
        ringkasan: `Eksepsi: ${err.message}`,
        durasi_ms: Date.now() - tStepMulai,
        selesai: new Date().toISOString(),
      });
    }
  }

  // 5. Langkah Evaluasi EWS Deterministik & Ringkasan Portofolio
  const tEvalMulai = Date.now();
  const evalStep = await addAgentRunStep({
    run_id: run.id,
    urutan: stepUrutan++,
    nama: "Evaluasi EWS & Ringkasan Portofolio",
    alat: "evaluasiPortofolio",
    status: "berjalan",
    mulai: new Date().toISOString(),
  });

  // Kumpulkan data snapshot terbaru untuk semua candidate batch
  const batchPantauList: BatchPantau[] = [];
  for (const b of candidateBatches) {
    const snap = await getLatestSnapshot(b.id);
    batchPantauList.push({
      id: b.id,
      levelTerkonfirmasi: b.level === "Fundamental" && b.level_source !== "belum",
      validasiOk: b.validasi_status === "valid",
      masukCapaianPk: Boolean(b.masuk_capaian_pk),
      mulai: b.tanggal_mulai || todayWib,
      selesai: b.tanggal_selesai || todayWib,
      onboarding: snap ? snap.onboarding : 0,
      lulus: snap ? snap.lulus : 0,
      dipantau: b.dipantau,
    });
  }

  const targetPk: TargetBerlaku = { target: 87, sumber: "indikator" };
  const evalRes = evaluasiPortofolio(batchPantauList, targetPk, todayWib, param);

  // Periksa dan catat perubahan tingkat EWS per batch
  for (const item of evalRes.perBatch) {
    const prevTingkat = await getLatestEwsTingkat(item.id);
    if (!prevTingkat || prevTingkat !== item.tingkat) {
      const bDetail = candidateBatches.find((x) => x.id === item.id);
      await saveEwsPerubahanTingkat({
        tanggal: todayWib,
        tahun,
        batch_id: item.id,
        dari: prevTingkat || null,
        ke: item.tingkat,
        alasan: item.alasan,
        k: item.K,
        b: item.B,
        r: item.R === Infinity ? null : item.R,
        fase: item.fase,
        agent_run_id: run.id,
      });
    }
  }

  // Periksa dan catat perubahan tingkat EWS portofolio (batch_id = null)
  const prevPortTingkat = await getLatestEwsTingkat(null);
  if (!prevPortTingkat || prevPortTingkat !== evalRes.portofolio.tingkat) {
    await saveEwsPerubahanTingkat({
      tanggal: todayWib,
      tahun,
      batch_id: null,
      dari: prevPortTingkat || null,
      ke: evalRes.portofolio.tingkat,
      alasan: evalRes.portofolio.alasan,
      k: evalRes.portofolio.K,
      b: evalRes.portofolio.B,
      r: evalRes.portofolio.R === Infinity ? null : evalRes.portofolio.R,
      fase: "berjalan",
      agent_run_id: run.id,
    });
  }

  await addAgentRunStep({
    ...evalStep,
    status: "selesai",
    ringkasan: `Evaluasi selesai: Portofolio ${evalRes.portofolio.tingkat} (${evalRes.portofolio.alasan}). Kumulatif ${evalRes.kumulatif.lulus}/${evalRes.kumulatif.onboarding} (${(evalRes.kumulatif.capaian || 0).toFixed(1)}%).`,
    durasi_ms: Date.now() - tEvalMulai,
    selesai: new Date().toISOString(),
  });

  // 6. Simpan ringkasan_harian
  const ringkasanData = {
    tanggal: todayWib,
    tahun,
    totalBatchDipantau: candidateBatches.length,
    batchDiproses: batchesToProcess.length,
    suksesCount,
    gagalCount,
    portofolio: evalRes.portofolio,
    kumulatif: evalRes.kumulatif,
    perBatch: evalRes.perBatch,
  };

  await saveRingkasanHarian(todayWib, tahun, ringkasanData, run.id);

  // 7. Selesaikan agent_runs
  const durasiTotal = Date.now() - tMulai;
  const finalStatus =
    gagalCount === 0
      ? "selesai"
      : suksesCount > 0
      ? "selesai_dengan_peringatan"
      : "gagal";

  await updateAgentRun(run.id, {
    status: finalStatus,
    selesai: new Date().toISOString(),
    parameter: {
      ...run.parameter,
      totalBatchDipantau: candidateBatches.length,
      batchDiproses: batchesToProcess.length,
      suksesCount,
      gagalCount,
      portofolio: evalRes.portofolio.tingkat,
      durasiMs: durasiTotal,
    },
  });

  // 8. Catat Audit Log
  await catatAuditLog({
    userId: options.userId || null,
    aksi: "pemantauan_harian_selesai",
    objek: `agent_runs:${run.id}`,
    alasan: `Pemantauan harian (${options.pemicu}): ${suksesCount} berhasil, ${gagalCount} gagal dari ${batchesToProcess.length} batch diproses.`,
    detail: {
      runId: run.id,
      pemicu: options.pemicu,
      suksesCount,
      gagalCount,
      tingkatPortofolio: evalRes.portofolio.tingkat,
      durasiMs: durasiTotal,
    },
  });

  return {
    success: finalStatus !== "gagal",
    runId: run.id,
    status: finalStatus,
    tanggalWib: todayWib,
    tahun,
    totalBatchDipantau: candidateBatches.length,
    batchDiproses: batchesToProcess.length,
    suksesCount,
    gagalCount,
    portofolio: {
      tingkat: evalRes.portofolio.tingkat,
      alasan: evalRes.portofolio.alasan,
      K: evalRes.portofolio.K,
      B: evalRes.portofolio.B,
      R: evalRes.portofolio.R,
    },
    kumulatif: evalRes.kumulatif,
    durasiMs: durasiTotal,
  };
}
