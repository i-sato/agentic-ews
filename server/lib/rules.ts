// Implementasi referensi aturan deterministik. Salin ke server; jangan ubah tanpa memperbarui uji emas.
import { createHmac } from "node:crypto";

export type Level = "Fundamental" | "Intermediate";

export interface Peserta { modulSelesai: number; totalModul: number; batal?: boolean }

export function onboarding(p: Peserta): boolean {
  return p.modulSelesai * 10 >= p.totalModul * 9;
}
export function lulus(p: Peserta): boolean {
  return p.modulSelesai === p.totalModul && p.totalModul > 0;
}
/** Pembatalan dikeluarkan dari semua perhitungan. Lulus tanpa onboarding mustahil (lulus => onboarding). */
export function hitungBatch(ps: Peserta[]) {
  const aktif = ps.filter((p) => !p.batal);
  const on = aktif.filter(onboarding).length;
  const lu = aktif.filter(lulus).length;
  return { aktif: aktif.length, onboarding: on, lulus: lu, capaian: on === 0 ? null : (lu / on) * 100 };
}
/** Kumulatif tertimbang: SUM(lulus)/SUM(onboarding). Bukan rata-rata persen batch. */
export function kumulatif(batches: { onboarding: number; lulus: number }[]) {
  const on = batches.reduce((a, b) => a + b.onboarding, 0);
  const lu = batches.reduce((a, b) => a + b.lulus, 0);
  return { onboarding: on, lulus: lu, capaian: on === 0 ? null : (lu / on) * 100 };
}
export function kebutuhanLulus(onboardingN: number, targetPersen = 87): number {
  // hindari galat floating point: ceil(target*on/100) pada bilangan bulat
  return Math.max(0, Math.ceil((targetPersen * onboardingN) / 100 - 1e-9)) || 0;
}
export type Ews = "aman" | "waspada" | "kritis" | "belum_dapat_dinilai";

// ---------- Parameter EWS (disimpan di tabel ews_parameter; ini nilai awal, perlu kalibrasi) ----------
export interface EwsParam {
  pantauAkhirPersen: number;   // f < nilai ini = fase Pantau
  aktifAkhirPersen: number;    // f >= nilai ini = fase Akhir
  sisaHariAkhir: number;       // sisa hari <= nilai ini = fase Akhir
  rKritisAktif: number;        // R >= nilai ini di fase Aktif = Kritis
  rKritisAkhir: number;        // R >= nilai ini di fase Akhir = Kritis
  staleHari: number;           // data dianggap basi bila tidak diperbarui > hari
  graceHari: number;           // pemantauan berlanjut N hari setelah tanggal selesai
}
export const PARAM_AWAL: EwsParam = {
  pantauAkhirPersen: 40, aktifAkhirPersen: 75, sisaHariAkhir: 7,
  rKritisAktif: 0.75, rKritisAkhir: 0.5, staleHari: 2, graceHari: 7,
};

// ---------- Tanggal (semua ISO YYYY-MM-DD, hari berdasarkan WIB) ----------
export function hariIniWib(now: Date): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}
const hariKe = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000;

export type Fase = "belum_mulai" | "pantau" | "aktif" | "akhir" | "selesai";
export function faseBatch(mulai: string, selesai: string, hariIni: string, p: EwsParam = PARAM_AWAL) {
  const total = hariKe(selesai) - hariKe(mulai) + 1;
  const berjalan = hariKe(hariIni) - hariKe(mulai) + 1;
  const sisaHari = hariKe(selesai) - hariKe(hariIni);
  const f = Math.max(0, Math.min(1, berjalan / total)) * 100;
  let fase: Fase;
  if (hariKe(hariIni) < hariKe(mulai)) fase = "belum_mulai";
  else if (hariKe(hariIni) > hariKe(selesai)) fase = "selesai";
  else if (f >= p.aktifAkhirPersen || sisaHari <= p.sisaHariAkhir) fase = "akhir";
  else if (f >= p.pantauAkhirPersen) fase = "aktif";
  else fase = "pantau";
  return { fase, persenBerjalan: f, sisaHari };
}
/** Pemantauan aktif: dipantau, mulai sudah lewat, dan belum melewati selesai + grace. */
export function pemantauanAktif(b: { dipantau: boolean; mulai: string; selesai: string }, hariIni: string, p: EwsParam = PARAM_AWAL) {
  return b.dipantau && hariKe(hariIni) >= hariKe(b.mulai) && hariKe(hariIni) <= hariKe(b.selesai) + p.graceHari;
}
export function dataBasi(lastFetchIso: string | null, nowIso: string, p: EwsParam = PARAM_AWAL): boolean {
  if (!lastFetchIso) return true;
  return (Date.parse(nowIso) - Date.parse(lastFetchIso)) / 86_400_000 > p.staleHari;
}

