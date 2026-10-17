import React, { useState, useEffect } from "react";
import {
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useYear } from "../../context/YearContext";
import { useAuth } from "../../context/AuthContext";
import { isSupabaseConfigured, testAnonymousAccessIsBlocked } from "../../lib/supabaseClient";

interface HeaderProps {
  pageTitle: string;
  pageSubtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, pageSubtitle }) => {
  const { selectedYear, setSelectedYear, availableYears } = useYear();
  const { user } = useAuth();
  const [wibTime, setWibTime] = useState<string>("");
  const [rlsStatus, setRlsStatus] = useState<{
    tested: boolean;
    blocked: boolean;
    reason: string;
  } | null>(null);
  const [showRlsModal, setShowRlsModal] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // WIB = UTC + 7
      const wib = new Date(now.getTime() + (now.getTimezoneOffset() + 420) * 60000);
      setWibTime(
        wib.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }) +
          " " +
          wib.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) +
          " WIB"
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    testAnonymousAccessIsBlocked().then((res) => {
      setRlsStatus(res);
    });
  }, []);

  const supabaseReady = isSupabaseConfigured();

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs z-10">
        {/* Page Title & Context */}
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-semibold text-slate-800 leading-none">{pageTitle}</h2>
            <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              TA {selectedYear}
            </span>
          </div>
          {pageSubtitle && <p className="text-xs text-slate-500 mt-1">{pageSubtitle}</p>}
        </div>

        {/* Controls: RLS Badge, Time, Year Selector */}
        <div className="flex items-center space-x-3">
          {/* RLS Status Indicator */}
          <button
            onClick={() => setShowRlsModal(true)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              rlsStatus?.blocked
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
            }`}
            title="Klik untuk melihat status kepatuhan keamanan RLS"
          >
            {rlsStatus?.blocked ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="hidden sm:inline">
              RLS: {rlsStatus?.blocked ? "Anonim Ditolak" : "Pemeriksaan"}
            </span>
          </button>

          {/* Current WIB Date */}
          <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px]">{wibTime || "Memuat WIB..."}</span>
          </div>

          {/* Tahun Anggaran Selector */}
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-medium text-slate-600">Tahun Anggaran:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              aria-label="Pilih Tahun Anggaran"
              className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr} {yr === 2026 ? "(Aktif)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* RLS Security Detail Modal */}
      {showRlsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-900">
                    Status Kebijakan Keamanan RLS & Supabase
                  </h3>
                  <p className="text-xs text-slate-500">Kontrak Keamanan: contracts/migrations/001_schema.sql</p>
                </div>
              </div>
              <button
                onClick={() => setShowRlsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Row Level Security (RLS) Diaktifkan:</strong>
                  <p className="mt-0.5 text-slate-600">
                    Semua tabel publik dan tabel skema <code>private.alias_map</code> menerapkan RLS ketat.
                    Pengguna publik / anonim tidak memiliki izin SELECT, INSERT, UPDATE, atau DELETE.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Hasil Uji Langsung:</strong>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200">
                    {rlsStatus?.reason || "Menguji..."}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">audit_log Terproteksi:</strong>
                  <p className="mt-0.5 text-slate-600">
                    Hanya dapat ditulis melalui Supabase Service Role di backend (server), menolak penulisan langsung dari klien.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Koneksi Supabase:</strong>
                  <p className="mt-0.5 text-slate-600">
                    {supabaseReady
                      ? "Variabel VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY terdeteksi aktif."
                      : "Berjalan dalam mode sandbox/dev lokal. Kunci asli diatur via secrets .env.example."}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowRlsModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Tutup Informasi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
