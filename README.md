# Paket Pembangunan: EWS dan Laporan Bulanan Capaian PK (Talenta Digital)

UPT BLSDM Komdigi Yogyakarta. Versi paket 0.2.2 (draf untuk ditinjau tim). Perubahan v0.2.2: nama dan instansi tidak disimpan, hanya nomor registrasi (private), pembukaan lewat `buka_identitas`, catatan pembatalan lintas batch nonaktif sampai diverifikasi. Perubahan v0.2: banyak batch, pembaruan harian dari tautan sheet (cron + tombol), mapping alias dipakai ulang, EWS berfase waktu dengan target per bulan dari PK, agent Pemantau Harian.

## Status platform
- **Lovable** = prototipe layar dan alur, hanya data contoh (lihat `docs/lovable_prototype/`).
- **Google AI Studio -> GitHub -> Vercel** = jalur pengembangan utama (lihat `docs/ai_studio_prompts/`).
- **Supabase** (akun sendiri) = database, auth, RLS, realtime. Skema produksi berasal dari `contracts/migrations/`, bukan dari prototipe.

## Mulai dari sini
Baca `PANDUAN_MULAI.md` (langkah demi langkah dari akun sampai fase 1) dan `PANDUAN_KUNCI_RAHASIA.md` (dari mana tiap kunci diperoleh dan cara menyiapkannya).

## Isi
| Berkas/Folder | Fungsi |
|---|---|
| `SPEC.md` | Keputusan, aturan hitung, ruang lingkup MVP-1, batas AI Agent |
| `contracts/migrations/001_schema.sql`, `002_pemantauan.sql`, `003_minimisasi_identitas.sql` | Skema Postgres + RLS (sumber kebenaran data). Jalankan berurutan 001, 002, 003 |
| `contracts/schemas/*.json` | JSON Schema keluaran terstruktur agent |
| `contracts/tools.json` | Deklarasi alat (function calling Gemini) |
| `agents/*.md` (termasuk `pemantau_harian.md`), `agents/shared/guardrails.md` | System instruction tiap agent (Markdown, di Git) |
| `knowledge/aturan_talenta_digital_v1.md` | Rule pack yang dibaca agent dan kode |
| `reference/` | Implementasi referensi TypeScript (hitung capaian, parsing nama file, masking) + uji |
| `tests/golden/` | Kasus uji emas (data fiktif) |
| `docs/ai_studio_prompts/` | Prompt bertahap per fase untuk AI Studio |
| `docs/lovable_prototype/` | Brief knowledge, prompt layar, data contoh untuk Lovable |

## Cara pakai singkat
1. Buat repo GitHub, salin seluruh isi paket.
2. Buat proyek Supabase (akun sendiri), jalankan `001_schema.sql`, `002_pemantauan.sql`, lalu `003_minimisasi_identitas.sql` (sebelum ada data).
3. Di AI Studio (Build mode) hubungkan repo, jalankan prompt fase 1..5 berurutan.
4. `cd reference && node --test` untuk memastikan aturan hitung benar sebelum dan sesudah tiap fase.
5. Variabel lingkungan (server saja): `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (sisi UI: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`), `ALIAS_HMAC_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON` (read-only), `CRON_SECRET`. Jangan pernah di kode klien.

## Peringatan
- Data peserta diperlakukan sebagai data pribadi (kemungkinan termasuk anak/remaja). Jangan unggah data asli ke Lovable atau alat uji.
- Pemetaan UU No. 27/2022 dan SE Menkominfo 9/2023 dalam `SPEC.md` adalah pertimbangan teknis, bukan nasihat hukum. Verifikasi ke teks resmi dan pejabat/petugas PDP.
- Hal belum terverifikasi tercantum di `SPEC.md` bagian "Terbuka".