// ---------- Target dari Profil PK (AI membaca PK; kode menerapkan) ----------
export interface PkProfilRingkas { status: "terbaca" | "terbaca_dengan_peringatan" | "gagal_dibaca"; target?: number; targetAntara?: { bulan: number; nilai: number }[] }
export type TargetBerlaku = { target: number | null; sumber: "antara" | "indikator" | "tidak_ada"; alasan?: "profil_gagal" | "target_bulan_0" | "profil_tidak_ada" };
export function targetBerlaku(profil: PkProfilRingkas | null, bulan: number): TargetBerlaku {
  if (!profil) return { target: null, sumber: "tidak_ada", alasan: "profil_tidak_ada" };
  if (profil.status === "gagal_dibaca") return { target: null, sumber: "tidak_ada", alasan: "profil_gagal" };
  const a = profil.targetAntara?.find((x) => x.bulan === bulan);
  const t = a ? a.nilai : profil.target;
  if (t === undefined) return { target: null, sumber: "tidak_ada", alasan: "profil_gagal" };
  if (t === 0) return { target: 0, sumber: a ? "antara" : "indikator", alasan: "target_bulan_0" };
  return { target: t, sumber: a ? "antara" : "indikator" };
}

// ---------- Tingkat EWS (kode memutuskan; AI hanya menjelaskan) ----------
export interface InputEws {
  levelTerkonfirmasi: boolean; validasiOk: boolean;
  onboarding: number; lulus: number;
  target: TargetBerlaku;
  lain?: { onboarding: number; lulus: number };   // batch lain di TA yang sama, dianggap tetap
  fase: Fase; param?: EwsParam;
}
export type AlasanEws =
  | "level_belum_terkonfirmasi" | "data_belum_valid" | "onboarding_0" | "belum_mulai"
  | "target_tidak_diketahui" | "tidak_ada_target_bulan_ini"
  | "target_tercapai" | "tidak_mungkin_tercapai" | "batch_selesai_target_belum_tercapai"
  | "beban_tinggi_fase_akhir" | "beban_tinggi_fase_aktif" | "perlu_dipantau";
export function tingkatEws(a: InputEws): { tingkat: Ews; alasan: AlasanEws; K: number; B: number; R: number | null } {
  const p = a.param ?? PARAM_AWAL;
  const bdn = (alasan: AlasanEws) => ({ tingkat: "belum_dapat_dinilai" as Ews, alasan, K: 0, B: 0, R: null });
  if (!a.levelTerkonfirmasi) return bdn("level_belum_terkonfirmasi");
  if (!a.validasiOk) return bdn("data_belum_valid");
  if (a.fase === "belum_mulai") return bdn("belum_mulai");
  if (a.target.target === null) return bdn("target_tidak_diketahui");
  if (a.target.target === 0) return bdn("tidak_ada_target_bulan_ini");
  if (a.onboarding === 0) return bdn("onboarding_0");
  const lain = a.lain ?? { onboarding: 0, lulus: 0 };
  const perluTotal = kebutuhanLulus(lain.onboarding + a.onboarding, a.target.target);
  const K = Math.max(0, perluTotal - lain.lulus - a.lulus);
  const B = a.onboarding - a.lulus;
  const R = K === 0 ? 0 : B === 0 ? Infinity : K / B;
  const out = (tingkat: Ews, alasan: AlasanEws) => ({ tingkat, alasan, K, B, R });
  if (K === 0) return out("aman", "target_tercapai");
  if (a.fase === "selesai") return out("kritis", "batch_selesai_target_belum_tercapai");
  if (R > 1) return out("kritis", "tidak_mungkin_tercapai");
  if (a.fase === "akhir" && R >= p.rKritisAkhir) return out("kritis", "beban_tinggi_fase_akhir");
  if (a.fase === "aktif" && R >= p.rKritisAktif) return out("kritis", "beban_tinggi_fase_aktif");
  return out("waspada", "perlu_dipantau");
}

