# Panduan Kunci Rahasia (v0.2.3)

Dicek terhadap dokumentasi Supabase, Vercel, dan Google AI (Oktober 2026). Nama menu dapat berubah; jika berbeda, cari menu bernama mirip.
Aturan umum: simpan semua di pengelola kata sandi; jangan tempel di chat, kode, atau repositori; jangan simpan di berkas `.env` yang ter-commit (paket menyertakan `.gitignore`).

## Ringkasan
| Variabel | Dari mana | Sifat | Dipakai di | Mulai |
|---|---|---|---|---|
| `SUPABASE_URL` | Supabase (dialog Connect / Settings) | Tidak rahasia | UI + server | Fase 1 |
| `SUPABASE_PUBLISHABLE_KEY` (di UI: `VITE_SUPABASE_PUBLISHABLE_KEY`) | Supabase, Settings > API Keys | Publik (aman di browser, dibatasi RLS) | UI | Fase 1 |
| `SUPABASE_SECRET_KEY` | Supabase, Settings > API Keys | RAHASIA, melewati RLS | Server saja | Fase 1 |
| `ALIAS_HMAC_SECRET` | Anda buat sendiri | RAHASIA | Server saja | Fase 2 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Cloud Console | RAHASIA | Server saja | Fase 2 |
| `CRON_SECRET` | Anda buat sendiri | RAHASIA | Server saja | Fase 2b |
| `GEMINI_API_KEY` | AI Studio (otomatis saat pengembangan); kunci sendiri untuk Vercel | RAHASIA | Server saja | Fase 4 |

Catatan nama Supabase: kunci baru bernama *publishable* (`sb_publishable_...`) dan *secret* (`sb_secret_...`). Kunci lama `anon` dan `service_role` (berawalan `eyJ`) masih ada tetapi disebut Supabase akan dihentikan paling lambat akhir 2026. Pakai kunci baru. Jika proyek Anda hanya menawarkan yang lama, `anon` = publishable dan `service_role` = secret.

---

## 1. Supabase (URL, publishable key, secret key)
1. Masuk ke supabase.com, buka proyek (proyek pengembangan dulu).
2. **Settings > API Keys**: salin **Publishable key** dan **Secret key** (tombol Reveal/Copy). URL proyek ada di dialog **Connect** atau halaman pengaturan proyek.
3. Simpan ketiganya di pengelola kata sandi dengan label jelas ("PENGEMBANGAN" vs "PRODUKSI").
4. Pembagian: publishable boleh dipakai UI; **secret hanya server**. Jika secret pernah muncul di kode UI, di chat, atau di commit: ganti segera (rotate) di halaman yang sama.
5. Uji: dengan publishable key tanpa login, membaca tabel mana pun harus gagal/kosong (RLS). Itu menandakan RLS bekerja.

## 2. ALIAS_HMAC_SECRET (buat sendiri)
Fungsinya mengubah nomor registrasi menjadi kunci dan alias yang stabil. **Jangan diganti setelah data masuk**: jika berubah, semua peserta dianggap baru dan alias berubah. **Cadangkan di dua tempat.**
Buat nilai acak (pilih salah satu):
- Mac/Linux: `openssl rand -hex 32`
- Node: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Pembuat kata sandi di pengelola kata sandi (panjang 40+ karakter acak)
Gunakan nilai yang **berbeda** untuk pengembangan dan produksi.

## 3. CRON_SECRET (buat sendiri)
String acak minimal 16 karakter (rekomendasi 32+), dibuat seperti di atas. Di Vercel, bila variabel bernama `CRON_SECRET` diisi, Vercel otomatis mengirimnya sebagai header `Authorization: Bearer <nilai>` saat memanggil cron; endpoint membandingkannya dan menolak (401) bila tidak cocok. Tombol "Perbarui sekarang" dari UI tidak memakai ini (memakai sesi admin).

