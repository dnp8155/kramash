import { useEffect, useState } from "react";
import Button from "@/components/common/Button";
import { base44 } from "@/api/base44Client";
import { useT } from "@/hooks/useT";
import { whatsappNumber } from "@/lib/validation";
import { whatsappShareUrl } from "@/lib/portalShare";
import { Lock, Copy, CheckCircle2, Eye, EyeOff, Share2, MessageSquare, AlertTriangle } from "lucide-react";

// Loads the client behind a quotation / invoice so its saved portal password can be shown and shared.
// `ready` flips true once the lookup finished (or there is no client), so callers can decide whether a
// password still needs creating without racing the load.
export function useLinkClient(clientId) {
  const [state, setState] = useState({ client: null, ready: !clientId });
  useEffect(() => {
    let live = true;
    if (!clientId) { setState({ client: null, ready: true }); return undefined; }
    setState((st) => ({ ...st, ready: false }));
    base44.entities.Client.get(clientId)
      .then((c) => { if (live) setState({ client: c || null, ready: true }); })
      .catch(() => { if (live) setState({ client: null, ready: true }); });
    return () => { live = false; };
  }, [clientId]);
  return state;
}

// The client's saved portal password, when portal access is on and the password was saved.
export function clientSavedPassword(client) {
  return client?.portal_access_enabled ? (client.portal_password_plain || "") : "";
}

// Password + share block for a quotation / invoice link. `ownPassword` is the document's own password
// (a quotation's, or the quotation behind an invoice); without one, the client's saved portal password
// applies; without either the link is open.
export default function LinkShareBlock({ kind, docNumber, url, ownPassword, ownPasswordLabel, client, clientName, clientPhone, hidePassword = false }) {
  const t = useT();
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState("");

  const clientPassword = clientSavedPassword(client);
  const password = ownPassword || clientPassword;
  const source = ownPassword
    ? ownPasswordLabel
    : clientPassword ? t("Client's saved portal password — same one that opens their portal") : "";
  const clientHasUnsavedPw = !ownPassword && !!client?.portal_access_enabled && !clientPassword;

  const name = clientName || client?.name || "";
  const phone = clientPhone || client?.phone || "";
  const noun = kind === "invoice" ? "invoice" : "quotation";

  const lines = [`Hi ${name}`.trim() + ",", "", `Here is your ${noun}${docNumber ? ` ${docNumber}` : ""}:`, url];
  if (password) {
    lines.push("");
    lines.push(`Password: ${password}`);
  }
  const message = lines.join("\n");

  const copy = (value, field) => {
    navigator.clipboard.writeText(value).then(() => { setCopied(field); setTimeout(() => setCopied(""), 2000); }).catch(() => {});
  };

  return (
    <div className="space-y-3 pt-3 border-t border-border">
      {!hidePassword && (
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> {t("Link Password")}
        </div>
        {password ? (
          <>
            <div className="flex items-center gap-2">
              <input type={show ? "text" : "password"} readOnly value={password} onClick={(e) => { e.target.select(); setShow(true); }} className="flex-1 min-w-0 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-mono" />
              <Button size="sm" variant="outline" onClick={() => setShow(!show)} className="shrink-0">
                {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              <Button size="sm" variant="outline" onClick={() => copy(password, "pw")} className="shrink-0">
                {copied === "pw" ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">{source}</p>
          </>
        ) : clientHasUnsavedPw ? (
          <p className="text-xs text-warning flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {t("This client's portal password isn't saved yet. Open the client's page and tap \"Generate & Save Password\" once — it will then show here.")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("Setting up a password…")}</p>
        )}
      </div>
      )}

      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5" /> {t("Quick Share")}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(whatsappShareUrl(whatsappNumber(phone), message), "_blank")}>
            <Share2 className="w-3.5 h-3.5" /> WhatsApp
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => copy(message, "msg")}>
            {copied === "msg" ? <><CheckCircle2 className="w-3.5 h-3.5 text-success" /> {t("Copied")}</> : <><MessageSquare className="w-3.5 h-3.5" /> {password ? t("Copy link + password") : t("Copy message")}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
