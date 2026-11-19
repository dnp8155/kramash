import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas";
import { Loader2, Share2, Download, ImageOff } from "lucide-react";
import ProTag from "@/components/common/ProTag";
import Toggle from "@/components/common/Toggle";
import Button from "@/components/common/Button";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import { useToast } from "@/components/ui/use-toast";
import { useProGate } from "@/components/common/ProGate";
import { loadLogoDataUrl } from "@/components/events/ShareInvoiceDialog";
import PackageShareCard from "@/components/preferences/PackageShareCard";
import { analyzeLogoFromUrl } from "@/lib/logoColor";
import { parseGroups, hasMargin } from "@/lib/packageStructure";

function SwitchRow({ title, hint, hintError, checked, onChange, disabled, pro }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">{title}{pro && <ProTag />}</div>
        <p className={`text-xs mt-0.5 flex items-center gap-1 ${hintError ? "text-destructive" : "text-muted-foreground"}`}>
          {hintError && <ImageOff className="w-3 h-3 shrink-0" />}{hint}
        </p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  );
}

// Preview of a package as a clean card (same style as the payment receipt) that can be downloaded or sent to a
// client as one image. Roles are shown by name only; prices per line are off unless switched on.
export default function SharePackageDialog({ open, onClose, pkg, workspace, currency }) {
  const { toast } = useToast();
  const { isPro } = useProGate();
  const hasLogo = !!workspace?.logo;
  const canUseLogo = isPro && hasLogo;
  // With a custom package price the item amounts no longer add up to it, and would give away the margin.
  const margin = !!pkg && hasMargin(parseGroups(pkg.structure_json), pkg.total_override);

  const [showLogo, setShowLogo] = useState(false);
  const [showTotal, setShowTotal] = useState(true);
  const [showPrices, setShowPrices] = useState(false);
  const [logoData, setLogoData] = useState(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const [logoInfo, setLogoInfo] = useState({ color: null, tone: null });
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [rendering, setRendering] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef(null);
  const runId = useRef(0);

  useEffect(() => {
    if (!open) return;
    setShowLogo(canUseLogo); setShowTotal(true); setShowPrices(false);
    setLogoData(null); setLogoFailed(false); setLogoReady(false); setLogoInfo({ color: null, tone: null });
    setBlob(null); setPreviewUrl(null);
  }, [open, pkg?.id]);

  useEffect(() => {
    if (!open || !showLogo || logoReady) return;
    let cancelled = false;
    loadLogoDataUrl(workspace.logo).then(async (d) => {
      const info = d ? await analyzeLogoFromUrl(d) : { color: null, tone: null };
      if (cancelled) return;
      setLogoInfo(info); setLogoData(d); setLogoFailed(!d); setLogoReady(true);
    });
    return () => { cancelled = true; };
  }, [open, showLogo, logoReady, workspace?.logo]);

  const waitingForLogo = showLogo && !logoReady;

  // One PNG: the preview and the shared file are the same image.
  useEffect(() => {
    if (!open || !pkg || waitingForLogo) return;
    const id = ++runId.current;
    setRendering(true);
    (async () => {
      try {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
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
        if (id === runId.current) toast({ title: "Couldn't build the preview", variant: "destructive" });
      } finally {
        if (id === runId.current) setRendering(false);
      }
    })();
  }, [open, pkg, showLogo, showTotal, showPrices, logoData, waitingForLogo]);

  useEffect(() => () => { setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return null; }); }, []);

  const filename = `package-${(pkg?.name || "package").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "package"}.png`;

  const download = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ title: "Image downloaded", description: "Share it via WhatsApp or any app." });
  };

  const share = async () => {
    if (!blob || busy) return;
    setBusy(true);
    try {
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file] });
      else download();
    } catch (e) {
      if (e?.name !== "AbortError") toast({ title: "Couldn't share", description: "Try Download instead.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const logoHint = !hasLogo ? "Add a logo in Preferences → Profile to use this."
    : !isPro ? "Logo on shared images is a Pro feature."
      : logoFailed ? "Couldn't load your logo, so it isn't shown." : "Only affects this image.";

  return (
    <>
      <AppDialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <AppDialogContent maxWidth="sm:max-w-md">
          <AppDialogHeader>
            <AppDialogTitle>Share package</AppDialogTitle>
            <AppDialogDescription>Preview the image before sending it to a client.</AppDialogDescription>
          </AppDialogHeader>
          <AppDialogBody className="space-y-3">
            <div className="rounded-xl bg-muted/50 border border-border p-3 flex items-center justify-center min-h-[260px]">
              {previewUrl && !waitingForLogo ? (
                <img src={previewUrl} alt="Package preview" className={`w-full max-w-[380px] h-auto rounded-xl shadow-sm transition-opacity ${rendering ? "opacity-50" : "opacity-100"}`} draggable={false} />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-5 h-5 animate-spin" />Preparing preview…</div>
              )}
            </div>
            <SwitchRow title="Show package price" hint="The total at the top of the card." checked={showTotal} onChange={setShowTotal} disabled={rendering} />
            <SwitchRow title="Show price of each item" hint={margin ? "Hidden, because item prices would not add up to your package price." : "Off keeps item rates private."} checked={showPrices && !margin} onChange={setShowPrices} disabled={rendering || margin} />
            <SwitchRow title="Show logo" pro={!isPro} hint={logoHint} hintError={logoFailed} checked={showLogo} onChange={setShowLogo} disabled={!canUseLogo || rendering} />
          </AppDialogBody>
          <AppDialogFooter>
            <Button variant="outline" onClick={download} disabled={!blob || rendering}><Download className="w-4 h-4" /> Download</Button>
            <Button onClick={share} disabled={!blob || rendering || busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />} Share</Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
      {open && pkg && createPortal(
        <div aria-hidden style={{ position: "fixed", left: "-10000px", top: 0, pointerEvents: "none" }}>
          <div ref={cardRef} style={{ display: "inline-block" }}>
            <PackageShareCard
              pkg={pkg}
              workspace={workspace}
              currency={currency}
              showTotal={showTotal}
              showPrices={showPrices && !margin}
              logoSrc={showLogo && logoData ? logoData : null}
              logoInfo={showLogo && logoData ? logoInfo : null}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
