import React from "react";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  Info,
} from "lucide-react";
import { useYear } from "../context/YearContext";
import { PageId } from "../components/layout/Sidebar";

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { selectedYear } = useYear();

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-indigo-800/40 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Sistem Early Warning System (EWS) Pelatihan</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Monitoring Capaian Perjanjian Kinerja TA {selectedYear}
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200/80 leading-relaxed">
            Talenta Digital UPT BLSDM Komdigi Yogyakarta • Sasaran SK.1, Indikator IKSK 1.1, Target 87%.
            Angka dihitung deterministik dari modul belajar LMS peserta, tanpa estimasi bebas AI.
          </p>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Kumulatif Capaian */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Capaian Kumulatif PK</span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
              Target 87%
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">0.0%</span>
            <span className="text-xs text-slate-400 font-mono">(0 / 0 onboarding)</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Kumulatif tertimbang SUM(lulus)/SUM(onboarding), bukan rata-rata persen.
          </p>
        </div>

        {/* Card 2: Status EWS Portofolio */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Tingkat EWS Portofolio</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
              TA {selectedYear}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-block w-3 h-3 rounded-full bg-slate-400"></span>
            <span className="text-lg font-bold text-slate-800">Belum Dapat Dinilai</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Menunggu registrasi batch resmi dan snapshot data harian.
          </p>
        </div>

        {/* Card 3: Batch Aktif Dipantau */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Batch Dipantau</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">0</span>
            <span className="text-xs text-slate-400">batch aktif</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Pembaruan otomatis terjadwal (cron) & tombol manual harian.
          </p>
        </div>

        {/* Card 4: Antrean Validasi */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Antrean Validasi</span>
            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
              Gerbang Manusia
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">0</span>
            <span className="text-xs text-slate-400">item terbuka</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Anomali atau ambiguitas membutuhkan keputusan admin.
          </p>
        </div>
      </div>

      {/* Ringkasan Harian & Status Pemantauan Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-800">
                Ringkasan Pemantauan Harian
              </h3>
            </div>
            <span className="text-xs text-slate-400">Agent Pemantau Harian</span>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-dashed border-slate-300 text-center py-10 space-y-3">
            <Clock className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="max-w-md mx-auto space-y-1">
              <p className="text-xs font-semibold text-slate-700">
                Belum ada ringkasan harian untuk Tahun Anggaran {selectedYear}
              </p>
              <p className="text-[11px] text-slate-500">
                Pembaruan harian akan dievaluasi saat batch didaftarkan pada Fase 2 (Batch & Fetch Sheet).
                Agent Pemantau Harian akan menyusun analisis risiko dan anomali secara berkala.
              </p>
            </div>
            <button
              onClick={() => onNavigate("batch")}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
            >
              <span>Buka Menu Batch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* EWS Level Reference Guide */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
            Panduan Tingkat EWS
          </h3>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
              <div className="font-semibold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Aman (K = 0)</span>
              </div>
              <p className="text-[11px] text-emerald-700">Target kelulusan batch/kumulatif terpenuhi.</p>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div className="font-semibold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                <span>Waspada (K &gt; 0)</span>
              </div>
              <p className="text-[11px] text-amber-700">Perlu pendampingan belajar peserta.</p>
            </div>

            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
              <div className="font-semibold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                <span>Kritis (R &gt; 1 / Beban Tinggi)</span>
              </div>
              <p className="text-[11px] text-rose-700">
                Target tidak mungkin tercapai atau risiko tinggi pada fase akhir.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 space-y-1">
              <div className="font-semibold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Belum Dapat Dinilai</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Batch belum mulai, onboarding 0, atau belum terkonfirmasi valid.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
