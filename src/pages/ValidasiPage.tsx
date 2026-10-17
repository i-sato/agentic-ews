import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  AlertCircle,
  HelpCircle,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  X,
  Edit3,
  RefreshCw,
  Lock,
} from "lucide-react";
import { useYear } from "../context/YearContext";
import { useAuth } from "../context/AuthContext";
import {
  clientGetValidationItems,
  clientDecideValidationItem,
  clientGetSettings,
  clientUpdateCrossBatchSettings,
} from "../lib/apiClient";
import { ValidationItem } from "../../shared/types";

export const ValidasiPage: React.FC = () => {
  const { selectedYear } = useYear();
  const { user } = useAuth();

  const [items, setItems] = useState<ValidationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"terbuka" | "semua">("terbuka");

  // Decision Modal State
  const [decisionModalItem, setDecisionModalItem] = useState<ValidationItem | null>(null);
  const [decisionAction, setDecisionAction] = useState<"diterima" | "diubah" | "ditolak">("diterima");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [decisionLevelSaran, setDecisionLevelSaran] = useState("Fundamental");
  const [processingDecision, setProcessingDecision] = useState(false);

  // Settings State (Cross-batch cancellation settings)
  const [noregStabil, setNoregStabil] = useState<"ya" | "tidak" | "belum_diverifikasi">("belum_diverifikasi");
  const [catatanAktif, setCatatanAktif] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await clientGetValidationItems();
      setItems(data || []);
      const sett = await clientGetSettings();
      if (sett) {
        setNoregStabil(sett.noreg_stabil_lintas_batch || "belum_diverifikasi");
        setCatatanAktif(Boolean(sett.catatan_lintas_batch_aktif));
      }
    } catch (err) {
      console.error("Gagal memuat data validasi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const handleOpenDecision = (item: ValidationItem, action: "diterima" | "diubah" | "ditolak") => {
    setDecisionModalItem(item);
    setDecisionAction(action);
    setDecisionNotes("");
    if (item.saran?.level) {
      setDecisionLevelSaran(item.saran.level);
    } else {
      setDecisionLevelSaran("Fundamental");
    }
  };

  const handleConfirmDecision = async () => {
    if (!decisionModalItem) return;

    setProcessingDecision(true);
    try {
      const saranPayload =
        decisionAction === "diubah"
          ? { ...decisionModalItem.saran, level: decisionLevelSaran }
          : decisionModalItem.saran;

      await clientDecideValidationItem(
        decisionModalItem.id,
        decisionAction,
        decisionNotes || `Keputusan admin: ${decisionAction}`,
        saranPayload,
        user?.id
      );

      await loadData();
      setDecisionModalItem(null);
    } catch (err) {
      console.error("Gagal menyimpan keputusan:", err);
    } finally {
      setProcessingDecision(false);
    }
  };

  const handleSaveCrossBatchSettings = async () => {
    setSavingSettings(true);
    setSettingsSavedMessage(false);
    try {
      await clientUpdateCrossBatchSettings(noregStabil, catatanAktif, user?.id);
      setSettingsSavedMessage(true);
      setTimeout(() => setSettingsSavedMessage(false), 3000);
    } catch (err) {
      console.error("Gagal menyimpan pengaturan lintas batch:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredItems = items.filter((it) => {
    if (activeTab === "terbuka") return it.status === "terbuka";
    return true;
  });

  const openCount = items.filter((it) => it.status === "terbuka").length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Antrean Validasi (Human-in-the-Loop)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tahun Anggaran {selectedYear} • Satu dari dua gerbang manusia resmi (SPEC MVP-1 Bagian 4)
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors text-xs font-medium inline-flex items-center space-x-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </button>

          <span
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 ${
              openCount > 0
                ? "bg-amber-50 text-amber-800 border-amber-300"
                : "bg-emerald-50 text-emerald-800 border-emerald-300"
            }`}
          >
            {openCount > 0 ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>{openCount} Item Perlu Keputusan</span>
          </span>
        </div>
      </div>

      {/* Human-in-the-Loop Protocol Info */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 space-y-2">
        <div className="flex items-center space-x-2 font-semibold text-amber-900">
          <UserCheck className="w-4 h-4 text-amber-700" />
          <span>Prinsip Satu Gerbang Manusia (SPEC MVP-1 Bagian 4 & SE Menkominfo 9/2023):</span>
        </div>
        <p className="text-[11.5px] leading-relaxed text-amber-800">
          AI dan kode deterministik hanya bertugas mendeteksi anomali, ketidakcocokan LMS, ambiguitas nama berkas,
          atau tab hilang. <strong>Keputusan resmi pengesahan level atau status batch selalu diputuskan oleh Administrator</strong>{" "}
          di antarmuka ini. Setiap keputusan admin otomatis dicatat ke dalam <code>audit_log</code> server.
        </p>
      </div>

      {/* Cross-Batch Cancellation Settings Verification Panel */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Verifikasi Pengaturan Pembatalan Lintas Batch (SPEC MVP-1 v0.2.2)
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            Kepatuhan UU PDP
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div className="space-y-2">
            <label className="block font-semibold text-slate-700">
              Apakah Nomor Registrasi Terbukti Stabil Lintas Batch?
            </label>
            <p className="text-[11px] text-slate-500">
              Menentukan mode <code>kunciOrang</code> untuk catatan "kemungkinan sama".
            </p>
            <div className="space-y-1.5 pt-1">
              {[
                { val: "belum_diverifikasi", label: "Belum Diverifikasi (Fitur Nonaktif)", desc: "Aman default: catatan lintas batch dimatikan." },
                { val: "ya", label: "Ya (Stabil Lintas Batch)", desc: "Mode noreg: HMAC nomor registrasi stabil." },
                { val: "tidak", label: "Tidak Stabil (Berubah per Batch)", desc: "Mode nama: HMAC nama ternormalisasi (hash saja, nama tidak disimpan)." },
              ].map((opt) => (
                <label
                  key={opt.val}
                  className={`flex items-start space-x-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                    noregStabil === opt.val
                      ? "bg-indigo-50/70 border-indigo-300 text-indigo-950"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="noregStabil"
                    value={opt.val}
                    checked={noregStabil === opt.val}
                    onChange={(e) => setNoregStabil(e.target.value as any)}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="font-semibold block text-xs">{opt.label}</span>
                    <span className="text-[10.5px] text-slate-500">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <label className="block font-semibold text-slate-700">
                Aktivasi Fitur Catatan Lintas Batch
              </label>
              <p className="text-[11px] text-slate-500">
                Fitur hanya boleh aktif jika admin telah memilih 'Ya' atau 'Tidak' di atas.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (noregStabil === "belum_diverifikasi") {
                      alert("Pilih 'Ya' atau 'Tidak' terlebih dahulu untuk memverifikasi kestabilan nomor registrasi.");
                      return;
                    }
                    setCatatanAktif(!catatanAktif);
                  }}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    catatanAktif
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-slate-100 text-slate-600 border-slate-300"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${catatanAktif ? "bg-emerald-600" : "bg-slate-400"}`}></span>
                  <span>{catatanAktif ? "Catatan Lintas Batch Aktif" : "Catatan Lintas Batch Nonaktif"}</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {settingsSavedMessage && (
                <span className="text-emerald-700 text-xs font-medium flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Pengaturan tersimpan ke server & audit_log!</span>
                </span>
              )}
              <div className="ml-auto">
                <button
                  onClick={handleSaveCrossBatchSettings}
                  disabled={savingSettings}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  {savingSettings ? "Menyimpan..." : "Simpan Pengaturan Lintas Batch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab("terbuka")}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === "terbuka"
                    ? "bg-white text-slate-800 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Terbuka ({openCount})
              </button>
              <button
                onClick={() => setActiveTab("semua")}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === "semua"
                    ? "bg-white text-slate-800 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Semua Riwayat ({items.length})
              </button>
            </div>
          </div>

          <span className="text-xs text-slate-400">Total: {filteredItems.length} item</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-sm font-semibold text-slate-800">
                Antrean Validasi Bersih
              </h4>
              <p className="text-xs text-slate-500">
                Tidak ada item validasi yang memerlukan keputusan manusia saat ini.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredItems.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase border ${
                        item.jenis === "level"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : item.jenis === "tab_hilang"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : item.jenis === "lms_tidak_cocok"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200"
                      }`}
                    >
                      {item.detail?.subjenis || item.jenis}
                    </span>

                    <span
                      className={`text-[10.5px] px-2 py-0.2 rounded font-semibold ${
                        item.status === "terbuka"
                          ? "bg-amber-100 text-amber-800"
                          : item.status === "diterima"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "diubah"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      Status: {item.status}
                    </span>
                  </div>

                  {item.status === "terbuka" && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenDecision(item, "diterima")}
                        className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Terima</span>
                      </button>

                      <button
                        onClick={() => handleOpenDecision(item, "diubah")}
                        className="px-2.5 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Ubah</span>
                      </button>

                      <button
                        onClick={() => handleOpenDecision(item, "ditolak")}
                        className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Tolak</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <p className="font-medium text-slate-900 leading-relaxed">
                    {item.detail?.pesan || JSON.stringify(item.detail)}
                  </p>
                  {item.saran && (
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-[11.5px] text-slate-600 flex items-start space-x-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Saran Sistem:</strong> {item.saran.tindakan || item.saran.catatan || JSON.stringify(item.saran)}
                      </div>
                    </div>
                  )}
                </div>

                {item.diputuskan_pada && (
                  <div className="text-[10px] text-slate-400 font-mono pt-1">
                    Diputuskan pada: {new Date(item.diputuskan_pada).toLocaleString("id-ID")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision Confirmation Modal */}
      {decisionModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Konfirmasi Keputusan Admin
                </h3>
                <p className="text-xs text-slate-500">
                  Tindakan: <strong className="uppercase text-indigo-700">{decisionAction}</strong> untuk item {decisionModalItem.jenis}
                </p>
              </div>
              <button
                onClick={() => setDecisionModalItem(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                {decisionModalItem.detail?.pesan}
              </p>

              {decisionModalItem.jenis === "level" && decisionAction === "diubah" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ubah Level Menjadi:
                  </label>
                  <select
                    value={decisionLevelSaran}
                    onChange={(e) => setDecisionLevelSaran(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="Fundamental">Fundamental (Masuk Capaian PK)</option>
                    <option value="Intermediate">Intermediate (Non-Capaian)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alasan / Catatan Keputusan (Wajib Audit Log):
                </label>
                <textarea
                  rows={2}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Masukkan alasan pertimbangan keputusan admin..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDecisionModalItem(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecision}
                  disabled={processingDecision}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {processingDecision ? "Menyimpan..." : "Simpan Keputusan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
