import { useEffect, useRef, useState } from "react";
import { Loader2, Share2, Download, Crown, ImageOff } from "lucide-react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas";
import { useToast } from "@/components/ui/use-toast";
import { useProGate } from "@/components/common/ProGate";
import Toggle from "@/components/common/Toggle";
import Button from "@/components/common/Button";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import TransactionShareCard from "@/components/events/TransactionShareCard";
import { useT } from "@/hooks/useT";

// Fetches the logo and inlines it as a data URL so html2canvas can't be tainted
// by cross-origin images. Resolves null if it can't be loaded.
async function loadLogoDataUrl(url) {
  try {
    const res = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function ShareInvoiceDialog({ open, onClose, transaction, event, workspace, currency, particularFor, typeLabel, defaultShowLogo = false }) {
  const t = useT();
  const { toast } = useToast();
  const { isPro } = useProGate();
  const hasLogo = !!workspace?.logo;
  const canUseLogo = isPro && hasLogo;

  const [showLogo, setShowLogo] = useState(false);
  const [logoData, setLogoData] = useState(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [rendering, setRendering] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef(null);
  const runId = useRef(0);

  // Reset each time the dialog opens for a transaction.
  useEffect(() => {
    if (!open) return;
    setShowLogo(canUseLogo && defaultShowLogo);
    setLogoData(null);
    setLogoFailed(false);
    setLogoReady(false);
    setBlob(null);
    setPreviewUrl(null);
  }, [open, transaction?.id]);

  // Load the logo once, the first time it's wanted.
  useEffect(() => {
    if (!open || !showLogo || logoReady) return;
    let cancelled = false;
    loadLogoDataUrl(workspace.logo).then((d) => {
      if (cancelled) return;
      setLogoData(d);
      setLogoFailed(!d);
      setLogoReady(true);
    });
    return () => { cancelled = true; };
  }, [open, showLogo, logoReady, workspace?.logo]);

  const waitingForLogo = showLogo && !logoReady;

  // Render the card to one PNG; the preview and the shared file are that same image.
  useEffect(() => {
    if (!open || !transaction || waitingForLogo) return;
    const id = ++runId.current;
    setRendering(true);
    (async () => {
      try {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        // Load every weight the card uses before capturing — a font that swaps in after the
        // capture shifts glyph metrics and makes text sit too high / too low in the PNG.
        try {
          await Promise.all(["400", "500", "600", "700", "800"].map((w) => document.fonts?.load(`${w} 14px "Plus Jakarta Sans"`)));
          await document.fonts?.ready;
        } catch { /* ignore */ }
        const el = cardRef.current;
        if (!el) return;
        const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 3, useCORS: true, logging: false });
        const b = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        if (id !== runId.current || !b) return;
        setBlob(b);
        setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); });
      } catch {
        if (id === runId.current) toast({ title: t("Couldn't build the preview"), variant: "destructive" });
      } finally {
        if (id === runId.current) setRendering(false);
      }
    })();
  }, [open, transaction?.id, showLogo, logoData, waitingForLogo]);

  useEffect(() => () => { setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return null; }); }, []);

  const filename = `receipt-${transaction?.id || "transaction"}.png`;

  const handleShare = async () => {
    if (!blob || busy) return;
    setBusy(true);
    try {
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // Files only: adding title/text makes some apps attach a second item.
        await navigator.share({ files: [file] });
      } else {
        download();
      }
    } catch (e) {
      if (e?.name !== "AbortError") toast({ title: t("Couldn't share"), description: t("Try Download instead."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ title: t("Image downloaded"), description: t("Share it via WhatsApp or any app.") });
  };

  const logoHint = !hasLogo
    ? t("Add a logo in Preferences → Profile to use this.")
    : !isPro
      ? t("Logo on receipts is a Pro feature.")
      : logoFailed
        ? t("Couldn't load your logo, so it isn't shown.")
        : t("Only affects this image.");

  return (
    <>
    <AppDialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AppDialogContent maxWidth="sm:max-w-md">
        <AppDialogHeader>
          <AppDialogTitle>{t("Share receipt")}</AppDialogTitle>
          <AppDialogDescription>{t("Preview the image before sending it.")}</AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody className="space-y-4">
          <div className="rounded-xl bg-muted/50 border border-border p-3 flex items-center justify-center min-h-[260px]">
            {previewUrl && !waitingForLogo ? (
              <img src={previewUrl} alt={t("Receipt preview")} className={`w-full max-w-[380px] h-auto rounded-xl shadow-sm transition-opacity ${rendering ? "opacity-50" : "opacity-100"}`} draggable={false} />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin" />{t("Preparing preview…")}</div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                {t("Show logo")}
                {!isPro && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded"><Crown className="w-3 h-3" />Pro</span>}
              </div>
              <p className={`text-xs mt-0.5 flex items-center gap-1 ${logoFailed ? "text-destructive" : "text-muted-foreground"}`}>
                {logoFailed && <ImageOff className="w-3 h-3 shrink-0" />}{logoHint}
              </p>
            </div>
            <Toggle checked={showLogo} onChange={setShowLogo} disabled={!canUseLogo || rendering} label={t("Show logo")} />
          </div>
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="outline" onClick={download} disabled={!blob || rendering}><Download className="w-4 h-4" /> {t("Download")}</Button>
          <Button onClick={handleShare} disabled={!blob || rendering || busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} {t("Share")}</Button>
        </AppDialogFooter>

      </AppDialogContent>
    </AppDialog>
      {/* Off-screen source for the PNG. Rendered once; not shown to the user. */}
      {open && transaction && createPortal(
        <div aria-hidden style={{ position: "fixed", left: "-10000px", top: 0, pointerEvents: "none" }}>
          <div ref={cardRef} style={{ display: "inline-block" }}>
            <TransactionShareCard
              transaction={transaction}
              event={event}
              workspace={workspace}
              currency={currency}
              particularFor={particularFor}
              typeLabel={typeLabel}
              logoSrc={showLogo && logoData ? logoData : null}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
