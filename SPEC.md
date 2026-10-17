# SPEC MVP-1 (v0.2.3)

## Perubahan v0.2.3
- Nama kunci Supabase mengikuti yang baru (publishable/secret). Cron Vercel dipanggil dengan GET, best effort (idempoten). Gemini produksi memakai layanan berbayar. Panduan kunci rahasia ditambahkan.

## Perubahan v0.2.2 (minimisasi identitas)
- Nama dan instansi TIDAK disimpan di sistem; hanya ada di sheet sumber. Satu-satunya identitas yang disimpan: nomor registrasi, di skema `private` (admin, RLS), untuk tindak lanjut.
- Nomor registrasi tetap data pribadi (dapat dicocokkan dengan nama lewat sheet/LMS); tidak pernah dikirim ke Gemini dan tidak masuk laporan. Pembukaan penuh hanya lewat fungsi `buka_identitas` (alasan wajib, tercatat).
- Catatan peserta pembatalan lintas batch NONAKTIF sampai admin memverifikasi apakah nomor registrasi stabil lintas batch (`noreg_stabil_lintas_batch`).
- Sentinel keluar memeriksa teks terhadap daftar nomor registrasi yang sedang diproses.

## Perubahan v0.2
- Banyak batch dapat didaftarkan dan dipantau sekaligus (portofolio).
- Pembaruan harian dari tautan sheet yang sama (cron + tombol "Perbarui sekarang"), bukan unggah ulang. Unggah berkas = cadangan.
- Masking memakai mapping alias yang sudah ada (kunci baris stabil per batch).
- EWS punya dimensi waktu (fase pantau/aktif/akhir/selesai, R=K/B), target per bulan dari Profil PK, parameter di database.
- Agent baru: Pemantau Harian (terjadwal, otonomi terbatas).

## 1. Tujuan
Aplikasi EWS (peringatan dini) capaian pelatihan terhadap Perjanjian Kinerja (PK) dan penyusun draf laporan bulanan, untuk tim kerja Talenta Digital, UPT BLSDM Komdigi Yogyakarta.

## 2. PK 2026 (sumber: dokumen PK)
- Sasaran SK.1, indikator IKSK 1.1, target 87%, polaritas Maximize.
- Rumus: (jumlah peserta lulus / jumlah peserta onboarding) x 100%. Onboarding = progres modul >= 90%. Lulus = seluruh modul selesai.
- Pelaporan bulanan. Target antara: Jan-Apr 0; Mei-Des 87. Desember = monitoring/evaluasi (pelatihan sangat jarang).
- UPT: level Fundamental/Basic (VBL). Intermediate/Advanced = Pusbang. DEX nasional tidak dapat dipantau UPT.
- Profil PK dibaca per Tahun Anggaran (TA), versioned, read-only. Status: `terbaca`, `terbaca_dengan_peringatan`, `gagal_dibaca`. Perubahan rumus: sistem tetap memakai aturan yang dikenal + banner peringatan. Revisi via chat = MVP-2.