## 4. Google Sheets (service account)
Tujuan: server membaca sheet batch secara read-only tanpa membuka sheet ke publik.
1. console.cloud.google.com, buat atau pilih proyek (beri nama jelas, mis. `ews-pk-taldig`).
2. **APIs & Services > Library**: cari **Google Sheets API**, klik Enable.
3. **IAM & Admin > Service Accounts > Create service account** (beri nama `pembaca-sheet`; tidak perlu peran proyek tambahan).
4. Buka service account itu, tab **Keys > Add key > Create new key > JSON**. Berkas JSON terunduh. Itulah `GOOGLE_SERVICE_ACCOUNT_JSON`. Simpan di pengelola kata sandi, hapus berkas dari Downloads setelah dipindah.
5. Salin alamat email service account (bentuk `nama@proyek.iam.gserviceaccount.com`) dari berkas JSON (`client_email`).
6. Di tiap Google Sheet batch: **Share**, tambahkan email itu sebagai **Viewer**.
7. Server memakai cakupan baca saja (`https://www.googleapis.com/auth/spreadsheets.readonly`).
Cara mengisi nilai: tempel isi berkas JSON apa adanya (satu nilai). Jika kolom secret tidak menerima teks multi-baris, ubah dulu ke base64 (`base64 -w0 berkas.json` di Linux, `base64 -i berkas.json` di Mac); kode (fase 2) menerima JSON mentah maupun base64.
Kemungkinan hambatan, khususnya bila akun Google berada di Workspace instansi:
- Kebijakan organisasi dapat **melarang pembuatan kunci service account**. Jika begitu, minta administrator Workspace/Cloud mengizinkan, atau gunakan jalur unggah berkas.
- Pengaturan berbagi dapat **melarang membagikan sheet ke alamat di luar domain** (service account berada di luar domain Anda). Minta administrator mengizinkan, atau gunakan unggah berkas.
- Jangan memakai "publikasikan ke web" sebagai jalan pintas: itu membuka data pribadi.

## 5. GEMINI_API_KEY
- **Saat membangun di AI Studio**: aplikasi yang memakai Gemini mendapat `GEMINI_API_KEY` sebagai secret sisi server secara otomatis; dapat dilihat di **Settings > Secrets**. Tidak perlu membuatnya.
- **Untuk Vercel (produksi)**: buat kunci sendiri di AI Studio (menu **Get API key**), simpan, dan isi sebagai variabel lingkungan Vercel.
- **Data dan ketentuan**: menurut ketentuan Gemini API (dibaca Oktober 2026), pada *layanan gratis (unpaid)* konten dapat dipakai Google untuk meningkatkan produk dan dapat dibaca peninjau manusia, dan Google memperingatkan agar tidak mengirim informasi sensitif atau pribadi; pada *layanan berbayar (paid)* prompt tidak dipakai untuk meningkatkan produk, tetapi dicatat sementara untuk deteksi penyalahgunaan dan dapat disimpan sementara di negara mana pun. Sistem kita hanya mengirim alias dan agregat, namun untuk produksi **gunakan layanan berbayar** (aktifkan penagihan pada proyek Google Cloud kunci itu) dan tinjau ketentuan tersebut terhadap kebijakan instansi dan UU No. 27/2022 (transfer lintas negara). Pengembangan dengan data fiktif boleh memakai tingkat gratis.

---

## Di mana mengisinya
| Tempat | Cara |
|---|---|
| **AI Studio (pengembangan)** | **Settings > Secrets**. Agent AI Studio juga menampilkan kartu di chat bila ada secret yang kurang; isi lewat kartu atau panel Secrets |
| **Vercel (produksi)** | Project, **Settings > Environment Variables**; isi untuk lingkungan Production (dan Preview bila perlu); tandai sebagai *Sensitive* bila ditawarkan; redeploy setelah mengubah |
| **GitHub** | Tidak perlu. Alur uji tidak memakai kunci. Jangan commit apapun berisi kunci |
| **UI (browser)** | Hanya `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` |

## Kapan menyiapkan apa
- Sebelum fase 1: Supabase (bagian 1).
- Sebelum fase 2: ALIAS_HMAC_SECRET (2) dan Google service account (4).
- Sebelum fase 2b: CRON_SECRET (3).
- Sebelum fase 4: pastikan GEMINI_API_KEY tersedia di Secrets (5).
- Sebelum produksi: semua kunci diganti dengan kunci produksi baru, proyek Supabase produksi terpisah, penagihan Gemini diaktifkan.

## Pemeriksaan setelah semua terisi
1. Publishable key tanpa login tidak bisa membaca tabel (RLS).
2. Memanggil endpoint cron tanpa header Authorization menghasilkan 401.
3. "Perbarui sekarang" untuk satu batch uji berhasil membaca sheet; sheet yang belum dibagikan menghasilkan pesan `akses_ditolak`, bukan data.
4. Pencarian di kode dan di riwayat commit: tidak ada string berawalan `sb_secret_`, `eyJ`, atau potongan `private_key`.

## Rotasi dan kebocoran
- Duga bocor bila kunci pernah tertempel di chat, kode, atau tangkapan layar. Ganti: Supabase (buat secret baru lalu hapus yang lama), service account (buat kunci JSON baru lalu hapus kunci lama), Gemini (buat kunci baru lalu hapus yang lama), CRON_SECRET (ganti nilai lalu redeploy).
- `ALIAS_HMAC_SECRET` tidak bisa diganti begitu saja karena memutus kontinuitas alias; jika bocor, hubungi saya untuk rencana migrasi.
- Jadwalkan penggantian berkala (mis. tiap 6 bulan) untuk kunci yang bisa diganti.
