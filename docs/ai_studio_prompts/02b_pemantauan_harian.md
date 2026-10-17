# Fase 2b: Cron harian dan tombol perbarui
Tugas:
1. Endpoint `POST /api/cron/pantau-harian` (Vercel Function). Wajib header `Authorization: Bearer ${CRON_SECRET}`; tolak selain itu. Tambah `vercel.json` cron (jam default 07:00 WIB = 00:00 UTC; ambil dari pengaturan bila memungkinkan). Periksa batas cron pada paket Vercel yang dipakai; alternatif: Supabase pg_cron memanggil endpoint, atau GitHub Actions terjadwal.
2. Tombol "Perbarui sekarang" (per batch) dan "Perbarui semua" yang memanggil alur yang sama dengan pemicu `manual`. Tampilkan `last_fetch_at`, status, dan lencana "basi" bila > `staleHari`.
3. Orkestrasi: buat `agent_runs` (pemicu `terjadwal` atau `manual`, jenis `pemantauan_harian`), satu langkah per batch (satu fetch per pemanggilan fungsi, lanjutkan lewat pemicu berikutnya), lalu langkah evaluasi dan ringkasan. Kegagalan satu batch dicatat, yang lain lanjut. Pengaturan `pemantauan_harian_aktif` dan `ai_aktif` dihormati.
4. Hanya hitung deterministik dulu (fetch, snapshot, evaluasi_ews, perubahan tingkat ke `ews_perubahan_tingkat`). Agent AI ditambahkan di fase 4.
5. Batch keluar dari pemantauan saat lewat tanggal selesai + grace (`pemantauanAktif`).
Uji: panggil endpoint tanpa secret (harus 401); dua kali di hari yang sama (satu snapshot, bukan dua).
