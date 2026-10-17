# Fase 1: Fondasi
Tugas:
1. Struktur proyek: `src/` (UI), `server/` (logika, agent, alat), `shared/` (tipe, Zod dari contracts/schemas). Salin `reference/rules.ts` ke `server/lib/rules.ts` tanpa modifikasi.
2. Klien Supabase (UI: publishable key + sesi pengguna; server: secret key; nama variabel di `.env.example`; jangan buat berkas .env yang ter-commit).
3. Login admin (Supabase Auth email+kata sandi). Tanpa pendaftaran mandiri. Kebijakan: kata sandi >= 12 karakter, penguncian sementara setelah 5 gagal, sesi habis setelah 30 menit tidak aktif, semua login dan aksi sensitif ke audit_log (via server). Tanpa 2FA (keputusan pengguna).
4. Layout: sidebar (Dashboard, Batch, Antrean Validasi, Laporan, Aktivitas Agent, Kartu Agent, Privasi dan Kepatuhan), header dengan pemilih Tahun Anggaran.
5. Halaman kosong terhubung routing.
6. Pastikan `.github/workflows/test.yml` tetap ada dan tidak diubah.
Selesai bila: login berfungsi, RLS menolak pengguna anonim, `node --test` hijau.
