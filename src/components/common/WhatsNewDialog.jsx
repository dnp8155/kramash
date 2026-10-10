import { useState, useEffect } from "react";
import { KeyRound, CalendarClock, Sparkles, Ban, BellRing, CalendarRange, UserCog, Users, ListChecks, Type,
  Hash, CalendarPlus, WifiOff, ShieldCheck, CalendarDays, Link2,
  FileText, GitBranch, Receipt, Landmark, Percent, Eye, UserRoundPen,
  Palette, Mail, Printer, Crown, Smartphone, Share2, Gift, Wallet, MessageSquare,
} from "lucide-react";
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogDescription,
  AppDialogBody,
  AppDialogFooter,
} from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { APP_CONFIG } from "@/lib/appConfig";
import { RELEASE_NOTES } from "@/constants/releaseNotes";
import { UPDATE_APPLIED_KEY } from "@/hooks/usePWA";
import { useT } from "@/hooks/useT";

const SEEN_VERSION_KEY = "kramasha_seen_version";

// Icon names referenced from constants/releaseNotes.js notes — kept as a
// lookup so the data file can stay plain strings/objects, not components.
const NOTE_ICONS = {
  KeyRound, CalendarClock, Sparkles, Ban, BellRing, CalendarRange, UserCog, Users, ListChecks, Type,
  Hash, CalendarPlus, WifiOff, ShieldCheck, CalendarDays, Link2,
  FileText, GitBranch, Receipt, Landmark, Percent, Eye, UserRoundPen,
  Palette, Mail, Printer, Crown, Smartphone, Share2, Gift, Wallet, MessageSquare,
};

// Shows a "What's new" sheet the first time the app loads on a version the
// user hasn't seen yet — i.e. right after a PWA update finishes and reloads.
// Never shows on a brand-new install (no prior seen version recorded).
export default function WhatsNewDialog() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [release, setRelease] = useState(null);

  useEffect(() => {
    let lastSeen;
    let justUpdated = false;
    try {
      lastSeen = localStorage.getItem(SEEN_VERSION_KEY);
      justUpdated = localStorage.getItem(UPDATE_APPLIED_KEY) === "1";
      if (justUpdated) localStorage.removeItem(UPDATE_APPLIED_KEY);
    } catch {
      return;
    }
    const current = APP_CONFIG.version;
    if (lastSeen === current && !justUpdated) return;

    if (lastSeen || justUpdated) {
      const note = RELEASE_NOTES.find((r) => r.version === current) || RELEASE_NOTES[0];
      if (note) {
        setRelease(note);
        setOpen(true);
      }
    }
    try {
      localStorage.setItem(SEEN_VERSION_KEY, current);
    } catch {
      // Storage unavailable (private mode, etc) — skip silently.
    }
  }, []);

  if (!release) return null;

  return (
    <AppDialog open={open} onOpenChange={setOpen}>
      <AppDialogContent maxWidth="max-w-md">
        <AppDialogHeader>
          <AppDialogTitle className="text-2xl font-extrabold tracking-tight">{t("What's new")}</AppDialogTitle>
          <AppDialogDescription>v{release.version}</AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody>
          <div className="space-y-5">
            {release.notes.map((note, i) => {
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
                <div key={i} className="flex gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <div className="text-[15px] font-semibold text-foreground leading-tight">{note.title}</div>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{note.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </AppDialogBody>
        <AppDialogFooter>
          <Button onClick={() => setOpen(false)} className="w-full h-11 text-base sm:w-auto sm:h-9 sm:px-6 sm:text-sm">
            {t("Got it")}
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
