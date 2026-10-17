# Panduan Mulai (v0.2.3)

Tujuan: dari nol sampai fase 1 selesai di Google AI Studio, dengan database di Supabase dan kode di GitHub.
Nama menu di AI Studio, Supabase, dan GitHub dapat berubah; gunakan sebagai petunjuk, bukan kata demi kata.

## Peta singkat
1. Siapkan akun dan kunci (A)
2. Taruh paket di GitHub (B)
3. Siapkan database Supabase (C)
4. Hubungkan AI Studio (D) dan uji baca (fase 0)
5. Jalankan fase 1, lalu fase berikutnya satu per satu (E)

Aturan emas: hanya data fiktif sampai Anda meninjau privasi dan menerapkan di Vercel. Kunci rahasia tidak pernah ditempel di chat, kode, atau repositori.

---

## A. Persiapan akun dan kunci
| Kebutuhan | Dipakai untuk | Kapan |
|---|---|---|
| Akun GitHub | Menyimpan kode dan menjalankan uji otomatis | Sekarang |
| Akun Supabase | Database, login, realtime | Sekarang |
| Akun Google (AI Studio) | Membangun aplikasi; kunci Gemini (`GEMINI_API_KEY`) | Sekarang (kunci dipakai mulai fase 4) |
| Google Cloud, service account read-only | Membaca Google Sheets (fase 2) | Sebelum fase 2 |
| Akun Vercel | Penerapan | Fase 5 |
| Pengelola kata sandi | Menyimpan semua kunci | Sekarang |

Saran: buat **dua proyek Supabase** bila memungkinkan: satu untuk pengembangan (data fiktif), satu untuk produksi nanti. Pilih region terdekat (mis. Singapura); keputusan lokasi data untuk produksi perlu ditinjau (UU No. 27/2022, transfer lintas negara).

## B. Taruh paket di GitHub
1. GitHub, buat repositori baru, **Private**, nama bebas (mis. `ews-pk-taldig`). Centang "Add a README" TIDAK perlu.
2. Ekstrak ZIP. Isi folder `paket/` (bukan foldernya) diunggah ke repositori: lewat web (Add file, Upload files, seret semua isi termasuk folder dan `.github`) atau lewat git.
   Pastikan folder tersembunyi `.github/` ikut terunggah (di Windows/Mac berkas berawalan titik sering tersembunyi).
3. Commit ke cabang `main`.
4. Buka tab **Actions**: alur "uji-aturan" harus berjalan dan hijau. Jika merah, jangan lanjut; kirim pesan galatnya ke saya.

## C. Siapkan Supabase
1. Buat proyek baru (kata sandi database kuat, simpan di pengelola kata sandi).
2. **SQL Editor**: tempel isi `contracts/migrations/001_schema.sql`, jalankan. Setelah sukses, tempel `002_pemantauan.sql`, lalu `003_minimisasi_identitas.sql`. Urutan 001, 002, 003 tidak boleh terbalik; masing-masing sekali saja. Jalankan 003 sebelum ada data (berkas ini menghapus kolom nama dan instansi).
   Jika ada galat, hentikan dan kirim teks galatnya.
3. Authentication: **nonaktifkan pendaftaran mandiri** (sign-up). Buat satu pengguna admin lewat Authentication, Users, Add user (email Anda, kata sandi acak minimal 12 karakter; bukan pola mudah ditebak).
4. Jadikan pengguna itu admin aplikasi. SQL Editor:
```sql
insert into public.users (id, nama, role_id)
select id, 'Administrator', 'admin' from auth.users where email = 'EMAIL_ANDA';
```
5. Catat `Project URL` (dialog Connect), lalu di **Settings > API Keys** kunci **Publishable** (publik, aman untuk antarmuka) dan **Secret** (RAHASIA: hanya server, tidak pernah di antarmuka). Kunci lama bernama `anon`/`service_role` setara. Simpan di pengelola kata sandi. Rincian semua kunci: `PANDUAN_KUNCI_RAHASIA.md`.
6. Cek: Table Editor menampilkan tabel; tiap tabel berlabel RLS aktif (kecuali yang memang di skema `private`).