## 3. Aturan hitung (deterministik, kode)
1. Hitung ulang dari kolom modul; kolom % LMS dan STATUS dianggap tidak andal.
2. `selesai_n` = jumlah modul berstatus selesai per peserta.
3. Onboarding: `selesai_n * 10 >= total_modul * 9` (28 modul -> 26; 45 -> 41).
4. Lulus: `selesai_n == total_modul`.
5. Capaian batch = lulus/onboarding. Capaian kumulatif tahunan = SUM(lulus)/SUM(onboarding) (tertimbang, BUKAN rata-rata persen batch). Onboarding 0 -> capaian tidak terdefinisi (null), bukan 0.
6. Pembatalan: dikeluarkan dari semua perhitungan. Catatan lintas batch ("kemungkinan sama", konfirmasi lewat Antrean Validasi) memakai `kunciOrang`: mode `noreg` bila nomor registrasi terbukti stabil lintas batch, mode `nama` (hash saja) bila tidak. Fitur ini mati sampai `noreg_stabil_lintas_batch` diverifikasi admin.
7. Kebutuhan lulus untuk >= 87%: `ceil(0.87 * onboarding)` (mis. 45 -> 40). Dorong peserta ke 100%, bukan hanya 90%.
8. TA ditentukan dari tanggal mulai batch. Batch lintas tahun: peringatan, tetap pakai tanggal mulai.
9. Level dari nama berkas (bukan Final Assessment); dapat diubah manual (dicatat sumbernya). Batch level belum terkonfirmasi diproses sementara, tidak masuk capaian resmi (tampil sebagai skenario).
10. `masuk_capaian_pk`: Fundamental ya; Intermediate tidak (tetap masuk EWS dan laporan, bagian terpisah `<<Pelaksanaan_Non_Capaian>>`).

## 3A. EWS (v0.2)
Lihat `knowledge/aturan_talenta_digital_v1.md` untuk tabel fase, K/B/R, target per bulan, portofolio, parameter. Kode `evaluasiPortofolio`/`tingkatEws` memutuskan; AI menjelaskan. Parameter awal = titik mula; kalibrasi setelah 2-3 batch berdata harian.

## 3B. Pemantauan banyak batch dan pembaruan harian
1. Admin mendaftarkan batch dengan menempel tautan Google Sheets (banyak batch). Batch = ID pelatihan + TA; fetch/unggah ulang = snapshot baru, bukan batch baru. Tautan duplikat ditolak.
2. Pembacaan sheet: Google Sheets API read-only memakai service account yang dibagikan akses Viewer ke tiap sheet (rekomendasi). Alternatif tidak disarankan: "publikasikan ke web" (membuka data pribadi ke publik). Cadangan: unggah berkas. Tab dibaca berdasarkan nama (konfigurasi, default "All Pendaftar Web"); tab hilang -> peringatan.
3. Pemicu: (a) cron harian (jam WIB dapat diatur; endpoint dilindungi `CRON_SECRET`), (b) tombol "Perbarui sekarang" per batch dan "Perbarui semua". Satu batch per pemanggilan fungsi (hindari batas waktu); kegagalan satu batch tidak menghentikan lainnya.
4. Mapping alias: server menghitung `kunci_baris` (HMAC no. registrasi; jika kosong, HMAC nama+instansi sebagai hash saja dan baris ditandai `no_registrasi_kosong` karena tidak dapat ditelusuri) lalu mencari di `private.alias_map` (menyimpan alias, kunci, dan nomor registrasi saja); ditemukan -> alias dipakai ulang; baru -> alias baru; hilang dari sheet -> tidak dihapus, ditandai. Kunci duplikat dalam sheet -> item validasi.
5. Snapshot harian agregat (satu per batch per hari WIB) dengan histogram jumlah modul selesai; peserta_masked menyimpan keadaan terkini. Checksum sama -> "tidak berubah" (tetap dihitung segar).
6. Deteksi anomali setiap fetch: total modul berubah, peserta turun tajam, progres mundur, lulus turun, peserta hilang, kunci duplikat, data basi, akses ditolak/tab hilang -> Antrean Validasi; angka resmi tidak diubah diam-diam.
7. Pemantauan berhenti pada tanggal selesai + grace (7 hari) atau saat admin menonaktifkan.
8. Laporan bulanan memakai snapshot terbaru per batch dan mencantumkan tanggal pengambilan data.
9. Privasi: baris mentah hanya ada di memori server selama pemrosesan, tidak dicatat di log; kredensial service account hanya variabel server; tidak ada baris data yang dikirim ke Gemini.

