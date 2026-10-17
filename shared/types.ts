// Database entity and domain types matching contracts/migrations 001, 002, 003

export type UserRole = "admin" | "operator" | "reviewer" | "viewer";

export interface UserProfile {
  id: string;
  nama: string;
  role_id: UserRole;
  aktif: boolean;
  must_change_password: boolean;
  created_at?: string;
  email?: string;
}

export interface TahunAnggaran {
  tahun: number;
}

export interface BatchItem {
  id: string;
  id_pelatihan?: string | null;
  tema?: string | null;
  alias?: string | null;
  nama_program?: string | null;
  level?: "Fundamental" | "Intermediate" | null;
  level_source?: "nama_berkas" | "manual" | "program_ref" | "belum" | null;
  tahun?: number | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  cross_year?: boolean;
  nama_berkas: string;
  sheet_url?: string | null;
  sheet_id?: string | null;
  sheet_gid?: string | null;
  tab_nama: string;
  total_modul?: number | null;
  masuk_capaian_pk: boolean;
  validasi_status: "valid" | "valid_dengan_peringatan" | "perlu_validasi" | "ditolak";
  dipantau: boolean;
  last_fetch_at?: string | null;
  last_fetch_status?: "ok" | "tidak_berubah" | "gagal" | "tab_hilang" | "akses_ditolak" | null;
  last_fetch_error?: string | null;
  last_checksum?: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface PesertaMasked {
  id: string;
  batch_id: string;
  alias: string;
  status_daftar?: string | null;
  modul_selesai: number;
  total_modul: number;
  onboarding: boolean;
  lulus: boolean;
  batal: boolean;
}

export interface Snapshot {
  id: string;
  batch_id: string;
  tanggal?: string | null;
  diambil_pada: string;
  peserta_aktif: number;
  onboarding: number;
  lulus: number;
  capaian: number | null;
  total_modul?: number | null;
  histogram?: Record<number, number> | null;
  checksum?: string | null;
  berubah?: boolean;
  anomali?: string[] | null;
  sumber?: string | null;
  pemicu?: "cron" | "manual" | "unggah" | null;
}

export interface ValidationItem {
  id: string;
  batch_id?: string | null;
  jenis:
    | "level"
    | "id_pelatihan"
    | "tema_tidak_dikenal"
    | "lintas_tahun"
    | "lms_tidak_cocok"
    | "tab_hilang"
    | "pk_formula"
    | "lainnya";
  detail: Record<string, any>;
  saran?: Record<string, any> | null;
  status: "terbaca" | "terbuka" | "diterima" | "diubah" | "ditolak";
  diputuskan_oleh?: string | null;
  diputuskan_pada?: string | null;
}

export interface EwsHasil {
  id: string;
  tahun: number;
  periode_awal?: string | null;
  periode_akhir?: string | null;
  batch_id?: string | null;
  tingkat: "aman" | "waspada" | "kritis" | "belum_dapat_dinilai";
  metrik: Record<string, any>;
  analisis?: Record<string, any> | null;
  agent_run_id?: string | null;
  created_at: string;
}

export interface Laporan {
  id: string;
  tahun: number;
  bulan: number;
  versi: number;
  status: "draf" | "menunggu_tinjauan" | "disetujui" | "dibatalkan";
  isi: Record<string, any>;
  template_versi?: string | null;
  storage_path?: string | null;
  agent_run_id?: string | null;
  disetujui_oleh?: string | null;
  disetujui_pada?: string | null;
}

export interface AgentRun {
  id: string;
  jenis: string;
  status:
    | "menunggu"
    | "berjalan"
    | "selesai"
    | "selesai_dengan_peringatan"
    | "perlu_keputusan"
    | "gagal"
    | "dibatalkan";
  parameter?: Record<string, any> | null;
  model?: string | null;
  pemicu?: "manual" | "terjadwal";
  dimulai_oleh?: string | null;
  mulai: string;
  selesai?: string | null;
}

export interface AgentRunStep {
  id: string;
  run_id: string;
  urutan: number;
  nama: string;
  alat?: string | null;
  status: "menunggu" | "berjalan" | "selesai" | "gagal";
  ringkasan?: string | null;
  data_dikirim_ai?: Record<string, any> | null;
  durasi_ms?: number | null;
  mulai?: string | null;
  selesai?: string | null;
}

export interface AuditLogEntry {
  id: number;
  waktu: string;
  user_id?: string | null;
  aksi: string;
  objek?: string | null;
  alasan?: string | null;
  detail?: Record<string, any> | null;
}

export interface PrivacyInventoryItem {
  id: number;
  aktivitas: string;
  tujuan: string;
  dasar: string;
  data_dipakai: string;
  penerima: string;
  retensi: string;
}

export interface IncidentLogItem {
  id: string;
  ditemukan: string;
  deskripsi: string;
  dampak: string;
  notifikasi_pada?: string | null;
  status: string;
}

export interface DataSubjectRequest {
  id: string;
  jenis: string;
  diterima: string;
  tenggat: string;
  status: string;
  catatan?: string | null;
}

export interface AuthSessionState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token?: string | null;
  expiresAt?: number | null;
  isLockedOut?: boolean;
  lockedUntil?: number | null;
  remainingLockoutSeconds?: number;
  failedAttempts?: number;
}
