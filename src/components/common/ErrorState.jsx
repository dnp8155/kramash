import { useState } from "react";
import { AlertTriangle, RotateCw, RefreshCcw, LayoutDashboard, ChevronDown } from "lucide-react";
import Button from "@/components/common/Button";
import { cn } from "@/lib/utils";

// The one "Something went wrong" screen, used by both error boundaries.
//   fullScreen — whole-app crash (nothing else is usable); otherwise it sits inside the page.
//   error      — shown under a "Show details" toggle so support can be told what happened.
export default function ErrorState({ fullScreen = false, error, onRetry, title = "Something went wrong", message }) {
  const [showDetails, setShowDetails] = useState(false);
  const details = error?.message ? String(error.message) : "";

  const card = (
    <div className="w-full max-w-md bg-card border border-border rounded-[15px] shadow-card p-7 sm:p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-7 h-7 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
        {message || (fullScreen
          ? "The app ran into an unexpected problem. Your data is safe — refreshing usually fixes it."
          : "This section couldn't be shown. Your data is safe — try again, or refresh the page.")}
      </p>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-center gap-2 mt-6">
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="sm:min-w-[120px]">
            <RotateCw className="w-4 h-4" /> Try again
          </Button>
        )}
        <Button onClick={() => window.location.reload()} className="sm:min-w-[120px]">
          <RefreshCcw className="w-4 h-4" /> Refresh page
        </Button>
      </div>

      <button
        type="button"
        onClick={() => window.location.assign("/dashboard")}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <LayoutDashboard className="w-3.5 h-3.5" /> Go to dashboard
      </button>

      {details && (
        <div className="mt-5 border-t border-border pt-3 text-left">
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={showDetails}
          >
            Technical details
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", showDetails && "rotate-180")} />
          </button>
          {showDetails && (
            <pre className="mt-2 max-h-32 overflow-auto scrollbar-thin rounded-xl bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
              {details}
            </pre>
          )}
        </div>
      )}
    </div>
  );

  return fullScreen ? (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background px-4 py-8 overflow-y-auto">{card}</div>
  ) : (
    <div className="flex justify-center px-4 py-12 sm:py-16">{card}</div>
  );
}
