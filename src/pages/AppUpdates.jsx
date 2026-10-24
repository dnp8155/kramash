import { useState } from "react";
import {
  CheckCircle2, RefreshCw, Loader2, Sparkles,
  KeyRound, CalendarClock, Ban, BellRing, CalendarRange, UserCog, Users, ListChecks, Type,
  Hash, CalendarPlus, WifiOff, ShieldCheck, Rocket, Cloud, Zap, Heart, Star, Bell, Download, Wifi, Layers, Smile, Lightbulb, Flag, Compass, Leaf, CalendarDays, Link2, HardDrive, Lock, ALargeSmall,
  FileText, GitBranch, Receipt, Landmark, Percent, Eye, UserRoundPen, History, ChevronRight, Palette, Mail, Printer, Crown, Smartphone, Share2, Gift, Wallet, MessageSquare, IdCard, Inbox,
} from "lucide-react";
import InstallStatusCard from "@/components/common/InstallStatusCard";
import AppLockStatusCard from "@/components/security/AppLockStatusCard";
import Logo from "@/components/common/Logo";
import ProfileWallpaper from "@/components/profile/ProfileWallpaper";
import { APP_CONFIG } from "@/lib/appConfig";
import { useInstallPrompt, useServiceWorkerUpdate, usePwaDisplayMode } from "@/hooks/usePWA";
import { RELEASE_NOTES } from "@/constants/releaseNotes";
import { usePageTitle } from "@/hooks/usePageTitle";

// Icon names referenced from constants/releaseNotes.js notes — kept as a
// lookup so the data file can stay plain strings/objects, not components.
// Mirrors WhatsNewDialog.jsx's map (same data source, same icon set).
const fmtReleaseDate = (d) => {
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt) ? d : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

// Header wallpaper: friendly, general-purpose doodles (not tied to any trade), drawn in a handful of soft colours.
const HERO_DOODLES = [Sparkles, Rocket, Smartphone, Cloud, ShieldCheck, Zap, Heart, Star, Bell, RefreshCw, Download, Lock, Wifi, Layers, Gift, Smile, Lightbulb, Flag, Compass, Leaf];
const HERO_PALETTE = ["#6d83e0", "#2fa37a", "#e8a23a", "#e0657a", "#9b7ad8"];

const NOTE_ICONS = {
  KeyRound, CalendarClock, Sparkles, Ban, BellRing, CalendarRange, UserCog, Users, ListChecks, Type,
  Hash, CalendarPlus, WifiOff, ShieldCheck, CalendarDays, Link2, HardDrive, Lock, ALargeSmall,
  FileText, GitBranch, Receipt, Landmark, Percent, Eye, UserRoundPen,
  Palette, Mail, Printer, Crown, Smartphone, Share2, Gift, Wallet, MessageSquare, IdCard, Inbox,
};