## 4. Pembagian kode vs AI (batas AI Agent)
| Kode deterministik | Gemini (agent) |
|---|---|
| Hitung capaian, masking/HMAC, parsing regex, RLS, DOCX render, audit | Membaca PK (PDF/Sheet) menjadi profil terstruktur; fallback parsing nama berkas/header ambigu; analisis penyebab dan prioritas EWS; narasi laporan; verifikasi angka narasi vs tabel |
Aturan emas: **angka hanya dari alat (tool)**; AI tidak menghitung dan tidak memutuskan. Pengambil keputusan = manusia (satu gerbang: persetujuan laporan; plus Antrean Validasi).
Agent (v0.2): Pembaca PK, Validator Masukan, **Pemantau Harian** (baru), Analis EWS, Perencana/Penulis/Verifikator laporan.
**Pemantau Harian** = agent dengan pemicu terjadwal: merencanakan urutan batch, memanggil alat (fetch, bandingkan, evaluasi), menilai anomali (wajar / cek manusia / tidak jelas), memilih batch yang perlu analisis mendalam, menulis ringkasan. Ia bukan sekadar cron: keputusan triase dan pemilihan analisis berasal dari penalaran model atas hasil alat; kode menjamin batas minimum (wajib analisis bila tingkat berubah/Kritis; mingguan).
Otonomi run terjadwal: BOLEH mengambil dari tautan yang sudah didaftarkan manusia, menghitung, menyimpan snapshot, membuat item validasi/ringkasan, memanggil analis. TIDAK BOLEH menambah sumber, mengubah level/aturan/parameter/target, menyetujui laporan, membuka alias. Gerbang manusia: persetujuan laporan, Antrean Validasi, pendaftaran sumber, perubahan parameter. Tanpa AI (kill-switch atau kegagalan): fetch, hitung, snapshot, EWS tetap jalan; triase dan ringkasan diganti pesan standar.
Bukti agent: loop rencana -> alat -> tulis -> verifikasi -> gerbang manusia, state di `agent_runs`/`agent_run_steps`, kill-switch AI (aplikasi tetap jalan tanpa AI dengan hasil deterministik).

## 5. Privasi dan etika
- Minimisasi identitas: nama dan instansi dibuang saat pemrosesan (tidak disimpan, tidak di log). Nomor registrasi disimpan hanya di `private.alias_map` (RLS, tanpa policy klien) untuk tindak lanjut. Semua lapisan lain (peserta_masked, snapshot, agent, Gemini, laporan) hanya alias/agregat.
- Tampilan: daftar tindak lanjut menampilkan alias dan nomor registrasi tersamar (`maskNoReg`, 4 karakter terakhir). Nomor penuh hanya lewat `buka_identitas(alias, alasan)`: admin, alasan >= 10 karakter, tercatat di audit_log; tampil di layar, tidak diekspor massal.
- Gemini: pengembangan dengan data fiktif boleh tingkat gratis; produksi memakai layanan berbayar (ketentuan Gemini API: layanan gratis dapat memakai konten untuk peningkatan produk dan peninjauan manusia; layanan berbayar tidak, tetapi dicatat sementara untuk deteksi penyalahgunaan dan dapat disimpan sementara di negara mana pun). Tinjau terhadap UU No. 27/2022 (transfer lintas negara) dan kebijakan instansi.
- Sentinel keluar: `containsIdentifier` memeriksa semua teks ke Gemini dan ke laporan terhadap nomor registrasi yang sedang diproses + pola PII umum; terdeteksi -> blok dan catat.
- Nomor registrasi bukan anonim: dapat dicocokkan dengan nama lewat sheet/LMS. Pertimbangan UU No. 27/2022 berlaku penuh.
- Minimisasi ke Gemini: hanya alias + progres + agregat. Sentinel PII sebelum panggilan.
- Laporan memakai agregat (batas minimal sel, mis. tidak menampilkan kelompok < 5 jika ada perincian).
- Masking = pseudonimisasi, bukan anonimisasi (UU PDP). Perlakukan sebagai data pribadi.
- Pertimbangan UU No. 27/2022 (hak subjek, dasar pemrosesan, DPIA Pasal 34, retensi, notifikasi insiden 3x24 jam Pasal 46, transfer lintas negara Pasal 56): lihat menu Privasi dan Kepatuhan; verifikasi ke teks resmi.
- SE Menkominfo 9/2023 (Etika KA) sebagai dasar kebijakan: AI bukan pengambil keputusan, transparansi penggunaan AI, manajemen risiko. Faktor risiko EWS hanya indikator progres belajar (tanpa sekolah/gender). Opsional `<<Catatan_Penggunaan_AI>>` di laporan.

