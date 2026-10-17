# Rule pack: talenta_digital_v1

Dipakai oleh kode (konstanta) dan dibaca agent (konteks). Perubahan = versi baru + uji emas.

## Parameter
- `ambang_onboarding_persen`: 90 (onboarding bila selesai*10 >= total*9)
- `lulus`: semua modul selesai
- `target_default_persen`: 87 (diganti dari Profil PK bila terbaca)
- `level_masuk_capaian`: [Fundamental]
- Sinonim: Basic = Fundamental
- Tab data: "All Pendaftar Web" (konfigurasi; verifikasi pada contoh nyata)
- Status dikeluarkan: Pembatalan (catatan lintas batch hanya bila `catatan_lintas_batch_aktif` = true, setelah nomor registrasi diverifikasi stabil)
- Identitas: hanya nomor registrasi yang disimpan (private); nama dan instansi tidak disimpan
- Pola tautan pelatihan: https://digitalent.komdigi.go.id/pelatihan/{id}
- Tingkat EWS dan parameter waktu: lihat bawah

## Tingkat EWS (keputusan kode: `tingkatEws`/`evaluasiPortofolio`; AI hanya menjelaskan)
Definisi: K = kekurangan lulus agar kumulatif >= target (dengan batch lain dianggap tetap); B = onboarding yang belum lulus; R = K/B (bagian dari yang belum lulus yang HARUS lulus).
Target = target bulan berjalan dari Profil PK (target_antara; contoh 2026: Jan-Apr 0, Mei-Des 87). Target 0 -> tidak ada tingkat capaian. Profil gagal dibaca/tidak ada -> belum_dapat_dinilai (angka tetap tampil). ASUMSI (belum dikonfirmasi): target antara berlaku pada capaian kumulatif sampai bulan tersebut.

Fase waktu (f = persen durasi berjalan; parameter di tabel `ews_parameter`, awal ditetapkan sebagai titik mula, PERLU KALIBRASI dengan 2-3 batch berdata harian):
| Fase | Kondisi | Waspada | Kritis |
|---|---|---|---|
| belum_mulai | sebelum tanggal mulai | - | - (belum dapat dinilai) |
| pantau | f < 40% | K > 0 | tidak ada, kecuali R > 1 |
| aktif | 40% <= f < 75% dan sisa > 7 hari | K > 0 | R >= 0,75 |
| akhir | f >= 75% atau sisa <= 7 hari | K > 0 | R >= 0,50 |
| selesai | lewat tanggal selesai | - | K > 0 (target belum tercapai; batch lain harus mengompensasi) |
Selain itu: K = 0 -> aman; R > 1 -> kritis kapan pun (tidak mungkin tercapai dari batch ini).
belum_dapat_dinilai bila: level belum terkonfirmasi, data belum valid (Antrean Validasi), onboarding 0, target tidak diketahui/0, atau belum mulai.

Portofolio (banyak batch dipantau): kumulatif resmi hanya dari batch masuk_capaian_pk, level terkonfirmasi, valid. K_total/B_total tanpa hitung ganda; B_total hanya dari batch yang belum selesai. Fase portofolio = fase batch berjalan dengan tanggal selesai paling akhir. Urutan prioritas: tingkat, lalu yang masih berjalan, lalu R tertinggi.

Pemantauan: batch dipantau sampai tanggal selesai + grace (7 hari). Data basi bila tidak diperbarui > 2 hari (peringatan data). "Hari ini" = tanggal WIB.

Tren harian (informasional pada MVP-1): penambahan lulus/onboarding per hari dari snapshot agregat. Penaik tingkat berbasis laju = setelah kalibrasi.

## Indikator risiko yang boleh dipakai analis
Hanya progres belajar: persentase modul terselesaikan, jumlah peserta di tepi ambang onboarding (selesai = ambang-1), tren harian, jarak ke 100%. Dilarang: sekolah/instansi, gender, usia, daerah, nomor registrasi, atribut pribadi lain.

## Bagian laporan dan sumbernya
Ringkasan_Capaian (hitung_capaian), Tabel_Batch (kode), Kondisi_Batch, Pelaksanaan_Non_Capaian (Intermediate), Analisis, Rekomendasi, Sumber_Data (kode: daftar berkas + tanggal ambil), Catatan_Penggunaan_AI (opsional).
