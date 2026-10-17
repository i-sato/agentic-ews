import React, { useState } from "react";
import {
  Building2,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const LoginPage: React.FC = () => {
  const { login, isLockedOut, remainingLockoutSeconds, failedAttempts } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email) {
      setErrorMessage("Silakan masukkan alamat email admin.");
      return;
    }

    if (!password) {
      setErrorMessage("Silakan masukkan kata sandi.");
      return;
    }

    if (password.length < 12) {
      setErrorMessage("Kebijakan keamanan: kata sandi harus memiliki minimal 12 karakter.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(email, password);
      if (!res.success) {
        setErrorMessage(res.message || "Gagal masuk. Periksa kembali kredensial Anda.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan pada sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  const safeLockoutSeconds = remainingLockoutSeconds ?? 0;
  const safeFailedAttempts = failedAttempts ?? 0;
  const minutesRemaining = Math.ceil(safeLockoutSeconds / 60);

  return (
    <div className="min-h-screen w-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-900 to-slate-950 -z-10 opacity-70"></div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand & Institution Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-500/30 mb-2">
            <Building2 className="w-8 h-8 text-indigo-100" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            EWS Capaian PK & Laporan
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Talenta Digital • UPT BLSDM Komdigi Yogyakarta
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="border-b border-slate-700/60 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Masuk Sistem Administrator
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
              MVP-1 Auth
            </span>
          </div>

          {/* Account Lockout Banner */}
          {isLockedOut ? (
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-200 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-semibold text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Akun Terkunci Sementara (5 Kali Gagal)</span>
              </div>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                Demi keamanan sistem, autentikasi dibekukan sementara selama 15 menit.
                Sisa waktu penguncian: <strong className="font-mono text-white">{safeLockoutSeconds} detik</strong> (~{minutesRemaining} menit).
              </p>
              <div className="flex items-center space-x-1.5 text-[10px] text-rose-400 pt-1 border-t border-rose-900/60">
                <Clock className="w-3 h-3" />
                <span>Percobaan login dinonaktifkan hingga waktu habis.</span>
              </div>
            </div>
          ) : null}

          {/* Error Message */}
          {errorMessage && !isLockedOut && (
            <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMessage}</span>
                {safeFailedAttempts > 0 && safeFailedAttempts < 5 && (
                  <p className="text-[11px] text-rose-300/80 mt-1">
                    Percobaan gagal: {safeFailedAttempts} dari 5. Akun akan terkunci pada 5 kegagalan berturut-turut.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Alamat Email Admin
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLockedOut || isLoading}
                  placeholder="admin@blsdm.komdigi.go.id"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Kata Sandi
                </label>
                <span className="text-[10px] text-slate-400">Minimal 12 karakter</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLockedOut || isLoading}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLockedOut || isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <span>Memverifikasi kredensial...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Masuk Administrator</span>
                </>
              )}
            </button>
          </form>

          {/* Security Policy Information */}
          <div className="pt-3 border-t border-slate-700/60 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center space-x-1.5 text-slate-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Kebijakan Keamanan Sistem (SPEC MVP-1):</span>
            </div>
            <ul className="space-y-1 text-slate-400 pl-4 list-disc text-[10.5px]">
              <li>Tanpa pendaftaran mandiri (hanya admin terdaftar Supabase Auth).</li>
              <li>Panjang kata sandi wajib minimal 12 karakter.</li>
              <li>Penguncian otomatis 15 menit setelah 5 kali gagal login.</li>
              <li>Sesi otomatis berakhir setelah 30 menit tidak aktif.</li>
              <li>Semua aktivitas login dan aksi sensitif dicatat ke <code>audit_log</code>.</li>
            </ul>
          </div>
        </div>

        {/* Demo Quick Reference Banner */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 text-center text-slate-400 text-xs">
          <p className="text-[11px] text-slate-400">
            Kredensial dev demo: <code className="text-indigo-300 font-mono">admin@blsdm.komdigi.go.id</code> • Kata sandi (≥12 karakter): <code className="text-indigo-300 font-mono">AdminBLSDM2026!Yogya</code>
          </p>
        </div>
      </div>
    </div>
  );
};
