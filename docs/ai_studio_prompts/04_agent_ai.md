# Fase 4: Agent AI (Gemini)
Tugas:
1. Pasang `@google/genai` di server. Pemuat instruksi: baca `agents/<nama>.md` + `agents/shared/guardrails.md` sebagai system instruction. Versi instruksi (hash berkas) dicatat di agent_runs.
2. Deklarasi alat dari `contracts/tools.json`; implementasi tiap alat di `server/tools/` memakai rules.ts dan Supabase. Validasi semua argumen/keluaran dengan Zod. Batasi daftar alat per agent.
3. Keluaran terstruktur dengan JSON Schema dari contracts/schemas/. Retry terbatas lalu `gagal` dengan pesan jelas.
4. Sentinel PII (`containsPii`) pada semua yang dikirim ke Gemini; blok dan catat bila terdeteksi.
5. Agent: pk_reader (PDF/Sheet PK -> pk_profil; tampilkan status+peringatan; tampilkan "Target berlaku: X% (PK <TA>, kutipan sumber)"), intake_validator (fallback parsing), ews_analyst (penjelasan alasan tingkat + saran, bukan penentu tingkat), **pemantau_harian** (agent run terjadwal/manual: fetch -> bandingkan -> evaluasi_ews -> triase anomali -> pilih batch untuk analisis -> ringkasan harian; skema `ringkasan_harian`). Ganti langkah deterministik fase 2b dengan run agent ini; bila `ai_aktif=false` pakai versi deterministik dengan ringkasan standar.
5b. Pembatas run terjadwal di kode: daftar alat dari tools.json untuk peran itu saja; alat bertanda `tidak_tersedia_untuk_ai` tidak diekspos; batas langkah per run; kegagalan alat tidak mengulang tanpa batas.
6. Orkestrator = mesin status di database: satu langkah per pemanggilan fungsi (hindari batas waktu fungsi); lanjutkan lewat pemicu berikutnya.
7. Kartu Agent: tujuan, sumber pengetahuan, alat, data yang dikirim ke AI, model, batas otonomi, pengambil keputusan; sumber pengetahuan dari agent_step_sources.
Uji: pemantau dengan data fiktif dua hari (anomali progres_mundur -> item validasi, tingkat tidak diubah AI); golden pk_reader dengan PK 2026 (target 87, SK.1/IKSK 1.1, pelaporan bulanan, target antara Jan-Apr 0 dan Mei-Des 87); kasus rumus berubah -> terbaca_dengan_peringatan.
