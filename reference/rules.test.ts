import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as R from "./rules.ts";

test("onboarding 28 modul -> 26", () => {
  assert.equal(R.onboarding({ modulSelesai: 25, totalModul: 28 }), false);
  assert.equal(R.onboarding({ modulSelesai: 26, totalModul: 28 }), true);
});
test("onboarding 45 modul -> 41", () => {
  assert.equal(R.onboarding({ modulSelesai: 40, totalModul: 45 }), false);
  assert.equal(R.onboarding({ modulSelesai: 41, totalModul: 45 }), true);
});
test("lulus butuh semua modul", () => {
  assert.equal(R.lulus({ modulSelesai: 28, totalModul: 28 }), true);
  assert.equal(R.lulus({ modulSelesai: 27, totalModul: 28 }), false);
});
test("kebutuhan lulus 87%: 45 -> 40", () => {
  assert.equal(R.kebutuhanLulus(45), 40);
  assert.equal(R.kebutuhanLulus(100), 87);
  assert.equal(R.kebutuhanLulus(0), 0);
});
test("kumulatif tertimbang bukan rata-rata persen", () => {
  const k = R.kumulatif([{ onboarding: 10, lulus: 10 }, { onboarding: 90, lulus: 72 }]);
  assert.equal(k.capaian, 82); // rata-rata persen akan 90
});
test("onboarding 0 -> capaian null", () => {
  assert.equal(R.hitungBatch([]).capaian, null);
});
test("pembatalan dikeluarkan", () => {
  const r = R.hitungBatch([
    { modulSelesai: 28, totalModul: 28 }, { modulSelesai: 0, totalModul: 28, batal: true },
    { modulSelesai: 26, totalModul: 28 }]);
  assert.deepEqual([r.aktif, r.onboarding, r.lulus], [2, 2, 1]);
});
test("parse nama berkas contoh nyata", () => {
  const a = R.parseNamaBerkas("MIRROR - DTA VBL 13107 OIAT 10 -31 Agustus");
  assert.equal(a.idPelatihan, "13107"); assert.equal(a.temaAtauAlias, "OIAT");
  assert.deepEqual(a.tglMulai, { d: 10, m: 8 }); assert.deepEqual(a.tglSelesai, { d: 31, m: 8 });
  assert.equal(a.keyakinan, "tinggi");
  const b = R.parseNamaBerkas("MIRROR - DTA VBL 13108 FAWD 1-31 Sept");
  assert.equal(b.idPelatihan, "13108"); assert.equal(b.temaAtauAlias, "FAWD");
  assert.equal(b.keyakinan, "sedang"); // 31 September tidak valid -> tandai, minta konfirmasi
  assert.ok(b.catatan.some((c) => c.startsWith("tanggal tidak valid")));
});
test("parse lintas bulan & tanpa ID", () => {
  const c = R.parseNamaBerkas("MIRROR - DTA VBL 13200 DSAT 28 Agu - 5 Sept");
  assert.deepEqual(c.tglMulai, { d: 28, m: 8 }); assert.deepEqual(c.tglSelesai, { d: 5, m: 9 });
  const d = R.parseNamaBerkas("Rekap peserta");
  assert.equal(d.idPelatihan, null); assert.equal(d.keyakinan, "rendah");
});
test("level sinonim", () => {
  assert.equal(R.normalisasiLevel("Basic"), "Fundamental");
  assert.equal(R.normalisasiLevel("Advanced"), null);
});
test("alias HMAC deterministik, beda per batch, tanpa nama", () => {
  const a1 = R.aliasHmac("s", "b1", "Budi"), a2 = R.aliasHmac("s", "b1", " budi ");
  assert.equal(a1, a2); assert.notEqual(a1, R.aliasHmac("s", "b2", "Budi"));
  assert.ok(!a1.toLowerCase().includes("budi"));
});
test("deteksi PII", () => {
  assert.equal(R.containsPii("hubungi 081234567890"), true);
  assert.equal(R.containsPii("P-AB12 selesai 26 modul"), false);
});
test("golden: batch fiktif", () => {
  const g = JSON.parse(readFileSync(new URL("../tests/golden/batch_fiktif.json", import.meta.url), "utf8"));
  const r = R.hitungBatch(g.peserta);
  assert.deepEqual({ onboarding: r.onboarding, lulus: r.lulus }, g.harapan);
});

// ====== v0.2: fase waktu, target per bulan, portofolio, pembaruan harian ======
const PK26 = { status: "terbaca" as const, target: 87, targetAntara: [1,2,3,4].map((b) => ({ bulan: b, nilai: 0 })).concat([5,6,7,8,9,10,11,12].map((b) => ({ bulan: b, nilai: 87 }))) };

