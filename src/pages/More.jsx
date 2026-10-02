import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { navGroups, aboutLegalNav } from "@/constants/navigation";
import { Crown, ChevronRight, LogOut, Heart, Settings } from "lucide-react";
import LogoutConfirmDialog from "@/components/common/LogoutConfirmDialog";
import { usePageTitle } from "@/hooks/usePageTitle";

const MOBILE_BAR_PATHS = ["/events", "/team", "/financial"];
// Tiles use each page's real title (its heading), so the label matches what opens.
const PAGE_TITLES = { "/about": "About Us", "/terms": "Terms of Service", "/privacy": "Privacy Policy" };

export default function More() {
  const navigate = useNavigate();
  const term = useBusinessTerminology();
  const t = useT();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  usePageTitle("More");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (window.innerWidth >= 1024) navigate("/dashboard", { replace: true });
  }, [navigate]);

  const planLabel = workspace?.plan_type === "pro" ? "PRO" : "FREE";

  const Card = ({ item }) => {
    const Icon = item.icon;
    return (
      <button
        onClick={() => navigate(item.path)}
        className="w-full flex items-center gap-3 bg-card rounded-2xl p-4 text-left border border-border/60 shadow-sm active:scale-[0.99] transition-transform"
      >
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">{t(item.label)}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
    );
  };

  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground">{t("More")}</h1>
      <p className="text-sm text-muted-foreground mt-1 leading-snug">
        {t("Settings, plan, and everything else.")}
      </p>

      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-6 mb-2 px-1">{t("Your Plan")}</h2>
      <button
        onClick={() => navigate("/plan")}
        className="w-full flex items-center gap-3 bg-card rounded-2xl p-4 text-left border border-border/60 shadow-sm active:scale-[0.99] transition-transform"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-warning flex items-center justify-center shrink-0">
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{t("Your Plan")}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{planLabel}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{t("See what's in Free vs Pro and manage your subscription.")}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {navGroups.map((group) => {
        const items = group.items.filter((item) => !MOBILE_BAR_PATHS.includes(item.path));
        if (items.length === 0) return null;
        return (
          <div key={group.label}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-6 mb-2 px-1">{t(group.label)}</h2>
            <div className="flex flex-col gap-2.5">
              {items.map((item) => <Card key={item.path} item={item} />)}
            </div>
          </div>
        );
      })}

      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-6 mb-2 px-1">{t("About & Legal")}</h2>
      {/* Rarely needed, so they share one compact row instead of three full-width cards. */}
      <div className="grid grid-cols-3 gap-2.5">
        {aboutLegalNav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-start gap-1.5 bg-card rounded-2xl px-2 py-3 border border-border/60 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Icon className="w-[18px] h-[18px] text-foreground" />
              </div>
              <span className="text-xs font-semibold text-foreground leading-tight text-center">{t(PAGE_TITLES[item.path] || item.label)}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2.5 mt-2.5">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 bg-card rounded-2xl p-4 text-left border border-border/60 shadow-sm active:scale-[0.99] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-destructive">{t("Log out")}</div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </div>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        Made with <Heart className="w-3.5 h-3.5 fill-destructive text-destructive" aria-label="love" /> in Vadodara
      </p>
      {user?.role === "admin" && (
        <Link to="/admin" className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="w-3.5 h-3.5" />
          {t("SaaS Admin")}
        </Link>
      )}

      <LogoutConfirmDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm} />
    </div>
  );
}