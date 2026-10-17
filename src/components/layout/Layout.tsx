import React from "react";
import { Sidebar, PageId } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "../../context/AuthContext";
import { AlertTriangle, Clock } from "lucide-react";

interface LayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  pageTitle: string;
  pageSubtitle?: string;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentPage,
  onNavigate,
  pageTitle,
  pageSubtitle,
  children,
}) => {
  const { inactivityNotice, dismissInactivityNotice } = useAuth();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header with Year Selector */}
        <Header pageTitle={pageTitle} pageSubtitle={pageSubtitle} />

        {/* Inactivity Notice Banner */}
        {inactivityNotice && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Sesi Berakhir Otomatis:</strong> Anda telah dikeluarkan karena tidak aktif selama 30 menit demi keamanan sistem. Silakan login kembali.
              </span>
            </div>
            <button
              onClick={dismissInactivityNotice}
              className="text-amber-700 hover:text-amber-900 font-semibold px-2 py-0.5"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Page Body Viewport */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
