# Perubahan v0.2.3 (dari v0.2.2)
- BARU: `PANDUAN_KUNCI_RAHASIA.md` (asal, cara membuat, tempat mengisi, uji, rotasi tiap kunci), `.gitignore`, `.env.example`.
- Nama kunci Supabase: publishable/secret (kunci lama anon/service_role setara; dihentikan Supabase paling lambat akhir 2026). Variabel: `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- Cron Vercel dipanggil dengan GET dan bersifat best effort (bisa terlewat/ganda); prompt 02b diperbaiki (sebelumnya POST). Paket Hobby: sekali sehari, jam bebas dalam jam yang ditentukan.
- Gemini: produksi memakai layanan berbayar; ketentuan data dicatat di SPEC.
- `GOOGLE_SERVICE_ACCOUNT_JSON` menerima JSON mentah atau base64.
Diubah: README.md, PANDUAN_MULAI.md, SPEC.md, docs/ai_studio_prompts/01_fondasi.md, 02_batch_fetch_validasi.md, 02b_pemantauan_harian.md.
Tidak ada perubahan skema SQL atau kode aturan.
