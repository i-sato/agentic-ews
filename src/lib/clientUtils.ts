// Client-safe formatting utilities mirroring deterministic reference/rules.ts for UI display

export type Level = "Fundamental" | "Intermediate";

export function maskNoReg(noReg: string): string {
  const t = noReg.trim();
  return t.length <= 4 ? "*".repeat(t.length) : "*".repeat(t.length - 4) + t.slice(-4);
}

export function containsPii(teks: string): boolean {
  return /\b\d{16}\b|[\w.+-]+@[\w-]+\.[\w.]+|\b(?:\+62|08)\d{8,12}\b/.test(teks);
}

const norm = (s: string) => s.normalize("NFKD").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

export function containsIdentifier(teks: string, identifiers: string[]): boolean {
  const t = norm(teks);
  return (
    identifiers.some((i) => {
      const n = norm(i);
      return n.length >= 4 && t.includes(n);
    }) || containsPii(teks)
  );
}

const BULAN: Record<string, number> = {
  jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4, mei: 5, may: 5,
  jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, agt: 8, agus: 8, agustus: 8, aug: 8, sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, nov: 11, november: 11, des: 12, desember: 12, dec: 12,
};

export interface ParseNama {
  idPelatihan: string | null;
  temaAtauAlias: string | null;
  tglMulai: { d: number; m: number } | null;
  tglSelesai: { d: number; m: number } | null;
  keyakinan: "tinggi" | "sedang" | "rendah";
  catatan: string[];
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

export function normalisasiLevel(s: string): Level | null {
  const x = s.trim().toLowerCase();
  if (x === "fundamental" || x === "basic") return "Fundamental";
  if (x === "intermediate") return "Intermediate";
  return null;
}

