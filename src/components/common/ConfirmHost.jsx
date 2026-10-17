import { useEffect, useRef, useState } from "react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { subscribeConfirm, settleConfirm } from "@/lib/confirmDialog";
import { useT } from "@/hooks/useT";

// Draws the sheet behind askConfirm(). Mount once, near the app root.
export default function ConfirmHost() {
  const t = useT();
  const [request, setRequest] = useState(null);
  const [open, setOpen] = useState(false);
  const last = useRef(null);
  if (request) last.current = request;
  const shown = request || last.current;

  useEffect(() => subscribeConfirm((r) => { setRequest(r); setOpen(true); }), []);

  const answer = (value) => {
    if (request) settleConfirm(request, value);
    setOpen(false);
    // Keep the text on screen while the sheet animates away.
    setTimeout(() => setRequest(null), 350);
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => { if (!o) answer(false); }}>
      <AppDialogContent maxWidth="max-w-sm" hideClose>
        {shown && (
          <>
            <AppDialogHeader>
              <AppDialogTitle>{t(shown.title || "Are you sure?")}</AppDialogTitle>
              <AppDialogDescription className="whitespace-pre-line">{shown.message}</AppDialogDescription>
            </AppDialogHeader>
            <AppDialogFooter>
              <Button variant="outline" onClick={() => answer(false)}>{t(shown.cancelLabel || "Cancel")}</Button>
              <Button variant={shown.destructive ? "destructive" : "primary"} onClick={() => answer(true)}>{t(shown.confirmLabel || "Confirm")}</Button>
            </AppDialogFooter>
          </>
        )}
      </AppDialogContent>
    </AppDialog>
  );
}
