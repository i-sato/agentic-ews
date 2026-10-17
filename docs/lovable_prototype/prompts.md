# Prompt bertahap Lovable (prototipe)
Pakai Lovable tanpa menyambungkan data asli. Pilihan Lovable Cloud boleh untuk data fiktif; skema TIDAK dibawa ke produksi.

## 1. Kerangka
"Buat aplikasi React (Vite, Tailwind, shadcn/ui) berbahasa Indonesia dengan layar login administrator (form saja, tanpa backend), sidebar: Dashboard, Batch, Antrean Validasi, Laporan, Aktivitas Agent, Kartu Agent, Privasi dan Kepatuhan; header pemilih Tahun Anggaran (2026). Gunakan data statis fiktif di src/mock/. Beri badge 'Prototipe - data contoh'."

## 2. Dashboard portofolio
"Dashboard memantau BANYAK batch sekaligus: kartu capaian kumulatif tertimbang vs target bulan berjalan (Mei-Des 87%; Jan-Apr tampilkan 'belum ada target bulan ini'), kekurangan lulus total dan sisa belum lulus. Tabel batch urut prioritas: nama program, level, fase (Pantau/Aktif/Akhir/Selesai) + sisa hari, onboarding, lulus, kekurangan (K), belum lulus (B), beban R=K/B, tingkat EWS aman/waspada/kritis/belum dapat dinilai (warna + ikon + teks) dengan alasan singkat, lencana data 'segar'/'basi' + waktu pembaruan terakhir, tombol 'Perbarui'. Grafik tren harian onboarding dan lulus per batch dengan garis target. Batch Intermediate di bagian 'Non-capaian PK'. Batch level belum terkonfirmasi diberi label 'sementara'. Kotak 'Ringkasan harian' (teks contoh dari agent). Pakai mock/batches.ts dan mock/snapshots.ts."

## 3. Batch, tautan sheet, dan pembaruan
"Halaman Batch: kotak 'Tambah batch' untuk menempel BANYAK tautan Google Sheets (satu per baris; simulasi), daftar batch dengan status pemantauan (aktif/nonaktif), waktu pembaruan terakhir, hasil terakhir (ok/tidak berubah/gagal/tab hilang/akses ditolak), tombol 'Perbarui sekarang' per batch dan 'Perbarui semua' (simulasi dengan spinner), info 'Pembaruan otomatis setiap hari 07:00 WIB'. Unggah berkas sebagai cadangan. Setelah menambah, tampilkan hasil parsing nama berkas ('MIRROR - DTA VBL 13107 OIAT 10 -31 Agustus') sebagai form yang dapat diedit: ID pelatihan (tautan https://digitalent.komdigi.go.id/pelatihan/ID), tema/alias, level (Fundamental/Intermediate, penanda sumber), tanggal mulai/selesai, Tahun Anggaran otomatis dari tanggal mulai (peringatan jika lintas tahun). Tampilkan rekap: pendaftar, mengikuti, onboarding, lulus. Tampilkan peringatan jika tab 'All Pendaftar Web' tidak ada."

## 4. Antrean Validasi
"Antrean Validasi: daftar item (level, ID pelatihan, tema tidak dikenal, lintas tahun, % LMS tidak cocok, tab hilang) dengan detail, saran, tombol Terima/Ubah/Tolak, status."

## 5. Aktivitas Agent
"Aktivitas Agent: daftar run dengan status; halaman detail berupa timeline vertikal 11 langkah penyusunan laporan (pilih periode, ambil batch, cek validasi, hitung capaian, proyeksi, rencana, tulis bagian, isi angka dari perhitungan, pemeriksaan otomatis, verifikator, menunggu persetujuan Anda). Tiap langkah: status, durasi, ringkasan, alat yang dipakai, sumber pengetahuan (PK 2026, Aturan Talenta Digital v1, Template Laporan, SE Menkominfo 9/2023, UU 27/2022), tombol 'Lihat data yang dikirim ke AI' (hanya alias+angka). Simulasikan kemajuan dengan timer. Tambahkan run terjadwal 'Pemantauan harian' berlangkah per batch: ambil data, bandingkan dengan kemarin, evaluasi EWS, triase anomali (AI), pilih analisis, ringkasan; beri lencana 'Terjadwal' vs 'Manual'."

## 6. Laporan
"Laporan: pilih bulan dan TA, tombol 'Susun draf', tampilkan bagian (Ringkasan Capaian, Tabel Batch, Kondisi Batch, Non-capaian, Analisis, Rekomendasi, Sumber Data, Catatan Penggunaan AI) dapat diedit, tombol Setujui, lalu Unduh (simulasi, tanpa berkas)."

## 7. Kartu Agent dan Privasi
"Kartu Agent: untuk Pembaca PK, Validator Masukan, Analis EWS, Penulis Laporan, Verifikator: tujuan, sumber pengetahuan, alat, data yang dikirim ke AI, model, batas otonomi, pengambil keputusan. Privasi dan Kepatuhan: log pembukaan nomor registrasi (waktu, pengguna, alias, alasan), inventaris pemrosesan, retensi, permintaan subjek data, log insiden (pengingat 3x24 jam), log akses pemetaan alias (alasan wajib), catatan: pertimbangan UU 27/2022 dan SE 9/2023, bukan klaim kepatuhan; kill-switch AI."

Setelah tinjau: ekspor tangkapan layar dan komponen sebagai referensi untuk AI Studio; jangan jadikan skema Lovable sebagai skema produksi.

## 8. Daftar tindak lanjut
"Di halaman detail batch tambahkan tab 'Tindak lanjut': tabel alias peserta (P-A1B2...), modul selesai/total, status (di tepi ambang / belum lulus), nomor registrasi tersamar (******7890). Tombol 'Tampilkan nomor registrasi' membuka dialog yang mewajibkan alasan (min. 10 karakter) lalu menampilkan nomor sementara 10 detik (data contoh). Tidak ada tombol ekspor. Catatan: 'Nama dan instansi tidak disimpan di sistem.'"
