# Fase 3: Dashboard portofolio, EWS berfase, Aktivitas Agent
Tugas:
1. Dashboard portofolio: semua batch dipantau pada TA terpilih. Kartu atas: capaian kumulatif tertimbang (`evaluasiPortofolio.kumulatif`) vs target bulan berjalan (`targetBerlaku` dari pk_profil; Jan-Apr target 0 -> tampilkan "belum ada target bulan ini"), K_total, B_total, tingkat portofolio. Tabel batch urut prioritas (`perBatch`): fase, sisa hari, onboarding, lulus, K, B, R, tingkat + alasan dalam bahasa Indonesia, status data (segar/basi), tombol perbarui. Batch Intermediate di bagian "Non-capaian PK". Tingkat selalu dengan ikon + teks, tidak hanya warna.
2. Tren harian dari `snapshot` (garis: onboarding, lulus; garis target; penanda perubahan tingkat dari `ews_perubahan_tingkat`).
3. Parameter EWS: halaman admin untuk melihat/mengubah `ews_parameter` (validasi rentang, alasan wajib, tulis `ews_parameter_log`/audit). Fungsi `PARAM` dibaca dari DB.
4. Aktivitas Agent: daftar `agent_runs` (filter manual/terjadwal) dan detail timeline `agent_run_steps` via Supabase Realtime; panel "Data yang dikirim ke AI" per langkah. Pembungkus `runStep(...)` mencatat durasi, ringkasan, sumber pengetahuan.
5. Pengaturan: kill-switch AI (`ai_aktif`) dan `pemantauan_harian_aktif`.
Aturan: UI tidak menghitung; semua angka dan tingkat dari fungsi server memakai `rules.ts`.
