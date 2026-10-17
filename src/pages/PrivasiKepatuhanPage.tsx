import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Eye,
  Lock,
  FileCheck,
  AlertTriangle,
  History,
  CheckCircle2,
  Search,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { clientFetchAuditLogs } from "../lib/apiClient";
import { maskNoReg, containsIdentifier, containsPii } from "../lib/clientUtils";
import { useAuth } from "../context/AuthContext";

export const PrivasiKepatuhanPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Interactive Test State
  const [sampleNoreg, setSampleNoreg] = useState("REG-2026-98765432");
  const [sampleText, setSampleText] = useState("Laporan batch: peserta no 1234567890123456 terdeteksi");
  const [testIdentifiers, setTestIdentifiers] = useState("98765432, 1234567890123456");

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await clientFetchAuditLogs();
      setLogs(data || []);
    } catch (err) {
      console.error("Gagal memuat audit log", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const identifiersArray = testIdentifiers
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const isPiiDetected = containsIdentifier(sampleText, identifiersArray);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Privasi & Kepatuhan Hukum (PDP & Etika AI)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kepatuhan UU No. 27/2022 tentang Perlindungan Data Pribadi & SE Menkominfo No. 9/2023
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Minimisasi Identitas Aktif</span>
          </span>
        </div>
      </div>

      {/* Core Privacy Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            1. Tanpa Nama & Instansi
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sistem <strong>tidak menyimpan nama dan instansi sama sekali</strong>. Kolom nama dan instansi
            dihapus dari skema database (Migrasi 003). Pseudonimisasi alias menggunakan HMAC sha256.
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Eye className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            2. Masking No. Registrasi
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Nomor registrasi hanya berada di skema terisolasi <code>private.alias_map</code>. Pada layar UI
            selalu tersamar (hanya 4 karakter terakhir terlihat). Pembukaan penuh hanya melalui RPC{" "}
            <code>buka_identitas</code> dengan alasan wajib &ge; 10 karakter.
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            3. Sentinel Keluar (PII Guard)
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Fungsi <code>containsIdentifier</code> dan <code>containsPii</code> secara ketat memeriksa setiap
            teks yang dikirimkan ke model AI atau dokumen laporan agar tidak mengandung NIK, email, no HP, atau no registrasi.
          </p>
        </div>
      </div>

      {/* Interactive Verification of Rules & Masking */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
          Verifikasi Fungsi Privasi (reference/rules.ts)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Mask No Reg Test */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <span className="font-semibold text-slate-800">Uji Fungsi maskNoReg(noReg):</span>
            <input
              type="text"
              value={sampleNoreg}
              onChange={(e) => setSampleNoreg(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
              placeholder="Masukkan nomor registrasi..."
            />
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-slate-500">Hasil Masking UI:</span>
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {maskNoReg(sampleNoreg)}
              </span>
            </div>
          </div>

          {/* Sentinel Keluar Test */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Uji Sentinel Keluar PII:</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  isPiiDetected
                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                    : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                }`}
              >
                {isPiiDetected ? "PII Terdeteksi (Diblokir)" : "Aman (Lolos)"}
              </span>
            </div>
            <textarea
              rows={2}
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
            />
            <p className="text-[10.5px] text-slate-500">
              Mendeteksi pola NIK 16-digit, email, no HP, serta nomor registrasi yang sedang diproses.
            </p>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Catatan Audit Keamanan (audit_log Server)
            </h3>
          </div>
          <button
            onClick={loadLogs}
            disabled={loadingLogs}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
            <span>Segarkan Log</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Waktu (WIB)</th>
                <th className="py-2.5 px-3">Aksi</th>
                <th className="py-2.5 px-3">Objek</th>
                <th className="py-2.5 px-3">Alasan / Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    Belum ada rekaman audit log.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.waktu).toLocaleString("id-ID")}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {log.aksi}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-mono text-[11px]">
                      {log.objek || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      {log.alasan || (log.detail ? JSON.stringify(log.detail) : "-")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