// ---------- Portofolio: banyak batch dipantau sekaligus ----------
export interface BatchPantau {
  id: string; levelTerkonfirmasi: boolean; validasiOk: boolean; masukCapaianPk: boolean;
  mulai: string; selesai: string; onboarding: number; lulus: number; dipantau?: boolean;
}
const URUT: Record<Ews, number> = { kritis: 0, waspada: 1, belum_dapat_dinilai: 2, aman: 3 };
/**
 * Hanya batch masuk_capaian_pk, level terkonfirmasi, dan valid yang masuk kumulatif resmi.
 * Per batch: K dihitung dengan batch lain dianggap tetap (bisa melebih-lebihkan bila beberapa batch berjalan bersamaan);
 * karena itu ada ringkasan portofolio (K_total, B_total) sebagai angka tanpa hitung ganda.
 * B_total hanya dari batch yang belum selesai (fase != selesai).
 */
export function evaluasiPortofolio(batches: BatchPantau[], target: TargetBerlaku, hariIni: string, p: EwsParam = PARAM_AWAL) {
  const resmi = batches.filter((b) => b.masukCapaianPk && b.levelTerkonfirmasi && b.validasiOk);
  const faseOf = (b: BatchPantau) => faseBatch(b.mulai, b.selesai, hariIni, p);
  const totOn = resmi.reduce((s, b) => s + b.onboarding, 0);
  const totLu = resmi.reduce((s, b) => s + b.lulus, 0);
  const perBatch = batches.map((b) => {
    const f = faseOf(b);
    const lainList = resmi.filter((x) => x.id !== b.id);
    const lain = { onboarding: lainList.reduce((s, x) => s + x.onboarding, 0), lulus: lainList.reduce((s, x) => s + x.lulus, 0) };
    const e = tingkatEws({ levelTerkonfirmasi: b.levelTerkonfirmasi && b.masukCapaianPk, validasiOk: b.validasiOk,
      onboarding: b.onboarding, lulus: b.lulus, target, lain, fase: f.fase, param: p });
    return { id: b.id, fase: f.fase, sisaHari: f.sisaHari, ...e };
  }).sort((x, y) => URUT[x.tingkat] - URUT[y.tingkat] || Number(x.fase === "selesai") - Number(y.fase === "selesai") || (y.R ?? -1) - (x.R ?? -1)); // yang masih bisa ditindak lebih dulu
  const berjalan = resmi.filter((b) => faseOf(b).fase !== "selesai" && faseOf(b).fase !== "belum_mulai");
  const Btotal = berjalan.reduce((s, b) => s + (b.onboarding - b.lulus), 0);
  const faseAkhirTerlambat = berjalan.length
    ? faseOf(berjalan.reduce((a, b) => (hariKe(b.selesai) > hariKe(a.selesai) ? b : a))).fase : "selesai";
  const port = tingkatEws({ levelTerkonfirmasi: resmi.length > 0, validasiOk: true, onboarding: totOn, lulus: totLu,
    target, fase: berjalan.length ? faseAkhirTerlambat : "selesai", param: p });
  // tingkat portofolio memakai B hanya dari batch yang masih berjalan
  const K = port.K;
  const R = K === 0 ? 0 : Btotal === 0 ? Infinity : K / Btotal;
  let tingkat = port.tingkat, alasan = port.alasan;
  if (port.tingkat !== "belum_dapat_dinilai" && K > 0) {
    const fase = berjalan.length ? faseAkhirTerlambat : "selesai";
    if (fase === "selesai") { tingkat = "kritis"; alasan = "batch_selesai_target_belum_tercapai"; }
    else if (R > 1) { tingkat = "kritis"; alasan = "tidak_mungkin_tercapai"; }
    else if (fase === "akhir" && R >= p.rKritisAkhir) { tingkat = "kritis"; alasan = "beban_tinggi_fase_akhir"; }
    else if (fase === "aktif" && R >= p.rKritisAktif) { tingkat = "kritis"; alasan = "beban_tinggi_fase_aktif"; }
    else { tingkat = "waspada"; alasan = "perlu_dipantau"; }
  }
  return {
    kumulatif: { onboarding: totOn, lulus: totLu, capaian: totOn === 0 ? null : (totLu / totOn) * 100 },
    portofolio: { tingkat, alasan, K, B: Btotal, R }, perBatch,
  };
}