## D. Hubungkan AI Studio
### D1. Tentang project yang langsung dibuat otomatis
Saat repositori dihubungkan, AI Studio dapat langsung membuat project. Itu normal: **pakai project itu** untuk fase 1. Yang perlu Anda pastikan hanya satu hal: apakah isi repositori Anda benar-benar masuk ke project.
1. Buka project, lihat panel berkas. Harus ada `README.md`, `SPEC.md`, folder `contracts/`, `agents/`, `knowledge/`, `reference/`, `docs/`, `.github/`.
2. **Ada semua**: lanjut ke D2.
3. **Hanya aplikasi contoh bawaan (tidak ada folder kita)**: JANGAN lanjut fase 1 dulu, karena AI Studio akan membuat aplikasi tanpa kontrak. Pilih salah satu:
   - (a) Hubungkan ulang / impor ulang dari GitHub lewat menu GitHub di project itu, lalu cek lagi.
   - (b) Jika tetap tidak masuk: biarkan project itu, sinkronkan ke repositori **baru** di GitHub (menu simpan ke GitHub), lalu di repositori baru itu tambahkan folder paket kita lewat web GitHub (`contracts/`, `agents/`, `knowledge/`, `reference/`, `docs/`, `tests/`, `.github/`, `SPEC.md`). Folder-folder ini tidak bertabrakan dengan kode aplikasi. Lalu tarik perubahan ke AI Studio (sinkron GitHub) dan cek ulang D1 langkah 1.
   - (c) Jika berkas aplikasi bawaan (mis. `README.md`, `package.json` di akar) bentrok dengan milik kita: pertahankan milik AI Studio, dan pindahkan README kita ke `docs/README_paket.md`.
4. Jika AI Studio sudah sempat membuat kode aplikasi dari starter bawaan sebelum Anda memeriksa: tidak masalah selama folder kita utuh. Fase 1 akan menyesuaikan struktur ke `src/`, `server/`, `shared/`.

### D2. Fase 0, uji baca (tanpa mengubah kode)
Tempel prompt ini di project (jangan tempel fase 1 dulu):
```
Jangan mengubah atau menambah berkas apa pun. Baca README.md, SPEC.md, knowledge/aturan_talenta_digital_v1.md, daftar contracts/ dan agents/. Lalu jawab singkat: (1) 5 aturan hitung utama, (2) rumus onboarding untuk 28 modul dan 45 modul, (3) apa yang boleh dan tidak boleh dilakukan agent Pemantau Harian, (4) daftar nama berkas di contracts/migrations dan agents/, (5) data identitas apa yang disimpan sistem dan apa yang tidak.
```
Cocok bila: onboarding 28 modul = 26, 45 modul = 41; pembatalan dikeluarkan; kumulatif tertimbang; agent terjadwal tidak boleh mengubah level/aturan/parameter/target; migrasi 001, 002, dan 003; hanya nomor registrasi yang disimpan (private), nama dan instansi tidak. Jika jawabannya meleset atau AI Studio tidak menemukan berkas, kembali ke D1.

### D3. Kunci rahasia
Tambahkan lewat pengaturan Secrets/Environment di project AI Studio (nama menu dapat berbeda), bukan di kode:
- Sekarang (fase 1): `SUPABASE_URL`, kunci publishable untuk antarmuka (variabel berawalan `VITE_`), dan server memakai `SUPABASE_SECRET_KEY`.
- Fase 2: `ALIAS_HMAC_SECRET` (acak, panjang; **jangan diganti setelah data masuk**, karena alias akan berubah; cadangkan), `GOOGLE_SERVICE_ACCOUNT_JSON`.
- Fase 2b: `CRON_SECRET`.
- Fase 4: `GEMINI_API_KEY`.
Catatan: lokasi penyimpanan rahasia di pratinjau AI Studio belum saya verifikasi. Selama masa pengembangan pakai proyek Supabase pengembangan dan data fiktif, lalu **putar (ganti) semua kunci** sebelum produksi.

