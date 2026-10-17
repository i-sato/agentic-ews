import React from "react";
import {
  LayoutDashboard,
  Layers,
  CheckSquare,
  FileText,
  Activity,
  Bot,
  ShieldCheck,
  Building2,
  ChevronRight,
  LogOut,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export type PageId =
  | "dashboard"
  | "batch"
  | "validasi"
  | "laporan"
  | "aktivitas-agent"
  | "kartu-agent"
  | "privasi";

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { user, logout } = useAuth();

  const navItems = [
    {
      id: "dashboard" as PageId,
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: "EWS Portofolio",
    },
    {
      id: "batch" as PageId,
      label: "Batch",
      icon: Layers,
      badge: "Tautan Sheet",
    },
    {
      id: "validasi" as PageId,
      label: "Antrean Validasi",
      icon: CheckSquare,
      badge: "Gerbang Manusia",
    },
    {
      id: "laporan" as PageId,
      label: "Laporan",
      icon: FileText,
      badge: "Bulanan DOCX",
    },
    {
      id: "aktivitas-agent" as PageId,
      label: "Aktivitas Agent",
      icon: Activity,
      badge: "Realtime",
    },
    {
      id: "kartu-agent" as PageId,
      label: "Kartu Agent",
      icon: Bot,
      badge: "Batasan AI",
    },
    {
      id: "privasi" as PageId,
      label: "Privasi dan Kepatuhan",
      icon: ShieldCheck,
      badge: "UU 27/2022",
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-900/40">
          <Building2 className="w-5 h-5 text-indigo-100" />
        </div>
        <div>
          <h1 className="font-semibold text-sm tracking-wide text-white leading-tight">
            EWS Capaian PK
          </h1>
          <p className="text-[11px] text-slate-400 font-mono">UPT BLSDM Yogyakarta</p>
        </div>
      </div>

      {/* Program Subheading */}
      <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="font-medium text-slate-300">Talenta Digital</span>
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800/50">
          MVP-1
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-900/50"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform ${
                  isActive ? "text-white opacity-90 translate-x-0.5" : "text-slate-600 group-hover:text-slate-400"
                }`}
              />
            </button>
          );
        })}
      </nav>

      {/* Security & Admin Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/70 space-y-2">
        <div className="flex items-center space-x-2.5 px-2 py-1.5 rounded bg-slate-900/90 border border-slate-800 text-[11px]">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <div className="flex-1 truncate">
            <p className="text-slate-200 font-medium truncate">{user?.nama || "Admin"}</p>
            <p className="text-slate-400 text-[10px] truncate">{user?.email || "admin@blsdm.komdigi.go.id"}</p>
          </div>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
            {user?.role_id || "admin"}
          </span>
        </div>

        <button
          onClick={() => logout("manual_logout")}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 border border-rose-900/40 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar Sesi</span>
        </button>
      </div>
    </aside>
  );
};
