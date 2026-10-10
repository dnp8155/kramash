import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Logo from "@/components/common/Logo";

// Password prompt for public quotation / invoice links. The password is the client's portal password
// (or the quotation's own password for its invoices).
export default function LinkPasswordGate({ title, error, busy, onSubmit }) {
  const [password, setPassword] = useState("");
  return (
    <div className="min-h-dvh flex items-center justify-center bg-muted/30 p-4">
      <div className="max-w-md w-full space-y-5">
      <div className="flex items-center justify-center gap-2.5">
        <Logo size={40} className="rounded-xl" />
        <div className="font-heading text-xl font-bold tracking-tight text-foreground leading-none">Kramasha</div>
      </div>
      <div className="bg-card border border-border rounded-xl p-8">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Enter the password shared with you by your service provider.</p>
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2.5 text-sm text-destructive mb-3">
            {error}
            <div className="text-xs text-muted-foreground mt-1">Password not working? It may have been updated — please ask your service provider to send it again.</div>
          </div>
        )}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={busy} autoFocus onKeyDown={(e) => { if (e.key === "Enter" && password) onSubmit(password); }} />
          </div>
          <Button onClick={() => onSubmit(password)} disabled={busy || !password} className="w-full">
            {busy ? (<><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>) : "View"}
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
