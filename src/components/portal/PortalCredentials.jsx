import { useState } from "react";
import Button from "@/components/common/Button";
import { useT } from "@/hooks/useT";
import { whatsappNumber } from "@/lib/validation";
import { buildPortalShareMessage, whatsappShareUrl, describeChangedAt, describeGraceLeft } from "@/lib/portalShare";
import { PASSWORD_GRACE_HOURS } from "@/lib/clientPortalAccess";
import { Link2, Copy, CheckCircle2, RefreshCw, Loader2, Lock, Eye, EyeOff, Share2, MessageSquare } from "lucide-react";

// Link + password + share block shared by the client and team-member "Quick Portal Access" cards.
// The password is stored, so it is always visible here on any device. It stays the same until someone
// regenerates it; after a regenerate the old password keeps working for a grace window.
export default function PortalCredentials({ kind, name, phone, link, password, changedAt, graceUntil, busy, onRegenerate }) {
  const t = useT();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState("");

  const copy = (value, field) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(""), 2000);
    });
  };

  const message = password ? buildPortalShareMessage({ name, link, password, kind }) : "";
  const changed = describeChangedAt(changedAt);
  const graceLeft = describeGraceLeft(graceUntil);

  const regenerate = () => {
    if (password && !confirm(t(`Generate a new password? The current one will keep working for ${PASSWORD_GRACE_HOURS} hours so nobody is locked out. Remember to send the new one.`))) return;
    onRegenerate();
  };

  return (
    <>
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" /> {t("Portal Link")}
        </div>
        <div className="flex items-center gap-2">
          <input type="text" readOnly value={link} onClick={(e) => e.target.select()} className="flex-1 min-w-0 px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg text-foreground font-mono" />
          <Button size="sm" variant="outline" onClick={() => copy(link, "link")} className="shrink-0">
            {copiedField === "link" ? <><CheckCircle2 className="w-3.5 h-3.5 text-success" /> {t("Copied")}</> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> {t("Password")}
        </div>
        {password ? (
          <>
            <div className="flex items-center gap-2">
              <input type={showPassword ? "text" : "password"} readOnly value={password} onClick={(e) => { e.target.select(); setShowPassword(true); }} className="flex-1 min-w-0 px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg text-foreground font-mono" />
              <Button size="sm" variant="outline" onClick={() => setShowPassword(!showPassword)} className="shrink-0">
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              <Button size="sm" variant="outline" onClick={() => copy(password, "pw")} className="shrink-0">
                {copiedField === "pw" ? <><CheckCircle2 className="w-3.5 h-3.5 text-success" /> {t("Copied")}</> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {kind === "client"
                ? t("Saved — it never changes unless you regenerate it, and it also opens this client's quotation and invoice links.")
                : t("Saved — it never changes unless you regenerate it.")}
              {changed ? ` ${t("Last changed")} ${changed}.` : ""}
            </p>
            {graceLeft && (
              <p className="text-[11px] text-warning mt-1">
                {t("The previous password still works")} ({graceLeft}).
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg p-2.5">
            {t("This password was created before passwords could be saved, so it can't be shown. Generate one once — from then on you can always see and re-share it. The old password keeps working for a while.")}
          </p>
        )}
        <Button size="sm" variant="ghost" onClick={regenerate} disabled={busy} className="mt-2 -ml-2">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {password ? t("Regenerate Password") : t("Generate & Save Password")}
        </Button>
      </div>

      {password && (
        <div className="pt-3 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> {t("Quick Share")}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(whatsappShareUrl(whatsappNumber(phone), message), "_blank")}>
              <Share2 className="w-3.5 h-3.5" /> WhatsApp
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => copy(message, "msg")}>
              {copiedField === "msg" ? <><CheckCircle2 className="w-3.5 h-3.5 text-success" /> {t("Copied")}</> : <><MessageSquare className="w-3.5 h-3.5" /> {t("Copy link + password")}</>}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
