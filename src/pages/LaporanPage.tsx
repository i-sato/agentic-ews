import React from "react";
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { useYear } from "../context/YearContext";

export const LaporanPage: React.FC = () => {
  const { selectedYear } = useYear();

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Laporan Bulanan Capaian PK (Format DOCX)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tahun Anggaran {selectedYear} • Alur: Draf → Tinjauan → Persetujuan Manusia → Unduh Berkas
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-mono">
            docxtemplater: &lt;&lt;...&gt;&gt;
          </span>
        </div>
      </div>

      {/* Report Rules & Privacy Banner */}
      <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-900 space-y-2">
        <div className="flex items-center space-x-2 font-semibold text-indigo-950">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Aturan Penyusunan Laporan (SPEC MVP-1 Bagian 8 & UU No. 27/2022):</span>
        </div>
        <p className="text-[11.5px] leading-relaxed text-indigo-800">
          Laporan disusun menggunakan template DOCX dengan delimiter khusus{" "}
          <code className="bg-indigo-100/90 px-1 py-0.5 rounded font-mono text-indigo-950">
            &lt;&lt;...&gt;&gt;
          </code>
          . Semua angka berasal dari alat hitung deterministik, diverifikasi oleh agent Verifikator terhadap
          data snapshot terbaru. Identitas nama dan instansi tidak pernah dimasukkan.
          Persetujuan resmi memerlukan otorisasi Administrator (Satu Gerbang Manusia).
        </p>
      </div>

      {/* Month Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2.5">
          Jadwal Pelaporan Bulanan TA {selectedYear}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {months.map((month, idx) => {
            const bulanNum = idx + 1;
            const isMeiDes = bulanNum >= 5; // Target antara Mei-Desember 87%

            return (
              <div
                key={month}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors bg-slate-50/60 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-800">
                      Bulan {bulanNum}: {month}
                    </span>
                    {isMeiDes ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-medium">
                        Target 87%
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-600">
                        Target Antara 0%
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">Status: Belum dibuat (Fase 5)</p>
                </div>

                <button
                  disabled
                  className="p-1.5 rounded-md bg-white text-slate-400 border border-slate-200 cursor-not-allowed hover:text-slate-500"
                  title="Penyusunan laporan diaktifkan pada Fase 5"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