export default function AppUpdates() {
  usePageTitle("App Updates");
  const [checking, setChecking] = useState(false);

  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const { updateAvailable, applyUpdate, installing: swInstalling } = useServiceWorkerUpdate();
  const isPwaInstalled = usePwaDisplayMode();


  const handleCheckUpdates = async () => {
    setChecking(true);
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
      }
      await new Promise((r) => setTimeout(r, 800));
    } finally {
      setChecking(false);
    }
  };

  const statusTone = updateAvailable
    ? { chip: "border-warning/40 bg-warning/10 text-warning", button: "bg-warning text-white" }
    : checking
      ? { chip: "border-primary/40 bg-primary/10 text-primary", button: "bg-primary text-primary-foreground" }
      : { chip: "border-success/40 bg-success/10 text-success", button: "bg-success text-white" };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header: same family as the public profile hero (wallpaper, logo plate, name, chips, button on the seam), on the theme's own surface colour (--secondary: paper beige, Night dark, or a tint of the chosen Pastel) with multi-coloured doodles. The status chip and button take their colour from the app's state:
          green when up to date, blue while checking, amber when an update is waiting. */}
      {/* Full width, edge to edge like the public profile hero: the negative margins cancel the page padding */}
      <div className="pb-4 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
        <div className="relative w-full overflow-hidden isolate border-b border-border bg-secondary">
          <ProfileWallpaper iconSet={HERO_DOODLES} palette={HERO_PALETTE} stroke="#6d83e0" glow="#e8a23a" glowSoft="rgba(232,162,58,.5)" opacity={0.42} glowOpacity={0.95} motion="random" />
          {checking && <div aria-hidden="true" className="saving-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent" />}
          {/* Soft halo in the header's own colour behind the text so doodles never run through the words */}
          <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 70% at 50% 52%, hsl(var(--secondary) / 0.96) 0%, hsl(var(--secondary) / 0.85) 45%, hsl(var(--secondary) / 0) 100%)" }} />
          <div className="relative px-6 pt-9 pb-10 sm:pt-12 sm:pb-12 flex flex-col items-center text-center gap-3">
            <div className="w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] rounded-[22px] ring-2 ring-border bg-white shadow-sm flex items-center justify-center overflow-hidden">
              <Logo size={64} className="sm:scale-110" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-foreground">{APP_CONFIG.name}</h2>
            <p className="text-sm sm:text-base font-medium text-foreground/80 max-w-md text-balance">Built for Creative Businesses</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full border border-border bg-muted/60 text-xs font-semibold tracking-wide text-foreground">v{APP_CONFIG.version}</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold tracking-wide ${statusTone.chip}`}>
                {checking ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…</>
                  : updateAvailable ? <><RefreshCw className="w-3.5 h-3.5" /> Update available</>
                  : <><CheckCircle2 className="w-3.5 h-3.5" /> You're up to date</>}
              </span>
            </div>
            <p className="text-[11px] font-medium text-foreground/70">{APP_CONFIG.phase}</p>
          </div>
        </div>

        {/* The action sits on the seam under the header, half on each side */}
        <div className="relative z-10 h-0 flex items-start justify-center px-4">
          {/* The lift lives on this wrapper: the app clears transforms on pressed buttons, which made the pill drop */}
          <div className="-translate-y-1/2">
          <button
            onClick={updateAvailable ? applyUpdate : handleCheckUpdates}
            disabled={updateAvailable ? swInstalling : checking}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold shadow-sm min-w-[12.5rem] justify-center transition-[filter,opacity] duration-200 hover:brightness-105 active:brightness-95 disabled:opacity-80 ${statusTone.button}`}
          >
            {updateAvailable
              ? (swInstalling ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : <><RefreshCw className="w-4 h-4" /> Update now</>)
              : checking ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>
              : <><CheckCircle2 className="w-4 h-4" /> Up to date · Check again</>}
          </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InstallStatusCard isPwaInstalled={isPwaInstalled} installed={installed} canInstall={canInstall} promptInstall={promptInstall} updateAvailable={updateAvailable} />

        <AppLockStatusCard />

        <div className="bg-card border border-border rounded-[15px] p-4 md:col-span-2">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <History className="w-4 h-4" /> Changelog / Release Notes
          </h3>
          <div className="divide-y divide-border">
            {RELEASE_NOTES.map((r, idx) => (
              <details key={r.version} open={idx === 0} className="group py-3 first:pt-0 last:pb-0">
                <summary className="flex items-center gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
                  <span className="text-sm font-semibold text-foreground">v{r.version}</span>
                  {idx === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Latest</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{fmtReleaseDate(r.date)}</span>
                </summary>
                <div className="space-y-3 mt-3 pl-6">
                  {r.notes.map((note, i) => {
                    if (typeof note === "string") {
                      return (
                        <div key={i} className="flex gap-2 text-sm text-foreground">
                          <span className="text-primary mt-0.5 shrink-0">•</span>
                          <span>{note}</span>
                        </div>
                      );
                    }
                    const Icon = NOTE_ICONS[note.icon] || Sparkles;
                    return (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground leading-tight">{note.title}</div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{note.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}