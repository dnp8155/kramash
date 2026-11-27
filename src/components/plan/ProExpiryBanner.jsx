import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, X } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useT } from "@/hooks/useT";
import { formatDate } from "@/lib/dates";
import { planValidity } from "@/lib/planValidity";
import { cn } from "@/lib/utils";

const SHOW_FROM_DAYS = 10;
const todayKey = () => new Date().toDateString();
const dismissKey = (subId) => `kramasha_pro_expiry_banner:${subId}`;
const dismissedToday = (subId) => { try { return localStorage.getItem(dismissKey(subId)) === todayKey(); } catch { return false; } };

// A slim bar across the app during Pro's last 10 days (owner only, not on Your Plan, which shows the full validity card).
// Amber, red in the last 2 days. Closing it hides it until tomorrow. Same placement as the suspended / update banners.
export default function ProExpiryBanner() {
  const t = useT();
  const { pathname } = useLocation();
  const { role } = useWorkspace();
  const { plan } = usePlan({ loadUsage: false });
  const sub = plan?.subscription;
  const v = plan?.planCode === "PRO" && sub?.status === "ACTIVE" ? planValidity(sub) : null;
  const [hidden, setHidden] = useState(() => (sub?.id ? dismissedToday(sub.id) : false));

  const show = !!v && !v.expired && v.daysLeft <= SHOW_FROM_DAYS && role === "owner" && pathname !== "/plan" && !hidden && !(sub?.id && dismissedToday(sub.id));
  const urgent = v && v.daysLeft <= 2;
  const isLaunch = sub?.source === "PROMOTIONAL";
  // Whole phrases, so the Hindi / Gujarati app can translate them.
  const headline = !v ? ""
    : v.daysLeft === 0 ? t(isLaunch ? "Your free launch month ends today" : "Pro ends today")
    : v.daysLeft === 1 ? t(isLaunch ? "Your free launch month ends tomorrow" : "Pro ends tomorrow")
    : `${t(isLaunch ? "Free launch month" : "Pro")}: ${v.daysLeft} ${t("days left")}`;

  const close = () => {
    try { localStorage.setItem(dismissKey(sub.id), todayKey()); } catch { /* storage off: hides for this visit */ }
    setHidden(true);
  };

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="pro-expiry"
          role="status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className={cn("overflow-hidden sticky top-0 z-30", urgent ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground")}
        >
          <div className="px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] text-sm flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 min-w-0">
              <CalendarClock className="w-4 h-4 shrink-0" />
              <span className="min-w-0">
                {headline}
                <span className="opacity-80"> ({formatDate(v.expiresAt)}). {t("Renewing before it ends keeps your remaining days.")}</span>
              </span>
            </span>
            {/* Same shapes as the update banner (bordered action + plain round close), in this banner's own colours. */}
            <span className="flex items-center gap-2 shrink-0">
              <Link to="/plan" className={cn("px-3 py-1 rounded-md border transition-colors font-medium", urgent ? "border-destructive-foreground/40 bg-destructive-foreground/15 hover:bg-destructive-foreground/25" : "border-warning-foreground/40 bg-warning-foreground/15 hover:bg-warning-foreground/25")}>{t("Renew")}</Link>
              <button type="button" onClick={close} aria-label={t("Hide until tomorrow")} title={t("Hide until tomorrow")} className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors", urgent ? "bg-destructive-foreground/10 hover:bg-destructive-foreground/20" : "bg-warning-foreground/10 hover:bg-warning-foreground/20")}>
                <X className="w-4 h-4" />
              </button>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