test("target berlaku per bulan dari profil PK", () => {
  assert.deepEqual(R.targetBerlaku(PK26, 3), { target: 0, sumber: "antara", alasan: "target_bulan_0" });
  assert.deepEqual(R.targetBerlaku(PK26, 9), { target: 87, sumber: "antara" });
  assert.equal(R.targetBerlaku({ status: "gagal_dibaca" }, 9).target, null);
  assert.equal(R.targetBerlaku(null, 9).alasan, "profil_tidak_ada");
  assert.equal(R.targetBerlaku({ status: "terbaca", target: 90 }, 9).target, 90);
});
test("hari ini WIB", () => {
  assert.equal(R.hariIniWib(new Date("2026-09-10T18:00:00Z")), "2026-09-11");
});
test("fase batch 1-30 Sept", () => {
  const f = (d: string) => R.faseBatch("2026-09-01", "2026-09-30", d).fase;
  assert.equal(f("2026-08-31"), "belum_mulai");
  assert.equal(f("2026-09-05"), "pantau");   // 16%
  assert.equal(f("2026-09-12"), "aktif");    // 40%
  assert.equal(f("2026-09-22"), "aktif");    // sisa 8, f=73%
  assert.equal(f("2026-10-01"), "selesai");
});
test("fase batch: sisa <= 7 hari memicu akhir", () => {
  assert.equal(R.faseBatch("2026-09-01", "2026-09-30", "2026-09-22").fase, "aktif");
  assert.equal(R.faseBatch("2026-09-01", "2026-09-30", "2026-09-23").fase, "akhir");
});
const T87 = { target: 87, sumber: "antara" as const };
const base = { levelTerkonfirmasi: true, validasiOk: true, target: T87 };
test("EWS: contoh 45/30 per fase", () => {
  const e = (fase: R.Fase) => R.tingkatEws({ ...base, onboarding: 45, lulus: 30, fase });
  assert.deepEqual([e("pantau").tingkat, e("aktif").tingkat, e("akhir").tingkat], ["waspada", "waspada", "kritis"]);
  const x = e("akhir"); assert.deepEqual([x.K, x.B], [10, 15]);
  assert.equal(e("selesai").tingkat, "kritis");
});
test("EWS: aman, bdn, dan target 0", () => {
  assert.equal(R.tingkatEws({ ...base, onboarding: 45, lulus: 40, fase: "aktif" }).tingkat, "aman");
  assert.equal(R.tingkatEws({ ...base, levelTerkonfirmasi: false, onboarding: 45, lulus: 30, fase: "aktif" }).alasan, "level_belum_terkonfirmasi");
  assert.equal(R.tingkatEws({ ...base, onboarding: 0, lulus: 0, fase: "aktif" }).alasan, "onboarding_0");
  assert.equal(R.tingkatEws({ ...base, target: R.targetBerlaku(PK26, 2), onboarding: 45, lulus: 1, fase: "akhir" }).alasan, "tidak_ada_target_bulan_ini");
  assert.equal(R.tingkatEws({ ...base, target: R.targetBerlaku(null, 9), onboarding: 45, lulus: 30, fase: "akhir" }).alasan, "target_tidak_diketahui");
});
test("EWS: kritis karena kumulatif tertinggal (R>1)", () => {
  const k = R.tingkatEws({ ...base, onboarding: 45, lulus: 40, lain: { onboarding: 100, lulus: 70 }, fase: "pantau" });
  assert.deepEqual([k.tingkat, k.K, k.B, k.alasan], ["kritis", 17, 5, "tidak_mungkin_tercapai"]);
});
test("portofolio: banyak batch, urut prioritas, B hanya batch berjalan", () => {
  const hari = "2026-09-23";
  const bs: R.BatchPantau[] = [
    { id: "A", levelTerkonfirmasi: true, validasiOk: true, masukCapaianPk: true, mulai: "2026-08-10", selesai: "2026-08-31", onboarding: 100, lulus: 70 },
    { id: "B", levelTerkonfirmasi: true, validasiOk: true, masukCapaianPk: true, mulai: "2026-09-01", selesai: "2026-09-30", onboarding: 45, lulus: 40 },
    { id: "C", levelTerkonfirmasi: true, validasiOk: true, masukCapaianPk: false, mulai: "2026-09-01", selesai: "2026-09-30", onboarding: 30, lulus: 5 }, // Intermediate
    { id: "D", levelTerkonfirmasi: false, validasiOk: true, masukCapaianPk: true, mulai: "2026-09-10", selesai: "2026-09-30", onboarding: 20, lulus: 2 },
  ];
  const r = R.evaluasiPortofolio(bs, T87, hari);
  assert.deepEqual([r.kumulatif.onboarding, r.kumulatif.lulus], [145, 110]); // C dan D tidak masuk
  assert.deepEqual([r.portofolio.K, r.portofolio.B, r.portofolio.tingkat], [17, 5, "kritis"]);
  assert.deepEqual(r.perBatch.slice(0, 2).map((x) => x.id), ["B", "A"]); // kritis; yang masih berjalan lebih dulu
  assert.equal(r.perBatch[1].alasan, "batch_selesai_target_belum_tercapai");
  const byId = Object.fromEntries(r.perBatch.map((x) => [x.id, x]));
  assert.equal(byId.C.alasan, "level_belum_terkonfirmasi"); // dikeluarkan dari capaian PK => tidak dinilai terhadap target
  assert.equal(byId.D.tingkat, "belum_dapat_dinilai");
});
test("pemantauan aktif dan data basi", () => {
  const b = { dipantau: true, mulai: "2026-09-01", selesai: "2026-09-30" };
  assert.equal(R.pemantauanAktif(b, "2026-10-07"), true);   // dalam grace 7 hari
  assert.equal(R.pemantauanAktif(b, "2026-10-08"), false);
  assert.equal(R.pemantauanAktif({ ...b, dipantau: false }, "2026-09-10"), false);
  assert.equal(R.dataBasi("2026-09-10T00:00:00Z", "2026-09-12T12:00:00Z"), true);
  assert.equal(R.dataBasi("2026-09-10T00:00:00Z", "2026-09-11T23:00:00Z"), false);
  assert.equal(R.dataBasi(null, "2026-09-11T00:00:00Z"), true);
});
test("mapping alias dipakai ulang saat fetch ulang", () => {
  const S = "rahasia", B = "b1";
  const k = (reg: string, nm: string) => R.kunciBaris(S, B, { noReg: reg, nama: nm });
  const map = new Map<string, string>();
  const hari1 = R.petakanAlias(map, [k("R1", "Ani"), k("R2", "Budi")], S, B);
  assert.equal(hari1.baru, 2);
  const hari2 = R.petakanAlias(map, [k("r1", "Ani X"), k("R2", "Budi"), k("R3", "Cici")], S, B); // nama berubah, no. reg sama
  assert.equal(hari2.alias[0], hari1.alias[0]); assert.equal(hari2.alias[1], hari1.alias[1]);
  assert.equal(hari2.baru, 1); assert.equal(new Set(hari2.alias).size, 3);
  const hari3 = R.petakanAlias(map, [k("R1", "Ani"), k("R1", "Ani")], S, B); // duplikat
  assert.equal(hari3.duplikat.length, 1); assert.equal(hari3.hilang.length, 2);
  assert.ok(![...map.values()].some((a) => /ani|budi|cici/i.test(a)));
});
test("bandingkan snapshot: anomali", () => {
  const prev = { aktif: 40, onboarding: 20, lulus: 10, totalModul: 28 };
  const p1 = new Map([["P-1", 20], ["P-2", 10]]);
  const c1 = new Map([["P-1", 18], ["P-3", 5]]);
  const r = R.bandingkanSnapshot(prev, { aktif: 30, onboarding: 18, lulus: 9, totalModul: 30 }, p1, c1, 1);
  assert.deepEqual(new Set(r.anomali), new Set(["total_modul_berubah", "peserta_turun_tajam", "lulus_turun", "progres_mundur", "peserta_hilang", "kunci_duplikat"]));
  assert.deepEqual([r.regresi, r.hilang, r.baru], [1, 1, 1]);
  assert.deepEqual(R.bandingkanSnapshot(prev, { ...prev, lulus: 12 }, p1, p1).anomali, []);
});
test("histogram tanpa pembatalan", () => {
  assert.deepEqual(R.histogram([{ modulSelesai: 5, totalModul: 28 }, { modulSelesai: 5, totalModul: 28 }, { modulSelesai: 28, totalModul: 28, batal: true }]), { 5: 2 });
});