## E. Menjalankan fase
Untuk setiap fase (01, 02, 02b, 03, 04, 05):
1. Buka berkas `docs/ai_studio_prompts/NN_....md`.
2. Susun pesan = teks **Konteks tetap** (dari `00_cara_pakai.md`) + isi berkas fase. Tempel ke AI Studio.
3. Tunggu selesai. Jika AI Studio bertanya, jawab sesuai SPEC; jika menawarkan hal di luar fase, tolak.
4. Periksa:
   - Panel berkas: folder terlindungi masih utuh.
   - Sinkron ke GitHub (commit). Tab **Actions** hijau.
   - Pratinjau: coba hal yang disebut di "Selesai bila" / "Uji" pada berkas fase, memakai `docs/lovable_prototype/sampel_peserta_fiktif.csv` sebagai data uji.
5. Bila ada perubahan tak terduga pada folder terlindungi: batalkan (revert di GitHub) sebelum lanjut.
6. Baru lanjut ke fase berikutnya.

### Ringkasan tiap fase
| Fase | Hasil yang harus Anda lihat |
|---|---|
| 01 | Login admin berfungsi; pengguna anonim tidak bisa membaca data; menu lengkap; Actions hijau |
| 02 | (setelah migrasi 003) Tambah batch dari tautan sheet (atau unggah cadangan); alias sama saat dimuat ulang; anomali tampil di Antrean Validasi |
| 02b | Tombol Perbarui bekerja; endpoint cron menolak tanpa rahasia (401); dua kali sehari = satu snapshot |
| 03 | Dashboard banyak batch dengan fase, K/B/R, tingkat EWS; parameter EWS dapat diubah dan tercatat |
| 04 | Agent berjalan dan terlihat di Aktivitas Agent; AI tidak mengubah tingkat; kill-switch AI berfungsi |
| 05 | Laporan DOCX diunduh, angka sama dengan tabel, tanpa nama/instansi; menu Privasi; penerapan di Vercel |

### Sebelum fase 2, siapkan akses Google Sheets
1. Google Cloud Console: buat proyek, aktifkan Google Sheets API, buat service account (tanpa peran proyek yang luas), buat kunci JSON, simpan sebagai rahasia.
2. Bagikan tiap sheet batch ke email service account sebagai **Viewer**. Jika sheet milik pihak lain yang tidak mau berbagi, pakai jalur unggah cadangan.
3. Jangan menjadikan sheet "publik di web" hanya demi kemudahan: itu membuka data pribadi.

### Fase 5, Vercel
Impor repositori ke Vercel, isi variabel lingkungan (sama dengan D3, kunci produksi baru), uji. Bagian server dari AI Studio mungkin perlu disesuaikan agar berjalan sebagai Vercel Functions; prompt fase 5 sudah meminta itu diuji. Paket Hobby Vercel membatasi cron satu kali per hari dengan waktu bebas dalam jam yang ditentukan (mis. jadwal 07:00 dapat berjalan 07:00-07:59); paket Pro per menit. Pengiriman cron bersifat best effort (dapat terlewat atau terkirim ganda), sehingga rancangan kita idempoten dan ada tombol "Perbarui semua". Periksa juga ketentuan penggunaan paket Hobby untuk instansi.

## F. Jika ada masalah
| Gejala | Tindakan |
|---|---|
| Actions merah | Jangan lanjut; kirim log galat ke saya |
| AI Studio menimpa folder terlindungi | Revert di GitHub, ulangi fase dengan penegasan larangan |
| AI Studio menulis ulang rumus hitung di UI | Tolak; minta memakai `server/lib/rules.ts` |
| Angka di UI tidak sama dengan uji | Kirim contoh data fiktif dan angkanya ke saya |
| Kunci rahasia tertempel di chat atau kode | Anggap bocor: putar kunci, hapus dari riwayat |
| Galat SQL | Hentikan, kirim teks galat dan nama berkas migrasi |

## G. Daftar periksa keamanan singkat
- Repositori Private; tidak ada kunci di kode atau riwayat commit.
- Sign-up mandiri Supabase nonaktif; admin dengan kata sandi kuat; 2FA tidak diterapkan (keputusan Anda), dikompensasi penguncian, batas sesi, dan audit log.
- Kunci secret Supabase dan `ALIAS_HMAC_SECRET` hanya di server.
- Data fiktif sampai tinjauan privasi selesai.
