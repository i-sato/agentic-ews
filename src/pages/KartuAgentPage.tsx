import React from "react";
import {
  Bot,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  Cpu,
  Lock,
  Sparkles,
} from "lucide-react";

export const KartuAgentPage: React.FC = () => {
  const forbiddenTools = [
    "buka_alias_map (kunci dan no_registrasi hanya untuk server)",
    "hapus_data (dilarang menghapus riwayat atau batch)",
    "kirim_pesan (dilarang komunikasi eksternal)",
    "ubah_pengaturan (konfigurasi sistem milik admin)",
    "unduh_berkas (ekstraksi data dilarang)",
    "ubah_aturan_hitung (rumus dari rules.ts deterministik)",
    "ubah_parameter_ews (hanya admin berhak mengubah)",
    "tambah_atau_hapus_tautan_sheet (sumber data dari admin)",
    "ubah_status_pemantauan (hak admin)",
    "ubah_level_batch (melalui Antrean Validasi)",
    "ubah_target_pk (dibaca dari dokumen PK)",
    "buka_identitas (hanya admin dengan alasan tercatat)",
    "tampilkan_nomor_registrasi (hanya nomor tersamar di UI)",
    "ekspor_daftar_peserta (dilarang ekspor massal)",
  ];

  const allowedTools = [
    "baca_pk_sumber (ambil teks PK)",
    "simpan_pk_profil (simpan profil hasil ekstraksi)",
    "ambil_aturan (baca rule pack pengetahuan)",
    "parse_nama_berkas (fallback regex nama berkas)",
    "cari_program_ref (pencarian alias tema)",
    "buat_item_validasi (lempar ke Antrean Validasi)",
    "hitung_capaian (panggil alat kalkulasi resmi)",
    "ambil_batch_periode (query batch terdaftar)",
    "proyeksi_kebutuhan_lulus (kebutuhan lulus 87%)",
    "simpan_ews (simpan narasi analisis)",
    "susun_rencana_laporan (rencana bab laporan)",
    "simpan_bagian_laporan (teks dengan token {{metrik:KUNCI}})",
    "periksa_laporan (verifikasi token & sentinel PII)",
    "minta_keputusan_manusia (hentikan alur untuk persetujuan)",
    "ambil_batch_dipantau (query batch aktif)",
    "fetch_sheet_batch (memicu fetch server)",
    "bandingkan_snapshot (audit anomali snapshot)",
    "evaluasi_ews (kalkulasi tingkat EWS resmi)",
    "ambil_parameter_ews (baca parameter aktif)",
    "catat_ringkasan_harian (simpan ringkasan harian)",
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Kartu Agent & Batasan Integritas AI
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kontrak Keamanan: <code>contracts/tools.json</code> & <code>SPEC.md Bagian 4</code>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kill-Switch AI: Tersedia</span>
          </div>
        </div>
      </div>

      {/* Golden Rule Highlight */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-5 text-white border border-indigo-900/60 shadow-sm space-y-2">
        <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
          <Lock className="w-4 h-4 text-indigo-400" />
          <span>Aturan Emas Sistem (Golden Rule):</span>
        </div>
        <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
          "AI TIDAK MENGHITUNG ANGKA DAN TIDAK MEMUTUSKAN. ANGKA HANYA BERASAL DARI ALAT KODE DETERMINISTIK (reference/rules.ts)."
        </p>
        <p className="text-xs text-indigo-200/80">
          Aplikasi dijamin dapat berjalan 100% normal tanpa AI melalui fallback deterministik kode.
        </p>
      </div>

      {/* Grid: Forbidden vs Allowed Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forbidden Tools Card */}
        <div className="bg-white rounded-xl border border-rose-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-rose-100 pb-3">
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                Alat Dilarang Bagi AI (14 Batasan Ketat)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">
              Restricted
            </span>
          </div>

          <ul className="space-y-2 text-xs text-slate-700">
            {forbiddenTools.map((tool, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="text-rose-500 font-bold">•</span>
                <span className="font-mono text-[11px] text-slate-800">{tool}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Allowed Tools Card */}
        <div className="bg-white rounded-xl border border-emerald-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                Alat Sah Untuk Agent (Function Calling)
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
              Authorized
            </span>
          </div>

          <ul className="space-y-2 text-xs text-slate-700 max-h-96 overflow-y-auto pr-2">
            {allowedTools.map((tool, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span className="font-mono text-[11px] text-slate-800">{tool}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
