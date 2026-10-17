import test from "node:test";
import assert from "node:assert/strict";
import { prosesSheet } from "../server/sheets/processor.ts";
import { saveBatch, getBatchById, getAliasMapForBatch, getValidationItems } from "../server/sheets/store.ts";
import { sentinelPeriksaKeluar } from "../server/lib/sentinel.ts";
import type { BatchItem } from "../shared/types.ts";

test("Fase 2: Uji prosesSheet dua kali dengan data berbeda", async () => {
  const batchId = "00000000-0000-4000-8000-000000000001";
  const dummyBatch: BatchItem = {
    id: batchId,
    id_pelatihan: "13108",
    tema: "FAWD",
    nama_berkas: "MIRROR - DTA VBL 13108 FAWD 1-30 Sept",
    tab_nama: "All Pendaftar Web",
    level: "Fundamental",
    level_source: "nama_berkas",
    tahun: 2026,
    masuk_capaian_pk: true,
    validasi_status: "valid",
    dipantau: true,
  };
  await saveBatch(dummyBatch);

  // Sheet Data Hari 1 (3 peserta, 28 modul)
  const header = [
    "Nama", "No Registrasi", "Instansi", "Status",
    ...Array.from({ length: 28 }, (_, i) => `Modul ${i + 1}`)
  ];

  // Peserta 1: Selesai 28 modul (Lulus)
  const row1 = ["Budi Santoso", "REG-001", "Instansi A", "Peserta", ...Array(28).fill("Selesai")];
  // Peserta 2: Selesai 26 modul (Onboarding, belum lulus)
  const row2 = ["Siti Aminah", "REG-002", "Instansi B", "Peserta", ...Array(26).fill("Selesai"), "Belum", "Belum"];
  // Peserta 3: Pembatalan (Harus dikeluarkan dari hitungan)
  const row3 = ["Joko Widodo", "REG-003", "Instansi C", "Pembatalan", ...Array(28).fill("Selesai")];

  const sheetDataDay1 = [header, row1, row2, row3];

  // Eksekusi Fetch 1
  const res1 = await prosesSheet(batchId, sheetDataDay1, "manual");
  assert.equal(res1.success, true);
  assert.equal(res1.ringkasan.pesertaAktif, 2); // 2 aktif, 1 batal
  assert.equal(res1.ringkasan.onboarding, 2);   // 28 modul & 26 modul keduanya >= 28*0.9 (25.2)
  assert.equal(res1.ringkasan.lulus, 1);        // Hanya row 1
  assert.equal(res1.ringkasan.batal, 1);
  assert.equal(res1.ringkasan.aliasBaru, 3);    // 3 alias baru pertama kali

  // Periksa alias_map tersimpan
  const aliasMap1 = await getAliasMapForBatch(batchId);
  assert.equal(aliasMap1.size, 3);
  const aliasBudi = Array.from(aliasMap1.values())[0];
  assert.ok(aliasBudi.startsWith("P-"));

  // Eksekusi Fetch 2: Data yang sama (Hari 1 sore)
  const res2 = await prosesSheet(batchId, sheetDataDay1, "manual");
  assert.equal(res2.ringkasan.aliasBaru, 0); // Alias dipakai ulang, tidak ada yang baru
  const aliasMap2 = await getAliasMapForBatch(batchId);
  assert.equal(aliasMap2.size, 3);

  // Eksekusi Fetch 3: Tambah 1 peserta baru (Hari 2)
  const row4 = ["Dewi Lestari", "REG-004", "Instansi D", "Peserta", ...Array(27).fill("Selesai"), "Belum"];
  const sheetDataDay2 = [header, row1, row2, row3, row4];

  const res3 = await prosesSheet(batchId, sheetDataDay2, "manual");
  assert.equal(res3.ringkasan.aliasBaru, 1); // Hanya Dewi yang baru
  assert.equal(res3.ringkasan.pesertaAktif, 3);
  assert.equal(res3.ringkasan.onboarding, 3);

  // Eksekusi Fetch 4: Sengaja memundurkan progres (misal: Budi turun dari 28 ke 15 modul)
  const row1Regressed = ["Budi Santoso", "REG-001", "Instansi A", "Peserta", ...Array(15).fill("Selesai"), ...Array(13).fill("Belum")];
  const sheetDataDay3 = [header, row1Regressed, row2, row3, row4];

  const res4 = await prosesSheet(batchId, sheetDataDay3, "manual");
  assert.ok(res4.anomali.includes("progres_mundur"));
  assert.ok(res4.anomali.includes("lulus_turun"));

  // Periksa bahwa anomali masuk ke Antrean Validasi
  const valItems = await getValidationItems();
  const regresiValItem = valItems.find((it) => it.detail?.subjenis === "progres_mundur");
  assert.ok(regresiValItem);
  assert.equal(regresiValItem?.status, "terbuka");
});

test("Fase 2: Sentinel Keluar memblokir nomor registrasi dan PII", async () => {
  const currentBatchNoRegs = ["REG-13108-001", "REG-13108-002", "FKT-1000"];

  // 1. Teks aman
  const safeText = "Batch 13108 memiliki capaian 87% dengan 40 peserta lulus.";
  const resSafe = await sentinelPeriksaKeluar(safeText, currentBatchNoRegs);
  assert.equal(resSafe.passed, true);
  assert.equal(resSafe.blocked, false);

  // 2. Teks mengandung nomor registrasi batch yang sedang diproses
  const unsafeTextNoReg = "Peserta dengan nomor registrasi REG-13108-001 belum menyelesaikan modul.";
  const resNoReg = await sentinelPeriksaKeluar(unsafeTextNoReg, currentBatchNoRegs);
  assert.equal(resNoReg.passed, false);
  assert.equal(resNoReg.blocked, true);

  // 3. Teks mengandung NIK (16 digit)
  const unsafeTextNik = "Peserta dengan NIK 3471012304900001 mengalami kendala login.";
  const resNik = await sentinelPeriksaKeluar(unsafeTextNik, currentBatchNoRegs);
  assert.equal(resNik.passed, false);
  assert.equal(resNik.blocked, true);
});
