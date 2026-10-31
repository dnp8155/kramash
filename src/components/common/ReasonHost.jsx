import { useEffect, useRef, useState } from "react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { subscribeReason, settleReason } from "@/lib/askReason";
import { useT } from "@/hooks/useT";

// Draws the sheet behind askReason(). Mount once, near the app root.
export default function ReasonHost() {
  const t = useT();
  const [request, setRequest] = useState(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const last = useRef(null);
  if (request) last.current = request;
  const shown = request || last.current;

  useEffect(() => subscribeReason((r) => { setText(""); setRequest(r); setOpen(true); }), []);

  const answer = (value) => {
    if (request) settleReason(request, value);
    setOpen(false);
    setTimeout(() => setRequest(null), 350);
  };

  const submit = (e) => {
    e.preventDefault();
    if (text.trim()) answer(text.trim());
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => { if (!o) answer(null); }}>
      <AppDialogContent maxWidth="max-w-sm" hideClose>
        {shown && (
          <form onSubmit={submit}>
            <AppDialogHeader>
              <AppDialogTitle>{t(shown.title || "Reason")}</AppDialogTitle>
              <AppDialogDescription className="whitespace-pre-line">{shown.message}</AppDialogDescription>
            </AppDialogHeader>
            <AppDialogBody>
              <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={t(shown.placeholder || "Reason (required)")} maxLength={200} />
            </AppDialogBody>
            <AppDialogFooter>
              <Button type="button" variant="outline" onClick={() => answer(null)}>{t("Cancel")}</Button>
              <Button type="submit" variant="destructive" disabled={!text.trim()}>{t(shown.confirmLabel || "Void entry")}</Button>
            </AppDialogFooter>
          </form>
        )}
      </AppDialogContent>
    </AppDialog>
  );
}