// ---------- Parsing nama berkas ----------
const BULAN: Record<string, number> = {
  jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4, mei: 5, may: 5,
  jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, agt: 8, agus: 8, agustus: 8, aug: 8, sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, nov: 11, november: 11, des: 12, desember: 12, dec: 12,
};
export interface ParseNama {
  idPelatihan: string | null; temaAtauAlias: string | null;
  tglMulai: { d: number; m: number } | null; tglSelesai: { d: number; m: number } | null;
  keyakinan: "tinggi" | "sedang" | "rendah"; catatan: string[];
}
const HARI_MAKS = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function parseNamaBerkas(nama: string): ParseNama {
  const catatan: string[] = [];
  const mId = nama.match(/\bVBL\s+(\d{5})\b/i) ?? nama.match(/\b(\d{5})\b/);
  const semuaId = [...nama.matchAll(/\b(\d{5})\b/g)];
  if (semuaId.length > 1 && !/\bVBL\s+\d{5}\b/i.test(nama)) catatan.push("lebih dari satu angka 5 digit");
  const id = mId ? mId[1] : null;
  let tema: string | null = null;
  if (id) {
    const after = nama.slice(nama.indexOf(id) + id.length).trim();
    const t = after.match(/^([A-Za-z][A-Za-z0-9]*)/);
    tema = t ? t[1].toUpperCase() : null;
  }
  const mTgl = nama.match(/(\d{1,2})\s*(?:([A-Za-z]+))?\s*[-–]\s*(\d{1,2})\s+([A-Za-z]+)/);
  let mulai = null as ParseNama["tglMulai"], selesai = null as ParseNama["tglSelesai"];
  if (mTgl) {
    const bAkhir = BULAN[mTgl[4].toLowerCase()];
    const bAwal = mTgl[2] ? BULAN[mTgl[2].toLowerCase()] : bAkhir;
    if (bAkhir && bAwal) {
      mulai = { d: +mTgl[1], m: bAwal }; selesai = { d: +mTgl[3], m: bAkhir };
      for (const x of [mulai, selesai]) if (x.d < 1 || x.d > HARI_MAKS[x.m]) { catatan.push(`tanggal tidak valid: ${x.d}/${x.m}`); }
      if (bAwal > bAkhir) catatan.push("bulan awal setelah bulan akhir (kemungkinan lintas tahun)");
    }
  } else catatan.push("rentang tanggal tidak terbaca");
  const dateOk = mulai && selesai && catatan.every((c) => !c.startsWith("tanggal") && !c.startsWith("rentang"));
  const keyakinan = id && tema && dateOk && catatan.length === 0 ? "tinggi" : id && mulai ? "sedang" : "rendah";
  return { idPelatihan: id, temaAtauAlias: tema, tglMulai: mulai, tglSelesai: selesai, keyakinan, catatan };
}
/** TA dari tanggal mulai. Tahun diberikan oleh konteks (TA yang dipilih), bukan nama berkas. */
export function tautanPelatihan(id: string, pola = "https://digitalent.komdigi.go.id/pelatihan/{id}") {
  return pola.replace("{id}", id);
}
export function normalisasiLevel(s: string): Level | null {
  const x = s.trim().toLowerCase();
  if (x === "fundamental" || x === "basic") return "Fundamental";
  if (x === "intermediate") return "Intermediate";
  return null;
}

// ---------- Masking ----------
export function aliasHmac(secret: string, batchId: string, nilai: string): string {
  const h = createHmac("sha256", secret).update(`${batchId}|${nilai.trim().toLowerCase()}`).digest("hex");
  return "P-" + h.slice(0, 10).toUpperCase();
}
/**
 * Kunci orang lintas batch, hanya server. mode "noreg": HMAC no. registrasi (bila stabil lintas batch);
 * mode "nama": HMAC nama ternormalisasi (hash saja, nama tidak disimpan). Dipakai untuk catatan "kemungkinan sama".
 */
export function kunciOrang(secret: string, r: { noReg?: string; nama?: string }, mode: "noreg" | "nama"): string | null {
  const v = mode === "noreg" ? r.noReg : r.nama;
  const n = v ? norm(v) : "";
  if (!n) return null;
  return createHmac("sha256", secret).update(`ko|${mode}|${n}`).digest("hex").slice(0, 24);
}
/** Tampilan daftar di UI: tampilkan hanya 4 karakter terakhir; penuh hanya lewat fungsi DB buka_identitas (alasan wajib, tercatat). */
export function maskNoReg(noReg: string): string {
  const t = noReg.trim();
  return t.length <= 4 ? "*".repeat(t.length) : "*".repeat(t.length - 4) + t.slice(-4);
}
/** Sentinel keluar: periksa teks terhadap daftar identitas yang sedang diproses (no. registrasi dll) selain pola umum. */
export function containsIdentifier(teks: string, identifiers: string[]): boolean {
  const t = norm(teks);
  return identifiers.some((i) => { const n = norm(i); return n.length >= 4 && t.includes(n); }) || containsPii(teks);
}
export function containsPii(teks: string): boolean {
  return /\b\d{16}\b|[\w.+-]+@[\w-]+\.[\w.]+|\b(?:\+62|08)\d{8,12}\b/.test(teks);
}

