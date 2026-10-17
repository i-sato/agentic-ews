# Cara memakai prompt AI Studio
- Jalankan berurutan (fase 1, 2, 2b, 3, 4, 5). Jalankan migrasi 001, 002, lalu 003 di Supabase sebelum fase 2 (sebelum ada data). Setelah tiap fase: `cd reference && node --test`, uji manual dengan data fiktif, commit ke GitHub.
- Sebelum fase 1, taruh isi paket ke repo dan hubungkan ke AI Studio (sinkron GitHub). Hindari mengedit berkas yang sama dari dua sisi bersamaan.
- Tempel bagian "Konteks tetap" di awal setiap fase (AI Studio belum tentu mengingat fase sebelumnya).
- Jangan tempel data asli peserta ke AI Studio.
- AI Studio mungkin tidak punya terminal. Uji aturan dijalankan otomatis oleh GitHub Actions (`.github/workflows/test.yml`) setiap commit; lihat tab Actions di GitHub (harus hijau).
- Variabel server tambahan mulai fase 2: `GOOGLE_SERVICE_ACCOUNT_JSON` (read-only, hanya server), `CRON_SECRET`.
- Jika AI Studio mengubah `contracts/` atau `reference/rules.ts` tanpa diminta, tolak/kembalikan (git diff).

## Konteks tetap (tempel di tiap fase)
```
Proyek: EWS capaian PK pelatihan + laporan bulanan (Talenta Digital, UPT BLSDM Yogyakarta). Baca README.md, SPEC.md, knowledge/aturan_talenta_digital_v1.md, contracts/ dan agents/ di repo. Aturan:
- TypeScript, React + Vite, Tailwind, shadcn/ui, Recharts, Zod. Backend = fungsi server (folder server/, dapat dipindah ke Vercel Functions), terpisah dari UI.
- Database & auth: Supabase memakai contracts/migrations/001_schema.sql. Jangan ubah skema tanpa migrasi baru.
- Aturan hitung hanya dari reference/rules.ts (jangan tulis ulang logika di UI). GEMINI_API_KEY dan kunci service hanya di server.
- AI tidak menghitung angka. Angka dari alat. Satu gerbang manusia: persetujuan laporan, plus Antrean Validasi.
- Nama dan instansi tidak disimpan sama sekali. Nomor registrasi hanya di skema private; di UI selalu tersamar kecuali lewat RPC buka_identitas. Jangan kirim ke Gemini atau laporan. Jangan menaruh kredensial di kode.
- UI berbahasa Indonesia.
```
