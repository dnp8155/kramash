import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/common/Logo";
import { markAdminEntry, resetAdminEntry } from "@/components/admin/AdminBackButton";

export default function AdminLayout() {
  const navigate = useNavigate();
  useState(markAdminEntry);
  useEffect(() => resetAdminEntry, []);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-card border-r border-border">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          <Logo size={28} />
          <span className="text-sm font-semibold text-foreground truncate">SaaS Admin</span>
        </div>
        <div className="p-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-3 h-14 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20 shadow-sm safe-area-top">
          <Logo size={24} />
          <span className="text-sm font-semibold text-foreground truncate flex-1">SaaS Admin</span>
          <button
            onClick={() => navigate("/dashboard")}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
