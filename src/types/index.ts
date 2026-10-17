export type Level = "Fundamental" | "Intermediate";
export type Fase = "belum_mulai" | "pantau" | "aktif" | "akhir" | "selesai";
export type EwsTingkat = "aman" | "waspada" | "kritis" | "belum_dapat_dinilai";

export interface PesertaItem {
  id: string;
  alias: string;
  noRegMasked: string;
  noRegReal?: string;
  modulSelesai: number;
  totalModul: number;
  batal: boolean;
  statusOnboarding: boolean;
  statusLulus: boolean;
  kunciBaris?: string;
}

export interface BatchData {
  id: string;
  kodePelatihan: string;
  namaProgram: string;
  sheetUrl: string;
  sheetName: string;
  tabName: string;
  level: Level;
  levelTerkonfirmasi: boolean;
  levelSumber: "nama_berkas" | "manual_admin" | "gemini_parser";
  masukCapaianPk: boolean;
  tglMulai: string; // YYYY-MM-DD
  tglSelesai: string; // YYYY-MM-DD
  tahunAnggaran: number;
  dipantau: boolean;
  validasiOk: boolean;
  lastFetchIso: string | null;
  lastFetchStatus: "ok" | "tidak_berubah" | "gagal" | "tab_hilang" | "akses_ditolak";
  totalModul: number;
  totalPendaftar: number;
  peserta: PesertaItem[];
  catatan?: string[];
  hasilEws?: {
    fase: Fase;
    sisaHari: number;
    tingkat: EwsTingkat;
    alasan: string;
    K: number;
    B: number;
    R: number | null;
  };
}

export interface SnapshotHarian {
  batchId: string;
  tanggalIso: string;
  aktif: number;
  onboarding: number;
  lulus: number;
  totalModul: number;
  capaianPersen: number | null;
  histogram: Record<number, number>;
}

export interface ValidationItem {
  id: string;
  batchId: string;
  batchNama: string;
  tipe: "level_belum_pasti" | "lintas_tahun" | "total_modul_berubah" | "peserta_turun" | "progres_mundur" | "kunci_duplikat" | "tab_hilang";
  judul: string;
  deskripsi: string;
  saran: string;
  status: "menunggu" | "diterima" | "diubah" | "ditolak";
  waktu: string;
}

export interface AgentRunStep {
  no: number;
  nama: string;
  status: "selesai" | "berjalan" | "menunggu" | "peringatan" | "gagal";
  durasiMs: number;
  alat?: string[];
  ringkasan: string;
  dataTerkirimKeAi?: string;
}

export interface AgentRun {
  id: string;
  agentNama: "Pemantau Harian" | "Analis EWS" | "Pembaca PK" | "Penulis Laporan" | "Verifikator";
  tipePemicu: "terjadwal" | "manual";
  waktuMulai: string;
  status: "berjalan" | "selesai" | "selesai_dengan_peringatan" | "perlu_keputusan" | "gagal";
  ringkasan: string;
  steps: AgentRunStep[];
}

export interface AuditLogItem {
  id: string;
  waktu: string;
  adminEmail: string;
  aksi: string;
  target: string;
  alasan?: string;
  ipAddress?: string;
  status: "sukses" | "ditolak";
}

export interface LaporanBulanan {
  id: string;
  tahunAnggaran: number;
  bulan: number;
  bulanNama: string;
  status: "draf" | "dalam_tinjauan" | "disetujui";
  targetPk: number;
  capaianKumulatif: number;
  jumlahBatchFundamental: number;
  jumlahBatchIntermediate: number;
  tanggalPenyusunan: string;
  disetujuiOleh?: string;
  waktuDisetujui?: string;
  sections: {
    ringkasanCapaian: string;
    tabelBatch: string;
    kondisiBatch: string;
    pelaksanaanNonCapaian: string;
    analisis: string;
    rekomendasi: string;
    sumberData: string;
    catatanPenggunaanAi: string;
  };
}
