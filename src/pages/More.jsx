import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Crown, Calculator, FileText, PenLine, Building2, ChevronRight, SlidersHorizontal, Smartphone, LifeBuoy } from "lucide-react";

export default function More() {
  const navigate = useNavigate();
  const term = useBusinessTerminology();
  const t = useT();
  const { workspace } = useWorkspace();

  // Desktop has the full sidebar — redirect /more to dashboard on large screens.
  useEffect(() => {
    if (window.innerWidth >= 1024) navigate("/dashboard", { replace: true });
  }, [navigate]);

  const planLabel = workspace?.plan_type === "pro" ? "PRO" : "FREE";

  const tools = [
    { label: "Rate Estimator", desc: "Build a quick quote from your role & service pricing.", icon: Calculator, path: "/rate-estimator" },
    { label: "Quotation & Agreement", desc: "Client quotation + team job sheet in one — export a ready PDF.", icon: FileText, path: "/quotation" },
    { label: "Sign a PDF", desc: "Add your signature to any PDF on your device — new or old.", icon: PenLine, path: "/sign-pdf" }
  ];

  const workspaceItems = [
    { label: "Workspace", desc: "Business type, roles, services, currency, team.", icon: Building2, path: "/settings/workspace" },
    { label: "Preferences", desc: "Labels, defaults, and display options.", icon: SlidersHorizontal, path: "/preferences" },
    { label: "App & Updates", desc: "Version info and update status.", icon: Smartphone, path: "/app-updates" },
    { label: "Help & Support", desc: "Get help and contact support.", icon: LifeBuoy, path: "/help" }
  ];

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
          <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{t(item.desc)}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
    );
  };

  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground">{t("More")}</h1>
      <p className="text-sm text-muted-foreground mt-1 leading-snug">
        {t("Built for event managers, photographers, architects — anyone running jobs with a team.")}
      </p>

      {/* Your Plan */}
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
          <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{t("See what's in Free vs Pro, switch plans, or log out.")}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>

      {/* Tools */}
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-6 mb-2 px-1">{t("Tools")}</h2>
      <div className="flex flex-col gap-2.5">
        {tools.map((item) => <Card key={item.path} item={item} />)}
      </div>

      {/* Workspace */}
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-6 mb-2 px-1">{t("Workspace")}</h2>
      <div className="flex flex-col gap-2.5">
        {workspaceItems.map((item) => <Card key={item.path} item={item} />)}
      </div>
    </div>
  );
}