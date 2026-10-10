import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Shield, KeyRound, Fingerprint, Timer, ChevronRight, CheckCircle2, MinusCircle, PlusCircle } from "lucide-react";
import StatusRow from "@/components/common/StatusRow";
import StatusChip from "@/components/common/StatusChip";
import Button from "@/components/common/Button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { APP_CONFIG } from "@/lib/appConfig";
import { useT } from "@/hooks/useT";

// Read-only App Lock status for the App & Updates page. Turning it on/off and changing the password,
// passkeys or re-lock time stays in Preferences → Security, so nothing here can lock anyone out by accident.
const RELOCK_LABELS = { 0: "On tab close", 5: "5 minutes", 15: "15 minutes", 30: "30 minutes", 60: "1 hour" };

function userField(user, field, fallback) {
  if (user && user[field] !== undefined && user[field] !== null) return user[field];
  if (user?.data && user.data[field] !== undefined && user.data[field] !== null) return user.data[field];
  return fallback;
}

export default function AppLockStatusCard() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Passkeys already registered on this account (the same list Preferences → Security manages).
  const { data: passkeys } = useQuery({
    queryKey: ["user-passkeys", user?.id],
    queryFn: () => base44.entities.UserAuthCredential.filter({ user_id: user.id }),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });
  const passkeyCount = (passkeys || []).length;

  const hasPassword = !!userField(user, "app_lock_password_hash", "");
  // A passkey alone is a valid way to unlock (registering one turns App Lock on), so it counts too.
  const on = !!userField(user, "app_lock_enabled", false) && (hasPassword || passkeyCount > 0);
  const relock = Number(userField(user, "app_lock_relock_after", 0));
  const passkeySupported = APP_CONFIG.features.appLock.available;

  return (
    <div className="bg-card border border-border rounded-[15px] p-4 flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4" /> {t("App Lock")}
        </h3>
        <StatusChip on={on}>{on ? t("On") : t("Off")}</StatusChip>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("Keeps your clients' and payments' data private if someone borrows your phone.")}
      </p>

      <div className="mt-2 divide-y divide-border">
        <StatusRow icon={KeyRound} label={t("Password")}>
          {hasPassword
            ? <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {t("Set")}</span>
            : <span className="text-muted-foreground flex items-center gap-1"><MinusCircle className="w-3.5 h-3.5" /> {t("Not set")}</span>}
        </StatusRow>
        <StatusRow icon={Fingerprint} label={t("Passkey (Face ID, Touch ID, key)")}>
          {!passkeySupported
            ? <span className="text-muted-foreground flex items-center gap-1"><MinusCircle className="w-3.5 h-3.5" /> {t("Not supported here")}</span>
            : passkeyCount > 0
              ? <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {t("Set")}{passkeyCount > 1 ? ` · ${passkeyCount}` : ""}</span>
              // Supported but nothing registered yet: show it as something you can turn on.
              : <span className="text-primary flex items-center gap-1"><PlusCircle className="w-3.5 h-3.5" /> {t("Available · not set")}</span>}
        </StatusRow>
        {on && (
          <StatusRow icon={Timer} label={t("Re-lock after")}>
            <span className="text-foreground">{t(RELOCK_LABELS[relock] || `${relock} minutes`)}</span>
          </StatusRow>
        )}
      </div>

      <div className="mt-auto pt-3">
        <Button variant={on ? "outline" : "primary"} className="w-full justify-center" onClick={() => navigate("/preferences?group=account")}>
          {on ? t("Manage App Lock") : t("Set up App Lock")}
          <ChevronRight className="w-4 h-4" />
        </Button>
        <p className="text-[11px] text-muted-foreground text-center mt-1.5">{t("Opens Preferences → Security")}</p>
      </div>
    </div>
  );
}
