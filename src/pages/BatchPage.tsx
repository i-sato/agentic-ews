import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  RefreshCw,
  ExternalLink,
  FileSpreadsheet,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Calendar,
  AlertTriangle,
  Info,
  Clock,
  Eye,
  Check,
  X,
  FileText,
} from "lucide-react";
import { useYear } from "../context/YearContext";
import { useAuth } from "../context/AuthContext";
import {
  clientGetBatches,
  clientRegisterBatches,
  clientFetchBatch,
  clientFetchAllBatches,
  clientUploadCsv,
  clientGetBatchDetail,
  clientGetSettings,
} from "../lib/apiClient";
import { parseNamaBerkas, normalisasiLevel, maskNoReg } from "../lib/clientUtils";
import { BatchItem } from "../../shared/types";

export const BatchPage: React.FC = () => {
  const { selectedYear } = useYear();
  const { user } = useAuth();

  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [fetchingBatchId, setFetchingBatchId] = useState<string | null>(null);

  // Add Batch Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [sheetUrlsInput, setSheetUrlsInput] = useState("");
  const [parsedPreviewList, setParsedPreviewList] = useState<any[]>([]);
  const [submittingBatch, setSubmittingBatch] = useState(false);
  const [registerResult, setRegisterResult] = useState<any | null>(null);

  // Upload CSV Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadBatchId, setUploadBatchId] = useState<string>("");
  const [csvContent, setCsvContent] = useState<string>("");
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Detail Modal State
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await clientGetBatches(selectedYear);
      setBatches(data || []);
      const sett = await clientGetSettings();
      setSettings(sett);
    } catch (err) {
      console.error("Gagal memuat batch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  // Handle URL change in Add Batch Modal
  const handleUrlInputChange = (text: string) => {
    setSheetUrlsInput(text);
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const previews = lines.map((url, idx) => {
      // Regex extract 5-digit or VBL from URL / query if present
      let guessedTitle = `MIRROR - DTA VBL 1310${idx + 8} FAWD 1-30 Sept`;
      if (url.includes("spreadsheets/d/")) {
        const idPart = url.split("/d/")[1]?.split("/")[0] || "";
        guessedTitle = `Sheet ${idPart.slice(0, 8)} VBL 1310${idx + 8} FAWD 1-30 Sept`;
      }

      const parsed = parseNamaBerkas(guessedTitle);
      const levelGuessed = normalisasiLevel(guessedTitle) || "Fundamental";
      const startDay = parsed.tglMulai ? String(parsed.tglMulai.d).padStart(2, "0") : "01";
      const startMon = parsed.tglMulai ? String(parsed.tglMulai.m).padStart(2, "0") : "09";
      const endDay = parsed.tglSelesai ? String(parsed.tglSelesai.d).padStart(2, "0") : "30";
      const endMon = parsed.tglSelesai ? String(parsed.tglSelesai.m).padStart(2, "0") : "09";

      return {
        url,
        namaBerkas: guessedTitle,
        idPelatihan: parsed.idPelatihan || `1310${idx + 8}`,
        tema: parsed.temaAtauAlias || "FAWD",
        level: levelGuessed,
        levelSource: "nama_berkas",
        tanggalMulai: `${selectedYear}-${startMon}-${startDay}`,
        tanggalSelesai: `${selectedYear}-${endMon}-${endDay}`,
        tahun: selectedYear,
      };
    });

    setParsedPreviewList(previews);
  };

  const updatePreviewItem = (index: number, field: string, value: any) => {
    setParsedPreviewList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "tanggalMulai" && value) {
        // Auto TA dari tanggal mulai
        const yr = parseInt(value.slice(0, 4), 10);
        if (yr) next[index].tahun = yr;
      }
      return next;
    });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedPreviewList.length === 0) return;

    setSubmittingBatch(true);
    setRegisterResult(null);

    try {
      const res = await clientRegisterBatches(parsedPreviewList, user?.id);
      setRegisterResult(res);
      if (res.success) {
        await loadData();
        setTimeout(() => {
          setShowAddModal(false);
          setSheetUrlsInput("");
          setParsedPreviewList([]);
          setRegisterResult(null);
        }, 1200);
      }
    } catch (err: any) {
      setRegisterResult({ success: false, errors: [err.message] });
    } finally {
      setSubmittingBatch(false);
    }
  };

  const handleFetchSingle = async (batchId: string) => {
    setFetchingBatchId(batchId);
    try {
      await clientFetchBatch(batchId, "manual");
      await loadData();
    } catch (err) {
      console.error("Gagal sinkronisasi batch:", err);
    } finally {
      setFetchingBatchId(null);
    }
  };

  const handleFetchAll = async () => {
    setFetchingAll(true);
    try {
      await clientFetchAllBatches(selectedYear, "manual");
      await loadData();
    } catch (err) {
      console.error("Gagal sinkronisasi semua batch:", err);
    } finally {
      setFetchingAll(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || "";
      setCsvContent(text);
    };
    reader.readAsText(file);
  };

  const handleProcessUploadedCsv = async () => {
    if (!uploadBatchId || !csvContent) return;

    setUploading(true);
    setUploadMessage(null);
    try {
      const res = await clientUploadCsv(uploadBatchId, csvContent);
      if (res.success) {
        setUploadMessage("Berhasil memproses berkas CSV cadangan!");
        await loadData();
        setTimeout(() => {
          setShowUploadModal(false);
          setCsvContent("");
          setCsvFileName("");
          setUploadMessage(null);
        }, 1200);
      } else {
        setUploadMessage(`Gagal: ${res.error || "Gagal memproses berkas"}`);
      }
    } catch (err: any) {
      setUploadMessage(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenDetail = async (batchId: string) => {
    setLoadingDetail(true);
    setSelectedBatchDetail(null);
    try {
      const detail = await clientGetBatchDetail(batchId);
      setSelectedBatchDetail(detail);
    } catch (err) {
      console.error("Gagal memuat detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const saEmail = settings?.serviceAccount?.clientEmail || "pembaca-sheet@proyek.iam.gserviceaccount.com";
  const saConfigured = settings?.serviceAccount?.configured;

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Daftar Batch Pelatihan (Tautan Google Sheets)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tahun Anggaran {selectedYear} • Pembaruan otomatis via cron harian dan tombol manual
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleFetchAll}
            disabled={fetchingAll || batches.length === 0}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingAll ? "animate-spin text-indigo-600" : ""}`} />
            <span>{fetchingAll ? "Memperbarui Semua..." : "Perbarui Semua"}</span>
          </button>

          <button
            onClick={() => {
              if (batches.length > 0) setUploadBatchId(batches[0].id);
              setShowUploadModal(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Cadangan (.csv)</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Batch Baru</span>
          </button>
        </div>
      </div>

      {/* Service Account Instruction Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-200 rounded-xl p-4 text-xs text-slate-700 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 font-semibold text-indigo-950">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Petunjuk Integrasi Google Sheets API (Viewer Read-Only):</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
              saConfigured
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-amber-100 text-amber-800 border border-amber-300"
            }`}
          >
            {saConfigured ? "Service Account Aktif" : "Service Account Menunggu Konfigurasi"}
          </span>
        </div>
        <p className="text-[11.5px] leading-relaxed text-slate-600">
          Untuk menghubungkan spreadsheet batch pelatihan, pastikan Anda telah membagikan sheet sebagai{" "}
          <strong className="text-indigo-900">Viewer</strong> ke alamat service account:{" "}
          <code className="bg-white px-2 py-0.5 rounded border border-indigo-200 font-mono text-indigo-800 select-all">
            {saEmail}
          </code>
          . Tab yang dibaca otomatis adalah{" "}
          <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-800">
            All Pendaftar Web
          </code>
          .
        </p>
      </div>

      {/* Batches Table List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Daftar Batch Terdaftar ({batches.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Tahun Anggaran {selectedYear}</span>
        </div>

        {batches.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-sm font-semibold text-slate-800">
                Belum ada batch pelatihan untuk TA {selectedYear}
              </h4>
              <p className="text-xs text-slate-500">
                Klik tombol "Tambah Batch Baru" untuk menempelkan tautan Google Sheets (banyak tautan sekaligus).
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">ID / Program</th>
                  <th className="py-3 px-3">Level</th>
                  <th className="py-3 px-3">Periode</th>
                  <th className="py-3 px-3">Status Masuk PK</th>
                  <th className="py-3 px-3">Fetch Terakhir</th>
                  <th className="py-3 px-3 text-center">Peserta / Lulus</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => {
                  const snap = b.snapshot;
                  const isUnconfirmed = b.level_source === "belum" || !b.level;
                  const isFetching = fetchingBatchId === b.id;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {b.tema || "Tema"} {b.id_pelatihan ? `(ID ${b.id_pelatihan})` : ""}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate max-w-xs mt-0.5">
                          {b.nama_berkas}
                        </div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10.5px] font-semibold border ${
                            b.level === "Fundamental"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : b.level === "Intermediate"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {b.level || "Belum"}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5 font-mono">
                          sumber: {b.level_source || "belum"}
                        </span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {b.tanggal_mulai ? b.tanggal_mulai.slice(5) : "-"} s.d.{" "}
                        {b.tanggal_selesai ? b.tanggal_selesai.slice(5) : "-"}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        {isUnconfirmed ? (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                            Belum masuk capaian resmi
                          </span>
                        ) : b.masuk_capaian_pk ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            Masuk Capaian PK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px]">
                            Non-Capaian (Intermediate)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              b.last_fetch_status === "ok"
                                ? "bg-emerald-500"
                                : b.last_fetch_status === "tidak_berubah"
                                ? "bg-sky-500"
                                : b.last_fetch_status === "tab_hilang"
                                ? "bg-amber-500"
                                : b.last_fetch_status === "akses_ditolak"
                                ? "bg-rose-500"
                                : "bg-slate-300"
                            }`}
                          ></span>
                          <span className="font-mono text-[11px] text-slate-700">
                            {b.last_fetch_status || "Belum di-fetch"}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                          {b.last_fetch_at
                            ? new Date(b.last_fetch_at).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {snap ? (
                          <div>
                            <span className="font-bold text-slate-800">
                              {snap.lulus} / {snap.onboarding}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-1">
                              ({snap.capaian !== null ? `${snap.capaian.toFixed(1)}%` : "-"})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleFetchSingle(b.id)}
                            disabled={isFetching}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                            title="Perbarui sekarang"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-600" : ""}`} />
                          </button>

                          <button
                            onClick={() => handleOpenDetail(b.id)}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                            title="Lihat Detail & Masked Peserta"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Tambah Batch (Multi-URL) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Tambah Batch Pelatihan (Tautan Google Sheets)
                </h3>
                <p className="text-xs text-slate-500">
                  Tempel satu atau beberapa tautan Google Sheets (satu baris per tautan).
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Tautan Google Sheets
                </label>
                <textarea
                  rows={3}
                  value={sheetUrlsInput}
                  onChange={(e) => handleUrlInputChange(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0&#10;https://docs.google.com/spreadsheets/d/1_contoh_lain..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Server akan mengurai <code>sheet_id</code>, <code>gid</code>, membaca judul, dan mem-parse nama berkas.
                </p>
              </div>

              {/* Previews & Editable Form Items */}
              {parsedPreviewList.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="font-semibold text-slate-800 text-xs border-b border-slate-200 pb-1">
                    Hasil Penguraian Nama Berkas (Dapat Diedit):
                  </h4>

                  {parsedPreviewList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            ID Pelatihan (5 Digit)
                          </label>
                          <input
                            type="text"
                            value={item.idPelatihan || ""}
                            onChange={(e) => updatePreviewItem(idx, "idPelatihan", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                            placeholder="13108"
                            pattern="^[0-9]{5}$"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Tema / Alias
                          </label>
                          <input
                            type="text"
                            value={item.tema || ""}
                            onChange={(e) => updatePreviewItem(idx, "tema", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono uppercase"
                            placeholder="FAWD"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Level
                          </label>
                          <select
                            value={item.level || ""}
                            onChange={(e) => {
                              const v = e.target.value || null;
                              updatePreviewItem(idx, "level", v);
                              updatePreviewItem(idx, "levelSource", v ? "manual" : "belum");
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold"
                          >
                            <option value="Fundamental">Fundamental (Capaian PK)</option>
                            <option value="Intermediate">Intermediate (Non-Capaian)</option>
                            <option value="">Belum Terkonfirmasi</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Tanggal Mulai
                          </label>
                          <input
                            type="date"
                            value={item.tanggalMulai || ""}
                            onChange={(e) => updatePreviewItem(idx, "tanggalMulai", e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Tanggal Selesai
                          </label>
                          <input
                            type="date"
                            value={item.tanggalSelesai || ""}
                            onChange={(e) => updatePreviewItem(idx, "tanggalSelesai", e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                            required
                          />
                        </div>
                      </div>

                      <div className="text-[10.5px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span>Tahun Anggaran: <strong>TA {item.tahun}</strong></span>
                        <span className="font-mono text-slate-400 truncate max-w-xs">{item.namaBerkas}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Status / Error feedback */}
              {registerResult && (
                <div
                  className={`p-3 rounded-lg text-xs ${
                    registerResult.success
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {registerResult.success ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Berhasil mendaftarkan {registerResult.registeredCount} batch!</span>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold">Pendaftaran ditolak:</p>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5">
                        {(registerResult.duplicates || []).map((d: string, i: number) => (
                          <li key={i}>{d}</li>
                        ))}
                        {(registerResult.errors || []).map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingBatch || parsedPreviewList.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  {submittingBatch ? "Mendaftarkan..." : `Daftarkan ${parsedPreviewList.length} Batch`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Unggah Berkas Cadangan (.csv) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Unggah Berkas Cadangan (.csv)
                </h3>
                <p className="text-xs text-slate-500">
                  Jalur cadangan jika Google Sheets tidak dapat diakses atau dibagikan.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Pilih Batch Target
                </label>
                <select
                  value={uploadBatchId}
                  onChange={(e) => setUploadBatchId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.tema} (ID {b.id_pelatihan}) - {b.nama_berkas}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Pilih Berkas CSV
                </label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              {csvFileName && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{csvFileName}</span>
                  </div>
                  <p>
                    Baris terbaca: ~{csvContent.split("\n").length - 1} baris.
                    Nama & instansi akan dibuang seketika di memori server dan tidak disimpan.
                  </p>
                </div>
              )}

              {uploadMessage && (
                <div
                  className={`p-3 rounded-lg text-xs ${
                    uploadMessage.startsWith("Berhasil")
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {uploadMessage}
                </div>
              )}

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleProcessUploadedCsv}
                  disabled={uploading || !csvContent || !uploadBatchId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  {uploading ? "Memproses..." : "Proses Berkas CSV"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detail Batch & Masked Participants */}
      {selectedBatchDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Detail Batch: {selectedBatchDetail.batch?.tema} (ID {selectedBatchDetail.batch?.id_pelatihan})
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedBatchDetail.batch?.nama_berkas} • Snapshot Harian & Peserta Masked
                </p>
              </div>
              <button
                onClick={() => setSelectedBatchDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Metrics Aggregates */}
            {selectedBatchDetail.snapshot && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 block">Peserta Aktif</span>
                  <span className="text-lg font-bold text-slate-900">
                    {selectedBatchDetail.snapshot.peserta_aktif}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 text-center">
                  <span className="text-[11px] text-indigo-700 block">Onboarding (&ge;90%)</span>
                  <span className="text-lg font-bold text-indigo-900">
                    {selectedBatchDetail.snapshot.onboarding}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                  <span className="text-[11px] text-emerald-700 block">Lulus (100%)</span>
                  <span className="text-lg font-bold text-emerald-900">
                    {selectedBatchDetail.snapshot.lulus}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 block">Capaian Batch</span>
                  <span className="text-lg font-bold text-slate-900">
                    {selectedBatchDetail.snapshot.capaian !== null
                      ? `${selectedBatchDetail.snapshot.capaian.toFixed(1)}%`
                      : "-"}
                  </span>
                </div>
              </div>
            )}

            {/* Masked Participants Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Data Peserta Termasking ({selectedBatchDetail.pesertaCount} Peserta)
                </h4>
                <span className="text-[10px] text-slate-500">
                  Nama & instansi tidak pernah disimpan (SPEC MVP-1 Minimisasi Identitas)
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Alias</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Modul Selesai</th>
                      <th className="py-2 px-3 text-center">Onboarding</th>
                      <th className="py-2 px-3 text-center">Lulus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {(selectedBatchDetail.pesertaMasked || []).map((p: any) => (
                      <tr key={p.id || p.alias} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-indigo-700">{p.alias}</td>
                        <td className="py-2 px-3 text-slate-600">{p.status_daftar || "Peserta"}</td>
                        <td className="py-2 px-3 text-slate-800">
                          {p.modul_selesai} / {p.total_modul} modul
                        </td>
                        <td className="py-2 px-3 text-center">
                          {p.onboarding ? (
                            <span className="text-emerald-600 font-bold">✓</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {p.lulus ? (
                            <span className="text-emerald-600 font-bold">✓</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedBatchDetail(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
