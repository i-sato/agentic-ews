import { z } from "zod";

// 1. pk_profil.schema.json
export const PkIndikatorTargetAntaraSchema = z.object({
  bulan: z.number().int().min(1).max(12),
  nilai: z.number(),
});

export const PkIndikatorSchema = z.object({
  kode: z.string(),
  sasaran: z.string().optional(),
  nama: z.string(),
  target: z.number(),
  satuan: z.string().optional(),
  polaritas: z.enum(["Maximize", "Minimize", "Stabilize"]),
  rumus_teks: z.string(),
  pelaporan: z.enum(["bulanan", "triwulan", "semester", "tahunan"]),
  target_antara: z.array(PkIndikatorTargetAntaraSchema).optional(),
  tim_kerja_kode: z.string().nullable().optional(),
  kutipan_sumber: z.string().optional(),
});

export const PkPeringatanSchema = z.object({
  kode: z.enum([
    "rumus_berubah",
    "target_beda",
    "tim_tidak_dikenal",
    "bagian_tidak_terbaca",
    "lainnya",
  ]),
  pesan: z.string(),
});

export const PkProfilSchema = z.object({
  tahun: z.number().int(),
  status: z.enum(["terbaca", "terbaca_dengan_peringatan", "gagal_dibaca"]),
  indikator: z.array(PkIndikatorSchema),
  peringatan: z.array(PkPeringatanSchema),
});

export type PkProfil = z.infer<typeof PkProfilSchema>;

// 2. ews_analisis.schema.json
export const EwsBatchItemSchema = z.object({
  batch_id: z.string(),
  tingkat: z.enum(["aman", "waspada", "kritis", "belum_dapat_dinilai"]),
  alasan: z.string(),
  angka_dirujuk: z.array(z.string()).optional(),
  tindakan_disarankan: z.array(z.string()).optional(),
});

export const EwsAnalisisSchema = z.object({
  ringkasan: z.string().max(600),
  batch: z.array(EwsBatchItemSchema),
  prioritas: z.array(z.string()),
  keterbatasan: z.array(z.string()),
});

export type EwsAnalisis = z.infer<typeof EwsAnalisisSchema>;

// 3. filename_parse.schema.json
export const FilenameParseSchema = z.object({
  id_pelatihan: z.string().regex(/^[0-9]{5}$/).nullable(),
  tema_atau_alias: z.string().nullable(),
  level: z.enum(["Fundamental", "Intermediate"]).nullable(),
  tanggal_mulai: z.string().nullable(),
  tanggal_selesai: z.string().nullable(),
  keyakinan: z.enum(["tinggi", "sedang", "rendah"]),
  catatan: z.string(),
});

export type FilenameParse = z.infer<typeof FilenameParseSchema>;

// 4. laporan_bagian.schema.json
export const LaporanBagianSchema = z.object({
  bagian: z.enum([
    "Ringkasan_Capaian",
    "Kondisi_Batch",
    "Pelaksanaan_Non_Capaian",
    "Analisis",
    "Rekomendasi",
    "Catatan_Penggunaan_AI",
  ]),
  teks: z.string(),
  angka_dirujuk: z.array(z.string()),
});

export type LaporanBagian = z.infer<typeof LaporanBagianSchema>;

// 5. ringkasan_harian.schema.json
export const AnomaliTriaseSchema = z.object({
  batch_id: z.string(),
  jenis: z.enum([
    "total_modul_berubah",
    "peserta_turun_tajam",
    "progres_mundur",
    "lulus_turun",
    "peserta_hilang",
    "kunci_duplikat",
    "data_basi",
    "fetch_gagal",
    "tab_hilang",
    "akses_ditolak",
  ]),
  penilaian: z.enum(["kemungkinan_perubahan_wajar", "perlu_cek_manusia", "tidak_jelas"]),
  saran: z.string(),
});

export const BatchUntukAnalisisSchema = z.object({
  batch_id: z.string(),
  alasan: z.string(),
});

export const RingkasanHarianSchema = z.object({
  ringkasan: z.string().max(500),
  anomali_triase: z.array(AnomaliTriaseSchema),
  batch_untuk_analisis: z.array(BatchUntukAnalisisSchema),
  keterbatasan: z.array(z.string()),
});

export type RingkasanHarian = z.infer<typeof RingkasanHarianSchema>;

// 6. verifikasi.schema.json
export const TemuanVerifikasiSchema = z.object({
  bagian: z.string(),
  jenis: z.enum([
    "angka_tak_dikenal",
    "klaim_tanpa_dasar",
    "pii_terdeteksi",
    "bahasa_menetapkan_individu",
    "lainnya",
  ]),
  detail: z.string(),
});

export const VerifikasiSchema = z.object({
  lolos: z.boolean(),
  temuan: z.array(TemuanVerifikasiSchema),
});

export type Verifikasi = z.infer<typeof VerifikasiSchema>;