## 6. Auth MVP-1
Satu admin berperan penuh. Tabel `users`/`roles` sudah ada. Tanpa 2FA (keputusan pengguna); kompensasi: kata sandi kuat, penguncian setelah gagal, batas waktu sesi, audit log. Tanpa kredensial di kode. MVP-2: admin menambah pengguna dengan kata sandi sementara acak + wajib ganti (rekomendasi, menggantikan pola user+123).

## 7. Antarmuka
Login; Dashboard (portofolio banyak batch: capaian kumulatif vs target bulan berjalan, tingkat EWS + fase + K/B/R per batch, tren harian, ringkasan harian, status data segar/basi); Batch (daftar tautan sheet, status fetch terakhir, tombol Perbarui sekarang/Perbarui semua, aktif/nonaktif pantau; unggah berkas = cadangan); Antrean Validasi; Laporan (draf -> tinjau -> setujui -> unduh DOCX); Aktivitas Agent (timeline Realtime); Kartu Agent + sumber pengetahuan + "Data yang dikirim ke AI"; Privasi dan Kepatuhan.

## 8. Laporan
Template DOCX dengan penanda `<<...>>` (docxtemplater, delimiter `<<` `>>`): `<<Nama_Program>>`, `<<MM_month>>` (nama bulan), `<<YY_year>>` (4 digit), dan pecahan `<<Ringkasan_Capaian>>`, `<<Tabel_Batch>>`, `<<Kondisi_Batch>>`, `<<Pelaksanaan_Non_Capaian>>`, `<<Analisis>>`, `<<Rekomendasi>>`, `<<Sumber_Data>>`, opsional `<<Catatan_Penggunaan_AI>>`. Unduh saja (bukan Google Doc). PDF = tahap berikutnya.

## 9. Nama berkas (batch didaftarkan lewat tautan; nama sheet dibaca dari metadata Sheets API)
Contoh: `MIRROR - DTA VBL 13108 FAWD 1-31 Sept`. Angka 5 digit = ID pelatihan -> `https://digitalent.komdigi.go.id/pelatihan/<ID>` (pola dapat diatur). Kode dapat berupa alias (FAWD) atau tema saja (OIAT). Tanpa tahun (pakai TA). Regex dulu, Gemini cadangan, hasil dapat diedit. Validasi: hanya tab "All Pendaftar Web" (nama tab belum terverifikasi pada contoh; jadikan konfigurasi).

## 10. Terbuka (belum terverifikasi)
Nama tab persis; baris ICOT di PK; teks lengkap SE 9/2023 (jumlah nilai); regulasi AI terbaru; ketentuan data Gemini API; kompatibilitas server AI Studio di Vercel; ketentuan lokasi data; impor repo Lovable ke AI Studio; hak akses service account ke sheet milik pihak lain; batas frekuensi cron pada paket Vercel (alternatif: Supabase pg_cron atau GitHub Actions terjadwal); asumsi target antara = kumulatif; kalibrasi parameter EWS; apakah sheet diperbarui di jam tertentu (atur jam cron).; apakah nomor registrasi tetap sama untuk orang yang sama di batch berbeda (menentukan fitur catatan pembatalan lintas batch); apakah format nomor registrasi seragam (sentinel keluar memakai kecocokan teks).
