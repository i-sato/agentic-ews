import React from "react";
import {
  Activity,
  Bot,
  Terminal,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  Play,
  RotateCcw,
} from "lucide-react";
import { useYear } from "../context/YearContext";

export const AktivitasAgentPage: React.FC = () => {
  const { selectedYear } = useYear();

  const agentsList = [
    { name: "Pemantau Harian", role: "Pemicu terjadwal (cron) / manual, evaluasi portofolio & triase anomali" },
    { name: "Pembaca PK", role: "Ekstraksi indikator, target antara, dan formula dari dokumen PK" },
    { name: "Validator Masukan", role: "Parsing nama berkas, deteksi ambigu, pengusul item validasi" },
    { name: "Analis EWS", role: "Menjelaskan faktor risiko dan rekomendasi tanpa mengubah tingkat" },
    { name: "Penulis & Verifikator Laporan", role: "Penyusun narasi & auditor integritas angka laporan" },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Aktivitas Agent (Realtime Timeline)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tahun Anggaran {selectedYear} • Jejak eksekusi loop: Rencana → Alat (Tool) → Tulis → Verifikasi → Gerbang Manusia
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-200">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span>Realtime Listener Siap</span>
          </span>
        </div>
      </div>

      {/* Agents Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {agentsList.map((ag) => (
          <div key={ag.name} className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
              <h4 className="text-xs font-semibold text-slate-800 leading-tight">{ag.name}</h4>
            </div>
            <p className="text-[10.5px] text-slate-500 line-clamp-2">{ag.role}</p>
          </div>
        ))}
      </div>

      {/* Realtime Stream Placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
          <Terminal className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-sm font-semibold text-slate-800">
            Belum Ada Eksekusi Agent Berjalan
          </h3>
          <p className="text-xs text-slate-500">
            Eksekusi agent akan tercatat pada tabel <code>agent_runs</code> dan <code>agent_run_steps</code>{" "}
            dengan broadcast Supabase Realtime saat cron atau analisis dijalankan pada <strong>Fase 4: Agent AI</strong>.
          </p>
        </div>

        <div className="pt-2 text-[11px] text-slate-400 font-mono">
          Status tabel: <code>public.agent_runs</code> terhubung ke publication <code>supabase_realtime</code>
        </div>
      </div>
    </div>
  );
};
