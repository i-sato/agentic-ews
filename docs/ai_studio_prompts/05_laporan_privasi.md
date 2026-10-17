# Fase 5: Laporan, privasi, penerapan
Tugas:
1. Template DOCX di storage (kop surat tetap, penanda `<<...>>`). docxtemplater dengan delimiter `<<`/`>>`; Tabel_Batch lewat loop baris. Pisahkan penanda sesuai SPEC bagian 8. `<<MM_month>>` = nama bulan, `<<YY_year>>` = 4 digit.
2. Laporan memakai snapshot terbaru semua batch dipantau pada bulan itu; tampilkan dan cantumkan tanggal pengambilan data di `<<Sumber_Data>>`; peringatkan bila ada batch berstatus data basi. Alur laporan sebagai agent_run 11 langkah: pilih periode -> ambil batch -> cek validasi -> hitung -> proyeksi -> rencana -> tulis bagian -> isi token metrik -> periksa (deterministik) -> verifikator -> gerbang manusia.
3. Penulis menghasilkan bagian dengan token `{{metrik:KUNCI}}`; kode mengganti token; angka telanjang ditolak.
4. Tinjau: pratinjau, edit teks, setujui -> render DOCX -> unduh (tidak ada Google Doc). Versi laporan tersimpan; persetujuan ke audit_log.
5. Menu Privasi dan Kepatuhan: log pembukaan identitas (dari audit_log aksi `buka_identitas`: waktu, pengguna, alias, alasan), status verifikasi `noreg_stabil_lintas_batch`, inventaris pemrosesan, retensi (retention_policy + tugas pembersihan), permintaan subjek data, log insiden (pengingat 3x24 jam), daftar akses alias_map (alasan wajib), catatan DPIA, ringkasan SE 9/2023 sebagai dasar kebijakan (isi "pertimbangan", bukan klaim kepatuhan).
6. Penerapan: GitHub -> Vercel. Variabel lingkungan di Vercel, region terdekat; uji server AI Studio sebagai Vercel Functions dan sesuaikan; cek lokasi data dan ketentuan layanan.
Selesai bila: laporan Agustus (data fiktif) terunduh, angka sama dengan tabel, tanpa PII.
