import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { usePlan } from "@/hooks/usePlan";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { navGroups, aboutLegalNav } from "@/constants/navigation";
import { Crown, ChevronRight, LogOut, Settings } from "lucide-react";
import BeatingHeart from "@/components/common/BeatingHeart";
import LogoutConfirmDialog from "@/components/common/LogoutConfirmDialog";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePageSearchQuery } from "@/lib/pageSearch";
import { fuzzyRank } from "@/lib/fuzzySearch";
import { Image } from "@/components/ui/image";
import ScrambleCycle from "@/components/common/ScrambleCycle";

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

  const { plan } = usePlan({ loadUsage: false });
  const planLabel = plan?.planCode === "PRO" ? "PRO" : "FREE";

  // The header search box filters this page's entries while on More (see GlobalSearch).
  const query = usePageSearchQuery();
  const searching = query.trim().length > 0;
  const matches = (...texts) => !searching || texts.some((x) => x && fuzzyRank([x], query, (v) => v).length > 0);
  const showPlan = matches("Your Plan", t("Your Plan"), "Subscription", "Upgrade");
  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => !MOBILE_BAR_PATHS.includes(i.path) && matches(i.label, t(i.label))) }))
    .filter((g) => g.items.length > 0);
  const visibleLegal = aboutLegalNav.filter((i) => matches(i.label, PAGE_TITLES[i.path], t(PAGE_TITLES[i.path] || i.label)));
  const showLogout = matches("Log out", "Logout", t("Log out"));
  const nothingFound = searching && !showPlan && visibleGroups.length === 0 && visibleLegal.length === 0 && !showLogout;

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

      {showPlan && (<>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-6 mb-2 px-1">{t("Your Plan")}</h2>
      <button
        onClick={() => navigate("/plan")}
        className="w-full flex items-center gap-3 bg-card rounded-2xl p-4 text-left border border-border/60 shadow-sm active:scale-[0.99] transition-transform"
      >
        {workspace?.logo ? (
          <div className="relative w-10 h-10 shrink-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted border border-border">
              <Image src={workspace.logo} alt={workspace?.name || "Logo"} fittingType="fill" className="w-full h-full" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full bg-gradient-warning border-2 border-card flex items-center justify-center">
              <Crown className="w-2.5 h-2.5 text-white" />
            </span>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-warning flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{t("Your Plan")}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{planLabel}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{t("See what's in Free vs Pro and manage your subscription.")}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
      </>)}

      {visibleGroups.map((group) => {
        const items = group.items;
        return (
          <div key={group.label}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-6 mb-2 px-1">{t(group.label)}</h2>
            <div className="flex flex-col gap-2.5">
              {items.map((item) => <Card key={item.path} item={item} />)}
            </div>
          </div>
        );
      })}

      {visibleLegal.length > 0 && (<>
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-6 mb-2 px-1">{t("About & Legal")}</h2>
      {/* Rarely needed, so they share one compact row instead of three full-width cards. */}
      <div className="grid grid-cols-3 gap-2.5">
        {visibleLegal.map((item) => {
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
      </>)}
      {showLogout && (
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
      )}

      {nothingFound && (
        <p className="mt-10 text-center text-sm text-muted-foreground">{t("No results found.")}</p>
      )}

      {!searching && (
      <p className="mt-8 flex items-center justify-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
        Made with <BeatingHeart /> in
        <ScrambleCycle words={["India", "Gujarat", "Vadodara"]} />
      </p>
      )}
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