import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { YearProvider } from "./context/YearContext";
import { Layout } from "./components/layout/Layout";
import { PageId } from "./components/layout/Sidebar";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BatchPage } from "./pages/BatchPage";
import { ValidasiPage } from "./pages/ValidasiPage";
import { LaporanPage } from "./pages/LaporanPage";
import { AktivitasAgentPage } from "./pages/AktivitasAgentPage";
import { KartuAgentPage } from "./pages/KartuAgentPage";
import { PrivasiKepatuhanPage } from "./pages/PrivasiKepatuhanPage";

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const pageMeta: Record<PageId, { title: string; subtitle: string }> = {
    dashboard: {
      title: "Dashboard EWS Portofolio",
      subtitle: "Monitoring capaian kumulatif Perjanjian Kinerja dan tingkat EWS batch",
    },
    batch: {
      title: "Manajemen Batch & Tautan Sheet",
      subtitle: "Pendaftaran batch Google Sheets dan riwayat sinkronisasi harian",
    },
    validasi: {
      title: "Antrean Validasi",
      subtitle: "Gerbang keputusan manusia untuk validasi anomali dan level",
    },
    laporan: {
      title: "Laporan Bulanan",
      subtitle: "Penyusunan draf, peninjauan angka, dan persetujuan ekspor DOCX",
    },
    "aktivitas-agent": {
      title: "Aktivitas Agent Realtime",
      subtitle: "Timeline proses agent otonom dan trace langkah pemanggilan alat",
    },
    "kartu-agent": {
      title: "Kartu Agent & Batasan AI",
      subtitle: "Transparansi batasan AI, izin alat (tools), dan kill-switch otonomi",
    },
    privasi: {
      title: "Privasi & Kepatuhan PDP",
      subtitle: "Minimisasi identitas, masking nomor registrasi, dan catatan audit log",
    },
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage onNavigate={setCurrentPage} />;
      case "batch":
        return <BatchPage />;
      case "validasi":
        return <ValidasiPage />;
      case "laporan":
        return <LaporanPage />;
      case "aktivitas-agent":
        return <AktivitasAgentPage />;
      case "kartu-agent":
        return <KartuAgentPage />;
      case "privasi":
        return <PrivasiKepatuhanPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  const meta = pageMeta[currentPage];

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      pageTitle={meta.title}
      pageSubtitle={meta.subtitle}
    >
      {renderCurrentPage()}
    </Layout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <YearProvider>
        <AppContent />
      </YearProvider>
    </AuthProvider>
  );
}

export default App;
