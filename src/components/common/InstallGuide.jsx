import { useMemo, useState, useEffect } from "react";
import {
  Smartphone, Laptop, Apple, Share, SquarePlus, ToggleRight, CheckCircle2, Menu, EllipsisVertical, Ellipsis,
  Download, MonitorDown, Globe, ExternalLink, Zap, BellRing, Lock, Loader2, Info, TriangleAlert,
} from "lucide-react";
import Button from "@/components/common/Button";
import SegmentedTabs from "@/components/common/SegmentedTabs";
import { detectDevice } from "@/lib/deviceDetect";
import { getInstallGuide, INSTALL_FAMILIES, IN_APP_STEP, INSTALL_BENEFITS } from "@/constants/installGuides";
import { useT } from "@/hooks/useT";

const ICONS = {
  share: Share, plus: SquarePlus, toggle: ToggleRight, check: CheckCircle2, menu: Menu, "menu-v": EllipsisVertical,
  "menu-h": Ellipsis, install: Download, "monitor-down": MonitorDown, globe: Globe, external: ExternalLink,
  zap: Zap, bell: BellRing, lock: Lock,
};
const FAMILY_ICONS = { phone: Apple, android: Smartphone, desktop: Laptop };

// "Tap **Share**" -> Tap <strong>Share</strong>
function Rich({ text }) {
  return text.split("**").map((part, i) => (i % 2 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : <span key={i}>{part}</span>));
}

function Step({ n, icon, text, accent, compact }) {
  const Icon = ICONS[icon] || CheckCircle2;
  return (
    <li className={`flex items-start ${compact ? "gap-2.5" : "gap-3"}`}>
      <div className="relative shrink-0">
        <div className={`${compact ? "w-8 h-8 rounded-lg" : "w-10 h-10 rounded-xl"} flex items-center justify-center ${accent ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"}`}>
          <Icon className={compact ? "w-4 h-4" : "w-5 h-5"} />
        </div>
        {n != null && (
          <span className={`absolute bg-foreground text-background font-bold flex items-center justify-center rounded-full ${compact ? "-top-1 -left-1 w-4 h-4 text-[9px]" : "-top-1.5 -left-1.5 w-5 h-5 text-[10px]"}`}>{n}</span>
        )}
      </div>
      <p className={`text-muted-foreground leading-relaxed ${compact ? "text-xs pt-1" : "text-sm pt-1.5"}`}><Rich text={text} /></p>
    </li>
  );
}

// The install steps themselves: tabs for iPhone/iPad, Android and Desktop (opens on the device
// the person is using), the browser's one-tap install when offered, numbered steps with icon
// tiles, and the benefits. Used inside the install sheet and inline on the App Updates page.
//   canInstall / onInstall — the browser's own install prompt, when it offered one.
//   resetKey               — changing it (e.g. the sheet opening) snaps back to this device's tab.
//   tabsId                 — unique layoutId for the sliding tab indicator when shown twice.
//   compact                — smaller tiles/text and no benefits row, to fit inside a small card.
const SHORT_TABS = { ios: "iOS", android: "Android", desktop: "Desktop" };

export default function InstallGuide({ canInstall = false, onInstall, resetKey, tabsId = "install-family-indicator", onDone, compact = false }) {
  const t = useT();
  const env = useMemo(() => detectDevice(), []);
  const [family, setFamily] = useState(env.family);
  const [installing, setInstalling] = useState(false);

  useEffect(() => { setFamily(env.family); }, [resetKey, env.family]);

  const guide = getInstallGuide(env, family);
  const onMyDevice = family === env.family;
  const FamilyIcon = FAMILY_ICONS[INSTALL_FAMILIES.find((f) => f.key === family)?.icon] || Smartphone;

  const handleInstall = async () => {
    if (!onInstall) return;
    setInstalling(true);
    try { const ok = await onInstall(); if (ok) onDone?.(); } finally { setInstalling(false); }
  };

  return (
    <div className={compact ? "space-y-3.5" : "space-y-5"}>
          <SegmentedTabs
            items={INSTALL_FAMILIES.map((f) => ({ value: f.key, label: compact ? SHORT_TABS[f.key] : f.label, icon: FAMILY_ICONS[f.icon] }))}
            value={family}
            onChange={setFamily}
            layoutId={tabsId}
            size="sm"
            scroll
          />

          {onMyDevice && canInstall && (
            <div className={`rounded-2xl border border-primary/25 bg-primary/5 flex items-center gap-3 ${compact ? "p-2.5" : "p-4"}`}>
              {!compact && <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0"><Download className="w-5 h-5" /></div>}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">{t("One-tap install available")}</div>
                {!compact && <p className="text-xs text-muted-foreground">{t("Your browser can install Kramasha right now.")}</p>}
              </div>
              <Button size="sm" onClick={handleInstall} disabled={installing}>
                {installing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} {t("Install now")}
              </Button>
            </div>
          )}

          <div>
            <div className={`flex items-center gap-2 ${compact ? "mb-2.5" : "mb-3"}`}>
              <FamilyIcon className="w-4 h-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">{guide.title}</h4>
            </div>
            <ol className={compact ? "space-y-3" : "space-y-4"}>
              {onMyDevice && env.inApp && <Step compact={compact} icon={IN_APP_STEP.icon} text={IN_APP_STEP.text} accent />}
              {guide.steps.map((s, i) => <Step compact={compact} key={i} n={i + 1} icon={s.icon} text={s.text} />)}
            </ol>
            {guide.note && (
              <div className={`flex items-start gap-2 rounded-xl bg-muted/60 text-xs text-muted-foreground ${compact ? "mt-3 px-2.5 py-2" : "mt-4 px-3 py-2.5"}`}>
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> <span><Rich text={guide.note} /></span>
              </div>
            )}
            {!onMyDevice && (
              <div className={`flex items-start gap-2 rounded-xl bg-warning/10 text-xs text-muted-foreground ${compact ? "mt-3 px-2.5 py-2" : "mt-4 px-3 py-2.5"}`}>
                <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warning" /> <span>{t("These steps are for a different device than the one you're on now.")}</span>
              </div>
            )}
          </div>

          {!compact && <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {INSTALL_BENEFITS.map((b) => {
              const Icon = ICONS[b.icon] || Zap;
              return (
                <div key={b.text} className="flex sm:flex-col items-center sm:items-start gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground leading-snug">{b.text}</span>
                </div>
              );
            })}
          </div>}
    </div>
  );
}

export { detectDevice };
