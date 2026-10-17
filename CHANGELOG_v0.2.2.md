# Perubahan v0.2.2 (dari v0.2.1): minimisasi identitas

Alasan: nama tidak perlu disimpan; nomor registrasi cukup untuk tindak lanjut. Nomor registrasi tetap data pribadi.

## Perilaku baru
1. Nama dan instansi tidak disimpan (hanya di sheet sumber). Hanya nomor registrasi disimpan, di `private.alias_map`.
2. UI menampilkan nomor registrasi tersamar; nomor penuh hanya lewat `buka_identitas(alias, alasan)` (admin, alasan >= 10 karakter, tercatat di audit_log).
3. Gemini dan laporan tidak pernah menerima nomor registrasi; sentinel keluar `containsIdentifier` memeriksanya.
4. Catatan pembatalan lintas batch NONAKTIF sampai admin memverifikasi apakah nomor registrasi stabil lintas batch (`noreg_stabil_lintas_batch`: ya, tidak, belum_diverifikasi).
5. Baris tanpa nomor registrasi: item validasi `no_registrasi_kosong`.

## Berkas
Baru: `contracts/migrations/003_minimisasi_identitas.sql`, `CHANGELOG_v0.2.2.md`.
Diubah: `reference/rules.ts`, `reference/rules.test.ts`, `SPEC.md`, `README.md`, `PANDUAN_MULAI.md`, `knowledge/aturan_talenta_digital_v1.md`, `agents/shared/guardrails.md`, `contracts/tools.json`, `docs/ai_studio_prompts/00_cara_pakai.md`, `02_batch_fetch_validasi.md`, `03_dashboard_ews.md`, `05_laporan_privasi.md`, `docs/lovable_prototype/prompts.md`.

## Cara menerapkan
- Belum menjalankan apa pun / belum ada data: timpa berkas, jalankan migrasi 001, 002, 003 berurutan.
- Sudah menjalankan 001 dan 002 tanpa data asli: timpa berkas, jalankan hanya 003.
- Sudah ada data asli: JANGAN jalankan 003 begitu saja (menghapus kolom nama/instansi); hubungi saya untuk migrasi data.
- Di AI Studio, setelah berkas diperbarui di repositori dan disinkronkan, tempel: "Berkas SPEC.md, contracts/ dan agents/ diperbarui ke v0.2.2 (minimisasi identitas). Baca ulang dan sesuaikan kode yang sudah ada dengan aturan baru; jangan ubah folder terlindungi."