// ====== v0.2.2: minimisasi identitas ======
test("kunci orang: noreg vs nama, tanpa menyimpan nilai asli", () => {
  const a = R.kunciOrang("s", { noReg: "REG-001", nama: "Ani" }, "noreg");
  assert.equal(a, R.kunciOrang("s", { noReg: "reg 001", nama: "Budi" }, "noreg")); // nama tak memengaruhi
  assert.equal(R.kunciOrang("s", { nama: "Ani  Putri" }, "nama"), R.kunciOrang("s", { nama: "ani putri" }, "nama"));
  assert.equal(R.kunciOrang("s", { nama: "Ani" }, "noreg"), null); // tidak ada noreg
  assert.ok(!String(a).toLowerCase().includes("reg"));
});
test("mask no registrasi untuk tampilan", () => {
  assert.equal(R.maskNoReg("1234567890"), "******7890");
  assert.equal(R.maskNoReg("123"), "***");
});
test("sentinel keluar mengenali identitas yang sedang diproses", () => {
  assert.equal(R.containsIdentifier("peserta REG-001 selesai", ["REG-001", "REG-002"]), true);
  assert.equal(R.containsIdentifier("peserta P-AB12 selesai 26 modul", ["REG-001"]), false);
  assert.equal(R.containsIdentifier("ab", ["ab"]), false); // terlalu pendek, abaikan
});