// ---------- Pembaruan harian: mapping alias dari data yang sudah ada ----------
const norm = (s: string) => s.normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
/** Kunci baris stabil per batch: no. registrasi bila ada, jika tidak nama+instansi. Hanya server yang menghitung. */
export function kunciBaris(secret: string, batchId: string, r: { noReg?: string; nama: string; instansi?: string }): string {
  const dasar = r.noReg && norm(r.noReg) ? `reg|${norm(r.noReg)}` : `nm|${norm(r.nama)}|${norm(r.instansi ?? "")}`;
  return createHmac("sha256", secret).update(`kb|${batchId}|${dasar}`).digest("hex");
}
/**
 * Pakai pemetaan yang sudah ada (kunci -> alias). Baris baru mendapat alias baru; alias lama tidak pernah dipakai ulang.
 * Mengembalikan alias per baris, jumlah baru, kunci duplikat dalam sheet, dan alias yang hilang dari sheet (tidak dihapus).
 */
export function petakanAlias(existing: Map<string, string>, kunciList: string[], secret: string, batchId: string) {
  const dipakai = new Set(existing.values());
  const hasil: string[] = []; const duplikat: string[] = []; const terlihat = new Set<string>();
  let baru = 0;
  for (const k of kunciList) {
    if (terlihat.has(k)) { duplikat.push(k); hasil.push(existing.get(k) ?? ""); continue; }
    terlihat.add(k);
    let alias = existing.get(k);
    if (!alias) {
      for (let len = 10; len <= 32; len += 2) {
        const c = "P-" + createHmac("sha256", secret).update(`${batchId}|${k}`).digest("hex").slice(0, len).toUpperCase();
        if (!dipakai.has(c)) { alias = c; break; }
      }
      dipakai.add(alias!); existing.set(k, alias!); baru++;
    }
    hasil.push(alias!);
  }
  const hilang = [...existing.keys()].filter((k) => !terlihat.has(k)).map((k) => existing.get(k)!);
  return { alias: hasil, baru, duplikat, hilang };
}
/** Histogram agregat: jumlah peserta aktif per jumlah modul selesai. Cukup untuk tren; tanpa progres per orang. */
export function histogram(ps: Peserta[]): Record<number, number> {
  const h: Record<number, number> = {};
  for (const p of ps.filter((x) => !x.batal)) h[p.modulSelesai] = (h[p.modulSelesai] ?? 0) + 1;
  return h;
}
export type Anomali =
  | "total_modul_berubah" | "peserta_turun_tajam" | "progres_mundur" | "lulus_turun" | "peserta_hilang" | "kunci_duplikat";
export interface Ringkas { aktif: number; onboarding: number; lulus: number; totalModul: number }
/** Bandingkan snapshot hari ini dengan sebelumnya + perbandingan per alias (kemarin vs hari ini). */
export function bandingkanSnapshot(
  prev: Ringkas | null, cur: Ringkas,
  prevPerAlias: Map<string, number> | null, curPerAlias: Map<string, number>, duplikat = 0,
): { anomali: Anomali[]; regresi: number; hilang: number; baru: number } {
  const an: Anomali[] = []; let regresi = 0, hilang = 0, baru = 0;
  if (prev) {
    if (prev.totalModul !== cur.totalModul) an.push("total_modul_berubah");
    if (cur.aktif < prev.aktif - Math.max(3, Math.ceil(prev.aktif * 0.1))) an.push("peserta_turun_tajam");
    if (cur.lulus < prev.lulus) an.push("lulus_turun");
  }
  if (prevPerAlias) {
    for (const [a, m] of prevPerAlias) {
      if (!curPerAlias.has(a)) hilang++;
      else if ((curPerAlias.get(a) as number) < m) regresi++;
    }
    for (const a of curPerAlias.keys()) if (!prevPerAlias.has(a)) baru++;
    if (regresi > 0) an.push("progres_mundur");
    if (hilang > 0) an.push("peserta_hilang");
  }
  if (duplikat > 0) an.push("kunci_duplikat");
  return { anomali: an, regresi, hilang, baru };
}
export function checksumRows(rows: (string | number)[][]): string {
  return createHmac("sha256", "checksum").update(JSON.stringify(rows)).digest("hex").slice(0, 24);
}
