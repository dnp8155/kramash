import { Outlet, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/common/Logo";

export default function AdminLayout() {
  const navigate = useNavigate();

  // Go back within the app's own history when there is any; otherwise this is
  // a fresh tab/deep-link into /admin, so land on the home page instead.
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/dashboard");
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-card border-r border-border">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          <Logo size={28} />
          <span className="text-sm font-semibold text-foreground truncate">Admin SaaS</span>
        </div>
        <div className="p-3">
          <button
            onClick={goBack}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-3 h-14 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20 shadow-sm safe-area-top">
          <button
            onClick={goBack}
            className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted transition-colors shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Logo size={24} />
          <span className="text-sm font-semibold text-foreground truncate">Admin SaaS</span>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
